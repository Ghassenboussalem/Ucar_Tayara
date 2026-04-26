"""
Platform Bridge
===============
Pushes computed KPI payloads to hack4ucar-backend via POST /api/import/kpis.

Enabled only when PUSH_TO_PLATFORM=true and MAIN_PLATFORM_URL is set.
Failures are non-fatal: the ETL job is already stored locally; a push
failure is logged and returned as metadata, not raised as an exception.
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_payload(
    institution: str,
    kpi_data: dict,
    etl_job_id: str | None = None,
) -> dict[str, Any]:
    domain = kpi_data.get("_domain", "generic")
    period = kpi_data.get("_period", "unknown")
    # Strip internal metadata keys before sending
    data = {k: v for k, v in kpi_data.items() if not k.startswith("_")}
    return {
        "institution_code": institution.upper(),
        "domain": domain,
        "period": period,
        "period_type": "semester" if "_" in period and period.startswith("S") else "year",
        "data": data,
        "source": "etl_import",
        "etl_job_id": etl_job_id,
    }


def push_kpis(
    institution: str,
    kpi_data: dict,
    etl_job_id: str | None = None,
) -> dict[str, Any]:
    """
    Push a KPI dict (output of formula_service.compute_kpis) to the main platform.
    Returns a result dict: {"pushed": bool, ...details}.
    Never raises — callers should check "pushed" and "error" keys.
    """
    if not settings.push_to_platform:
        return {"pushed": False, "reason": "PUSH_TO_PLATFORM is disabled"}

    if not settings.main_platform_url:
        return {"pushed": False, "reason": "MAIN_PLATFORM_URL is not configured"}

    if not kpi_data or not kpi_data.get("_domain"):
        return {"pushed": False, "reason": "No computable KPIs for this document type"}

    payload = _build_payload(institution, kpi_data, etl_job_id)

    try:
        import httpx  # optional dep; fail gracefully if not installed
    except ImportError:
        logger.warning("httpx not installed — platform push skipped")
        return {"pushed": False, "reason": "httpx not installed; run: pip install httpx"}

    url = f"{settings.main_platform_url.rstrip('/')}/api/import/kpis"
    headers = {
        "X-ETL-API-Key": settings.etl_api_key,
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            result = resp.json()
            logger.info(
                "Platform push OK | institution=%s domain=%s alerts=%s",
                institution,
                kpi_data.get("_domain"),
                result.get("alerts_created", 0),
            )
            return {"pushed": True, **result}
    except httpx.TimeoutException:
        msg = f"Platform push timed out (>{10}s) for {url}"
        logger.warning(msg)
        return {"pushed": False, "error": msg}
    except httpx.HTTPStatusError as exc:
        msg = f"Platform returned HTTP {exc.response.status_code}: {exc.response.text[:200]}"
        logger.warning(msg)
        return {"pushed": False, "error": msg}
    except Exception as exc:  # pragma: no cover
        msg = f"Unexpected platform push error: {exc}"
        logger.error(msg)
        return {"pushed": False, "error": msg}
