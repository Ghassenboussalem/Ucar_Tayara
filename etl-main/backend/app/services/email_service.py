"""
Email ingestion service: polls an IMAP inbox for PDF/CSV attachments
and processes them through the existing ingestion pipeline.
Real-time progress is broadcast via SSE to all connected clients.

Subject convention:  <INSTITUTION_CODE> <domain> <period>
  Example: "EPT finance S1_2025"  or  "INSAT academic 2024"
"""
import asyncio
import email
import imaplib
import io
import logging
import re
from datetime import datetime
from email.header import decode_header
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── SSE broadcast registry (one asyncio.Queue per connected client) ────────────
_sse_clients: list[asyncio.Queue] = []

# ── Runtime stats ──────────────────────────────────────────────────────────────
_stats: dict = {
    "enabled": False,
    "running": False,
    "last_checked": None,
    "emails_processed": 0,
    "attachments_processed": 0,
    "last_email_from": None,
    "last_email_subject": None,
    "error": None,
}

# ── Domain / institution lookup tables ────────────────────────────────────────
_INSTITUTION_CODES = {"EPT", "INSAT", "SUPCOM", "IHEC", "FSB", "ESAC"}

_DOMAIN_ALIASES: dict[str, str] = {
    "academic": "academic", "grade": "academic", "note": "academic", "scolarit": "academic",
    "finance": "finance", "budget": "finance", "financier": "finance", "comptab": "finance",
    "hr": "hr", "rh": "hr", "personnel": "hr", "staff": "hr", "ressource": "hr",
    "esg": "esg", "environnement": "esg", "ecolog": "esg", "energie": "esg",
    "research": "research", "recherche": "research", "labo": "research",
    "employment": "employment", "emploi": "employment", "insertion": "employment",
    "infrastructure": "infrastructure", "infra": "infrastructure", "batiment": "infrastructure",
    "partnership": "partnership", "partenariat": "partnership", "accord": "partnership",
}

_ALLOWED_EXTS = {"pdf", "csv", "xlsx", "png", "jpg", "jpeg", "webp", "bmp", "tiff", "json", "txt"}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _decode_str(h: str) -> str:
    parts = decode_header(h or "")
    return "".join(
        (p.decode(enc or "utf-8", errors="replace") if isinstance(p, bytes) else p)
        for p, enc in parts
    )


def _parse_subject(subject: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """Return (institution_code, domain, period) extracted from email subject."""
    upper = subject.upper()
    institution = next((c for c in _INSTITUTION_CODES if c in upper), None)

    domain: Optional[str] = None
    lower = subject.lower()
    for alias, canonical in _DOMAIN_ALIASES.items():
        if alias in lower:
            domain = canonical
            break

    period_match = re.search(r"(S[12]_?\d{4}|\d{4}[-/]\d{4}|\d{4})", subject, re.IGNORECASE)
    if period_match:
        period = period_match.group(1).replace("/", "-").replace(" ", "").upper()
        # Normalise "S12025" → "S1_2025"
        period = re.sub(r"^(S[12])(\d{4})$", r"\1_\2", period)
    else:
        period = None

    return institution, domain, period


async def _broadcast(event: dict) -> None:
    dead: list[asyncio.Queue] = []
    for q in _sse_clients:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            dead.append(q)
    for q in dead:
        try:
            _sse_clients.remove(q)
        except ValueError:
            pass


# ── Blocking IMAP fetch (run in executor) ─────────────────────────────────────

def _fetch_unseen_emails() -> list[dict]:
    """Connect to IMAP, fetch unseen emails with supported attachments, mark as seen."""
    results: list[dict] = []
    try:
        mail = imaplib.IMAP4_SSL(settings.email_imap_host, settings.email_imap_port)
        mail.login(settings.email_address, settings.email_password)
        mail.select(settings.email_folder)

        _, data = mail.search(None, "UNSEEN")
        ids = (data[0] or b"").split()

        for eid in ids:
            _, msg_data = mail.fetch(eid, "(RFC822)")
            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)

            subject = _decode_str(msg.get("Subject", ""))
            sender = _decode_str(msg.get("From", ""))

            attachments: list[dict] = []
            for part in msg.walk():
                if part.get_content_maintype() == "multipart":
                    continue
                fn = part.get_filename()
                if not fn:
                    continue
                fn = _decode_str(fn)
                ext = fn.rsplit(".", 1)[-1].lower() if "." in fn else ""
                if ext in _ALLOWED_EXTS:
                    payload = part.get_payload(decode=True)
                    if payload:
                        attachments.append({"filename": fn, "content": payload})

            if attachments:
                mail.store(eid, "+FLAGS", "\\Seen")
                results.append({"from": sender, "subject": subject, "attachments": attachments})

        mail.logout()
        _stats["error"] = None
    except Exception as exc:
        logger.warning("IMAP fetch error: %s", exc)
        _stats["error"] = str(exc)

    return results


# ── Per-attachment processing ─────────────────────────────────────────────────

async def _process_attachment(
    *,
    filename: str,
    content: bytes,
    institution: str,
    domain: str,
    period: str,
) -> None:
    from app.core.database import SessionLocal
    from app.repositories.ingestion_repository import IngestionRepository
    from app.services.ingestion_service import IngestionService
    from app.services.job_tasks import process_ingestion_job
    from fastapi.datastructures import UploadFile

    await _broadcast({
        "type": "processing_start",
        "filename": filename,
        "institution": institution,
        "domain": domain,
        "period": period,
        "ts": datetime.utcnow().isoformat(),
    })

    try:
        upload = UploadFile(filename=filename, file=io.BytesIO(content))
        with SessionLocal() as db:
            service = IngestionService(IngestionRepository(db))
            job = await service.queue_document(upload, institution, domain)
            job_id = job.id

        # OCR + validate + store is blocking — run in thread pool
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(
            None, lambda: process_ingestion_job(job_id, auto_store=True)
        )

        # Fetch final state
        with SessionLocal() as db:
            from app.repositories.ingestion_repository import IngestionRepository as _R
            final = _R(db).get_job(job_id)

        _stats["attachments_processed"] += 1
        await _broadcast({
            "type": "job_done",
            "job_id": job_id,
            "filename": filename,
            "institution": institution,
            "domain": domain,
            "status": final.status if final else "stored",
            "records": len(final.extracted_payload or []) if final else 0,
            "quality": final.extraction_quality if final else 0,
            "ts": datetime.utcnow().isoformat(),
        })

    except Exception as exc:
        logger.exception("Attachment processing failed (%s): %s", filename, exc)
        await _broadcast({
            "type": "job_error",
            "filename": filename,
            "institution": institution,
            "error": str(exc),
            "ts": datetime.utcnow().isoformat(),
        })


# ── Main polling loop (started as asyncio background task) ────────────────────

async def email_polling_loop() -> None:
    _stats["enabled"] = settings.email_enabled
    _stats["running"] = True

    if not settings.email_enabled:
        logger.info("Email ingestion disabled. Set EMAIL_ENABLED=true to activate.")
        _stats["running"] = False
        return

    logger.info(
        "Email ingestion active: host=%s  user=%s  poll=%ds",
        settings.email_imap_host,
        settings.email_address,
        settings.email_poll_seconds,
    )

    loop = asyncio.get_running_loop()
    while True:
        try:
            _stats["last_checked"] = datetime.utcnow().isoformat()
            emails = await loop.run_in_executor(None, _fetch_unseen_emails)

            for em in emails:
                subject = em["subject"]
                institution, domain, period = _parse_subject(subject)
                inst = institution or settings.email_institution_default
                dom = domain or settings.email_domain_default
                per = period or settings.email_period_default

                _stats["last_email_from"] = em["from"]
                _stats["last_email_subject"] = subject
                _stats["emails_processed"] += 1

                await _broadcast({
                    "type": "email_received",
                    "from": em["from"],
                    "subject": subject,
                    "institution": inst,
                    "domain": dom,
                    "period": per,
                    "attachments": len(em["attachments"]),
                    "ts": datetime.utcnow().isoformat(),
                })

                for att in em["attachments"]:
                    await _process_attachment(
                        filename=att["filename"],
                        content=att["content"],
                        institution=inst,
                        domain=dom,
                        period=per,
                    )

        except Exception as exc:
            logger.exception("Polling loop error: %s", exc)
            _stats["error"] = str(exc)

        await asyncio.sleep(settings.email_poll_seconds)


# ── Public API ─────────────────────────────────────────────────────────────────

def get_stats() -> dict:
    return {
        **_stats,
        "imap_host": settings.email_imap_host if settings.email_enabled else None,
        "inbox": settings.email_address if settings.email_enabled else None,
        "poll_seconds": settings.email_poll_seconds,
        "sse_clients": len(_sse_clients),
    }


def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=200)
    _sse_clients.append(q)
    return q


def unsubscribe(q: asyncio.Queue) -> None:
    try:
        _sse_clients.remove(q)
    except ValueError:
        pass
