from __future__ import annotations

import base64
import csv
import io
import logging
import os
import re
import tempfile
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


def _safe_float(value: str) -> float | None:
    try:
        return float(value.replace(",", "."))
    except Exception:
        return None


def _serialize_csv(rows: list[dict], headers: list[str]) -> str:
    if not rows:
        return ""
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=headers)
    writer.writeheader()
    for row in rows:
        writer.writerow({h: row.get(h, "") for h in headers})
    return buf.getvalue()


def _heuristic_structured_csv(raw_text: str, document_type: str | None) -> str:
    """Last-resort heuristic: turn raw OCR text into structured CSV.
    Works for all 8 KPI domains. Used only when Groq is unavailable."""
    text = (raw_text or "").strip()
    if not text:
        return ""

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    if not lines:
        return ""

    normalized_type = (document_type or "").lower().strip()

    if normalized_type in ("grades", "academic"):
        rows = []
        for ln in lines:
            parts = re.split(r"[;,\t ]+", ln)
            if len(parts) < 3:
                continue
            student_id = parts[0]
            grade_val = _safe_float(parts[-1])
            subject = " ".join(parts[1:-1]) or "unknown"
            if grade_val is None:
                continue
            rows.append({"student_id": student_id, "subject": subject, "grade": grade_val})
        return _serialize_csv(rows, ["student_id", "subject", "grade"])

    if normalized_type in ("finance", "budget"):
        rows = []
        for ln in lines:
            parts = re.split(r"[;,\t ]+", ln)
            if len(parts) < 3:
                continue
            institution = parts[0]
            allocated = _safe_float(parts[-2])
            spent = _safe_float(parts[-1])
            if allocated is None or spent is None:
                continue
            rows.append({"institution": institution, "allocated": allocated, "spent": spent})
        return _serialize_csv(rows, ["institution", "allocated", "spent"])

    if normalized_type == "hr":
        rows = []
        for ln in lines:
            parts = re.split(r"[;,\t ]+", ln)
            if len(parts) < 2:
                continue
            staff_type = parts[0] if parts[0].lower() in ("teaching", "admin", "enseignant", "administratif") else "teaching"
            headcount = _safe_float(parts[1]) if len(parts) > 1 else None
            if headcount is None:
                continue
            rows.append({"staff_type": staff_type, "headcount": int(headcount)})
        if rows:
            return _serialize_csv(rows, ["staff_type", "headcount"])

    if normalized_type == "esg":
        # Try to extract key-value pairs from OCR text (e.g. "Énergie: 450000 kWh")
        row: dict = {}
        kv_patterns = [
            (r"energie|energy|énergie", r"(\d[\d\s]*)", "energy_consumption_kwh"),
            (r"carbone|co2|carbon", r"(\d[\d.,]*)", "carbon_footprint_tons"),
            (r"recyclage|recycling", r"(\d[\d.,]*)", "recycling_rate"),
            (r"accessibilit", r"(\d[\d.,]*)", "accessibility_score"),
        ]
        for ln in lines:
            for kw, val_re, field in kv_patterns:
                if re.search(kw, ln, re.IGNORECASE):
                    m = re.search(val_re, ln)
                    if m:
                        row[field] = _safe_float(m.group(1).replace(" ", ""))
        if row:
            return _serialize_csv([row], list(row.keys()))

    if normalized_type == "research":
        row = {}
        patterns = [
            (r"publication", r"(\d+)", "publications_count"),
            (r"projet|project", r"(\d+)", "active_projects"),
            (r"doctorant|phd", r"(\d+)", "phd_students"),
            (r"brevet|patent", r"(\d+)", "patents_filed"),
        ]
        for ln in lines:
            for kw, val_re, field in patterns:
                if re.search(kw, ln, re.IGNORECASE):
                    m = re.search(val_re, ln)
                    if m:
                        row[field] = int(m.group(1))
        if row:
            return _serialize_csv([row], list(row.keys()))

    if normalized_type == "employment":
        row = {}
        patterns = [
            (r"diplom|graduat", r"(\d+)", "graduates_total"),
            (r"6\s*mois|6months", r"(\d+)", "employed_within_6months"),
            (r"12\s*mois|12months", r"(\d+)", "employed_within_12months"),
        ]
        for ln in lines:
            for kw, val_re, field in patterns:
                if re.search(kw, ln, re.IGNORECASE):
                    m = re.search(val_re, ln)
                    if m:
                        row[field] = int(m.group(1))
        if row:
            return _serialize_csv([row], list(row.keys()))

    if normalized_type == "infrastructure":
        row = {}
        patterns = [
            (r"salle|classroom|amphi", r"(\d[\d.,]*)", "classroom_occupancy_rate"),
            (r"labo|lab", r"(\d[\d.,]*)", "lab_availability_rate"),
            (r"maintenance|entretien", r"(\d+)", "maintenance_requests"),
            (r"r[eé]sol", r"(\d+)", "resolved_requests"),
        ]
        for ln in lines:
            for kw, val_re, field in patterns:
                if re.search(kw, ln, re.IGNORECASE):
                    m = re.search(val_re, ln)
                    if m:
                        row[field] = _safe_float(m.group(1).replace(" ", ""))
        if row:
            return _serialize_csv([row], list(row.keys()))

    if normalized_type == "partnership":
        row = {}
        patterns = [
            (r"national|accord.nat", r"(\d+)", "active_national_agreements"),
            (r"international|accord.int", r"(\d+)", "active_international_agreements"),
            (r"entrant|incoming", r"(\d+)", "incoming_students"),
            (r"sortant|outgoing", r"(\d+)", "outgoing_students"),
            (r"erasmus", r"(\d+)", "erasmus_partnerships"),
        ]
        for ln in lines:
            for kw, val_re, field in patterns:
                if re.search(kw, ln, re.IGNORECASE):
                    m = re.search(val_re, ln)
                    if m:
                        row[field] = int(m.group(1))
        if row:
            return _serialize_csv([row], list(row.keys()))

    # Generic fallback: preserve raw text for the CSV parser to try
    return text


class OCRProvider(ABC):
    @abstractmethod
    def extract_text(self, content: bytes, filename: str, document_type: str | None = None) -> str:
        raise NotImplementedError


class FallbackOCRProvider(OCRProvider):
    def extract_text(self, content: bytes, filename: str, document_type: str | None = None) -> str:
        lower = filename.lower()
        if lower.endswith((".csv", ".txt", ".json")):
            return content.decode("utf-8", errors="ignore")
        return ""


class PdfPlumberProvider(OCRProvider):
    def __init__(self):
        import pdfplumber  # type: ignore

        self.pdfplumber = pdfplumber

    def extract_text(self, content: bytes, filename: str, document_type: str | None = None) -> str:
        if not filename.lower().endswith(".pdf"):
            return ""
        text_chunks: list[str] = []
        with self.pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                # Primary: standard extraction (works for most Latin/Arabic embedded-text PDFs)
                page_text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
                if not page_text.strip():
                    # Fallback: word-level extraction preserves RTL text better on some PDFs
                    words = page.extract_words(x_tolerance=3, y_tolerance=3, keep_blank_chars=False)
                    page_text = " ".join(w["text"] for w in words)
                if page_text.strip():
                    text_chunks.append(page_text.strip())
        return "\n".join(text_chunks).strip()


class TesseractProvider(OCRProvider):
    def __init__(self):
        import pytesseract  # type: ignore
        from PIL import Image  # type: ignore

        self.pytesseract = pytesseract
        self.Image = Image

    def extract_text(self, content: bytes, filename: str, document_type: str | None = None) -> str:
        lower = filename.lower()
        if not lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif")):
            return ""
        img = self.Image.open(io.BytesIO(content))
        # Multilingual OCR for UCAR context.
        return self.pytesseract.image_to_string(img, lang="ara+fra+eng").strip()


class PaddleOCRProvider(OCRProvider):
    def __init__(self):
        from paddleocr import PaddleOCR  # type: ignore

        # Use multilingual model to better support French/Arabic/English content.
        self.ocr = PaddleOCR(use_angle_cls=True, lang="latin")

    def extract_text(self, content: bytes, filename: str, document_type: str | None = None) -> str:
        lower = filename.lower()
        if not lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif", ".pdf")):
            return ""
        suffix = "." + lower.split(".")[-1] if "." in lower else ".bin"
        with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
            tmp.write(content)
            tmp.flush()
            result = self.ocr.ocr(tmp.name, cls=True)
        lines: list[str] = []
        for block in result or []:
            for item in block or []:
                try:
                    lines.append(str(item[1][0]).strip())
                except Exception:
                    continue
        return "\n".join(line for line in lines if line).strip()


class EasyOCRProvider(OCRProvider):
    def __init__(self):
        import easyocr  # type: ignore

        self.reader = easyocr.Reader(["ar", "fr", "en"], gpu=False)

    def extract_text(self, content: bytes, filename: str, document_type: str | None = None) -> str:
        lower = filename.lower()
        if not lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif")):
            return ""
        suffix = "." + lower.split(".")[-1] if "." in lower else ".png"
        with tempfile.NamedTemporaryFile(delete=True, suffix=suffix) as tmp:
            tmp.write(content)
            tmp.flush()
            result = self.reader.readtext(tmp.name)
        return "\n".join(str(item[1]).strip() for item in result if len(item) > 1 and str(item[1]).strip())


class GroqStructuringProvider(OCRProvider):
    def __init__(self):
        from groq import Groq  # type: ignore

        self.client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        self.model = os.getenv("GROQ_VLM_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

    _DOMAIN_HEADERS: dict[str, str] = {
        "grades":         "student_id,module,grade,enrolled,status",
        "academic":       "student_id,module,grade,enrolled,status",
        "budget":         "budget_line,department,allocated_tnd,consumed_tnd,category",
        "finance":        "budget_line,department,allocated_tnd,consumed_tnd,category",
        "hr":             "employee_id,department,staff_type,headcount,working_days,absent_days,resigned,hired",
        "esg":            "indicator,value,unit,target,category,notes",
        "research":       "lab_name,domain,publications_count,citations_count,phd_students,external_funding_tnd",
        "employment":     "degree_level,speciality,graduates_count,employed_6months,unemployed_12months,avg_salary_tnd",
        "infrastructure": "asset_name,category,capacity,current_usage,condition_score,maintenance_status",
        "partnership":    "partner_name,country,type,start_date,students_incoming,students_outgoing",
    }

    def _prompt(self, document_type: str | None) -> str:
        kind = (document_type or "generic").lower()
        target = self._DOMAIN_HEADERS.get(kind, "field_1,field_2,field_3,field_4,field_5")
        return (
            "You are a precise OCR structuring engine for a multilingual university data platform.\n"
            "The document may be written in Arabic, French, English, or a mix. Handle all equally.\n"
            "Your task: extract ALL table rows and output ONLY valid CSV.\n"
            f"Use exactly these CSV column headers (first line): {target}\n"
            "Rules:\n"
            "- Output CSV only — no markdown, no code blocks, no explanation.\n"
            "- First line MUST be the header row listed above.\n"
            "- Map extracted values to the nearest matching column, even if the document uses Arabic "
            "column names (e.g. 'معدل الغياب' maps to absenteeism_rate, 'القسم' maps to department).\n"
            "- Numbers: remove spaces/currency symbols/Arabic-Indic digits — output Western digits only.\n"
            "- Text values: keep as-is in their original language.\n"
            "- Skip non-data lines (page numbers, titles, footers, decorative lines).\n"
            "- If a column has no value for a row, leave it empty (two consecutive commas).\n"
        )

    def _image_to_data_url(self, content: bytes, filename: str) -> str:
        ext = filename.lower().split(".")[-1]
        mime_map = {
            "jpg": "image/jpeg", "jpeg": "image/jpeg",
            "png": "image/png", "webp": "image/webp",
            "bmp": "image/bmp", "tiff": "image/tiff", "tif": "image/tiff",
        }
        mime = mime_map.get(ext, "image/png")
        encoded = base64.b64encode(content).decode("utf-8")
        return f"data:{mime};base64,{encoded}"

    def extract_text(self, content: bytes, filename: str, document_type: str | None = None) -> str:
        lower = filename.lower()
        prompt = self._prompt(document_type)
        if lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif")):
            message_content = [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": self._image_to_data_url(content, filename)}},
            ]
        else:
            # For pdf/plain extracted text, caller should provide fallback text; we can still try with raw decode.
            raw = content.decode("utf-8", errors="ignore")
            message_content = [{"type": "text", "text": f"{prompt}\nSource text:\n{raw}"}]

        completion = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": message_content}],
            temperature=0.0,
            max_completion_tokens=2000,
            top_p=1,
            stream=False,
        )
        raw = (completion.choices[0].message.content or "").strip()
        # Strip markdown code fences LLMs add despite instructions (```csv ... ```)
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw).strip()
        raw = re.sub(r"\n?```$", "", raw).strip()
        return raw


class CompositeOCRProvider(OCRProvider):
    def __init__(self):
        self.providers: list[OCRProvider] = [FallbackOCRProvider()]
        self.groq_provider: OCRProvider | None = None

        try:
            self.providers.insert(0, PdfPlumberProvider())
        except Exception:
            pass
        try:
            self.providers.insert(0, PaddleOCRProvider())
        except Exception:
            pass
        try:
            self.providers.insert(0, EasyOCRProvider())
        except Exception:
            pass
        try:
            self.providers.insert(0, TesseractProvider())
        except Exception:
            pass
        if os.getenv("GROQ_API_KEY"):
            try:
                self.groq_provider = GroqStructuringProvider()
            except Exception:
                self.groq_provider = None

    _IMAGE_EXTS = (".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif")

    def extract_text(self, content: bytes, filename: str, document_type: str | None = None) -> str:
        is_image = filename.lower().endswith(self._IMAGE_EXTS)

        raw_text = ""
        lower = filename.lower()
        for provider in self.providers:
            extracted = provider.extract_text(content, filename, document_type=document_type)
            if extracted.strip():
                raw_text = extracted.strip()
                break

        # VLM structuring pass: best-effort, always falls back gracefully.
        if self.groq_provider is not None:
            if is_image:
                # Preferred path: Groq reads the raw image directly (VLM).
                try:
                    structured = self.groq_provider.extract_text(
                        content, filename, document_type=document_type
                    )
                    if structured.strip():
                        return structured
                except Exception as exc:
                    logger.warning("Groq VLM failed for image '%s': %s — trying text fallback", filename, exc)
                # Secondary: if Tesseract/EasyOCR extracted something, let Groq structure it as text.
                if raw_text:
                    try:
                        structured = self.groq_provider.extract_text(
                            raw_text.encode("utf-8"), "normalized.txt", document_type=document_type
                        )
                        if structured.strip():
                            return structured
                    except Exception:
                        pass
            elif raw_text:
                try:
                    structured = self.groq_provider.extract_text(
                        raw_text.encode("utf-8"), "extracted_text.txt", document_type=document_type
                    )
                    if structured.strip():
                        return structured
                except Exception:
                    pass

        if is_image and not raw_text:
            raise ValueError(
                "Impossible d'extraire le contenu de l'image. "
                "Vérifiez que GROQ_API_KEY est défini ou installez pytesseract / easyocr."
            )

        return _heuristic_structured_csv(raw_text, document_type=document_type)


ocr_provider: OCRProvider = CompositeOCRProvider()


def get_ocr_runtime_info() -> dict:
    return {
        "groq_enabled": bool(os.getenv("GROQ_API_KEY")),
        "groq_model": os.getenv("GROQ_VLM_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"),
        "languages": ["ara", "fra", "eng"],
        "pipeline_order": [
            "pdfplumber",
            "paddleocr_optional",
            "easyocr_optional",
            "pytesseract",
            "groq_vlm_optional",
            "heuristic_structuring",
        ],
    }
