"""
ETL Import Endpoint
===================
Receives computed KPI payloads from the ETL service and writes them into
the platform's PostgreSQL database. Fires the alert engine after every write.

Authentication: shared API key via X-ETL-API-Key header.
If ETL_API_KEY env var is empty, auth is skipped (dev mode).
"""

import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.models import (
    Alert,
    AcademicKPI,
    EmploymentKPI,
    ESGKPI,
    FinanceKPI,
    HRKPI,
    Institution,
    InfrastructureKPI,
    PartnershipKPI,
    ResearchKPI,
)

router = APIRouter()

_ETL_API_KEY = os.getenv("ETL_API_KEY", "")


# ─── Request / Response schemas ───────────────────────────────────────────────

class KPIImportPayload(BaseModel):
    institution_code: str
    domain: str
    period: str
    period_type: str = "semester"
    data: dict[str, Any]
    source: str = "etl_import"
    etl_job_id: Optional[str] = None


class KPIImportResponse(BaseModel):
    success: bool
    institution_code: str
    domain: str
    period: str
    kpi_id: Optional[int] = None
    alerts_created: int = 0
    alerts_resolved: int = 0
    message: str


class AlertScanResponse(BaseModel):
    institutions_scanned: int
    alerts_created: int
    alerts_resolved: int
    message: str


# ─── Alert thresholds ─────────────────────────────────────────────────────────
# Each rule: (kpi_field, operator, threshold, severity, human_title)

_THRESHOLDS: dict[str, list[tuple]] = {
    "academic": [
        ("dropout_rate",     "gt", 25.0, "critical", "Taux d'abandon critique"),
        ("dropout_rate",     "gt", 15.0, "warning",  "Taux d'abandon élevé"),
        ("success_rate",     "lt", 50.0, "critical", "Taux de réussite critique"),
        ("success_rate",     "lt", 60.0, "warning",  "Taux de réussite insuffisant"),
        ("attendance_rate",  "lt", 70.0, "warning",  "Assiduité insuffisante"),
    ],
    "finance": [
        ("budget_execution_rate", "gt", 100.0, "critical", "Dépassement budgétaire"),
        ("budget_execution_rate", "lt",  50.0, "warning",  "Sous-exécution budgétaire"),
    ],
    "hr": [
        ("absenteeism_rate",    "gt", 20.0, "critical", "Absentéisme critique"),
        ("absenteeism_rate",    "gt", 10.0, "warning",  "Absentéisme élevé"),
        ("staff_turnover_rate", "gt", 15.0, "warning",  "Turnover du personnel élevé"),
    ],
    "esg": [
        ("recycling_rate",      "lt", 30.0, "warning", "Taux de recyclage insuffisant"),
        ("accessibility_score", "lt", 60.0, "warning", "Accessibilité sous la norme (60%)"),
    ],
    "employment": [
        ("employability_rate_6m", "lt", 50.0, "warning", "Taux d'employabilité faible (6 mois)"),
    ],
    "infrastructure": [
        ("classroom_occupancy_rate",    "gt", 95.0, "warning", "Salles de cours surchargées"),
        ("equipment_availability_rate", "lt", 70.0, "warning", "Disponibilité équipements insuffisante"),
    ],
    "research": [],
    "partnership": [],
}


def _fire_alerts(db: Session, institution_id: int, domain: str, data: dict) -> tuple[int, int]:
    """
    Check all threshold rules for a domain against the given KPI data.
    - Creates alerts for triggered rules (deduplicates).
    - Auto-resolves existing alerts for rules that are no longer triggered.
    Returns (alerts_created, alerts_resolved).
    """
    rules = _THRESHOLDS.get(domain, [])
    created = 0
    resolved = 0

    for kpi_name, op, threshold, severity, title in rules:
        raw = data.get(kpi_name)
        if raw is None:
            continue
        try:
            value = float(raw)
        except (TypeError, ValueError):
            continue

        triggered = (op == "gt" and value > threshold) or (op == "lt" and value < threshold)

        if triggered:
            exists = (
                db.query(Alert)
                .filter(
                    Alert.institution_id == institution_id,
                    Alert.kpi_name == kpi_name,
                    Alert.is_resolved.is_(False),
                )
                .first()
            )
            if not exists:
                direction = ">" if op == "gt" else "<"
                db.add(
                    Alert(
                        institution_id=institution_id,
                        domain=domain,
                        severity=severity,
                        title=title,
                        description=(
                            f"{title} — {kpi_name} = {value:.1f}% "
                            f"(seuil {direction} {threshold}%)"
                        ),
                        kpi_name=kpi_name,
                        kpi_value=value,
                        threshold_value=threshold,
                        is_resolved=False,
                        created_at=datetime.now(),
                    )
                )
                created += 1
        else:
            # KPI improved — auto-resolve stale alerts for this KPI
            stale = (
                db.query(Alert)
                .filter(
                    Alert.institution_id == institution_id,
                    Alert.kpi_name == kpi_name,
                    Alert.is_resolved.is_(False),
                )
                .all()
            )
            for alert in stale:
                alert.is_resolved = True
                alert.resolved_at = datetime.now()
                resolved += 1

    if created or resolved:
        db.commit()
    return created, resolved


# ─── KPI model registry for the scan engine ───────────────────────────────────

_DOMAIN_MODELS = [
    ("academic",       AcademicKPI),
    ("finance",        FinanceKPI),
    ("hr",             HRKPI),
    ("esg",            ESGKPI),
    ("employment",     EmploymentKPI),
    ("infrastructure", InfrastructureKPI),
    ("research",       ResearchKPI),
    ("partnership",    PartnershipKPI),
]


def _kpi_to_dict(kpi) -> dict:
    return {c.name: getattr(kpi, c.name) for c in kpi.__table__.columns}


def _scan_institution(db: Session, institution_id: int) -> dict[str, int]:
    """Run the full alert engine on the latest KPI record for each domain."""
    total_created = 0
    total_resolved = 0

    for domain, model in _DOMAIN_MODELS:
        kpi = (
            db.query(model)
            .filter(model.institution_id == institution_id)
            .order_by(model.id.desc())
            .first()
        )
        if kpi is None:
            continue
        c, r = _fire_alerts(db, institution_id, domain, _kpi_to_dict(kpi))
        total_created += c
        total_resolved += r

    return {"created": total_created, "resolved": total_resolved}


def scan_all_institutions(db: Session) -> dict[str, int]:
    """Scan every institution and sync alerts to current KPI state."""
    institutions = db.query(Institution).all()
    total_created = 0
    total_resolved = 0

    for inst in institutions:
        stats = _scan_institution(db, inst.id)
        total_created += stats["created"]
        total_resolved += stats["resolved"]

    return {
        "institutions": len(institutions),
        "created": total_created,
        "resolved": total_resolved,
    }


# ─── Domain writers ───────────────────────────────────────────────────────────

def _upsert(db: Session, model_class, period_field: str, institution_id: int, period: str, fields: dict):
    kpi = db.query(model_class).filter_by(
        institution_id=institution_id, **{period_field: period}
    ).first()
    if kpi is None:
        kpi = model_class(institution_id=institution_id, **{period_field: period})
        db.add(kpi)
    for k, v in fields.items():
        setattr(kpi, k, v)
    db.commit()
    db.refresh(kpi)
    return kpi


def _write_academic(db: Session, institution_id: int, period: str, data: dict) -> AcademicKPI:
    return _upsert(db, AcademicKPI, "semester", institution_id, period, {
        "total_enrolled": data.get("total_enrolled"),
        "total_passed": data.get("total_passed"),
        "total_failed": data.get("total_failed"),
        "total_dropped": data.get("total_dropped"),
        "success_rate": data.get("success_rate"),
        "dropout_rate": data.get("dropout_rate"),
        "attendance_rate": data.get("attendance_rate"),
        "repetition_rate": data.get("repetition_rate"),
        "avg_grade": data.get("avg_grade"),
    })


def _write_finance(db: Session, institution_id: int, period: str, data: dict) -> FinanceKPI:
    return _upsert(db, FinanceKPI, "fiscal_year", institution_id, period, {
        "allocated_budget": data.get("allocated_budget"),
        "consumed_budget": data.get("consumed_budget"),
        "budget_execution_rate": data.get("budget_execution_rate"),
        "cost_per_student": data.get("cost_per_student"),
        "staff_budget_pct": data.get("staff_budget_pct"),
        "infrastructure_budget_pct": data.get("infrastructure_budget_pct"),
        "research_budget_pct": data.get("research_budget_pct"),
        "other_budget_pct": data.get("other_budget_pct"),
    })


def _write_hr(db: Session, institution_id: int, period: str, data: dict) -> HRKPI:
    return _upsert(db, HRKPI, "semester", institution_id, period, {
        "total_teaching_staff": data.get("total_teaching_staff"),
        "total_admin_staff": data.get("total_admin_staff"),
        "absenteeism_rate": data.get("absenteeism_rate"),
        "avg_teaching_load_hours": data.get("avg_teaching_load_hours"),
        "staff_turnover_rate": data.get("staff_turnover_rate"),
        "training_completion_rate": data.get("training_completion_rate"),
        "permanent_staff_pct": data.get("permanent_staff_pct"),
        "contract_staff_pct": data.get("contract_staff_pct"),
    })


def _write_esg(db: Session, institution_id: int, period: str, data: dict) -> ESGKPI:
    return _upsert(db, ESGKPI, "fiscal_year", institution_id, period, {
        "energy_consumption_kwh": data.get("energy_consumption_kwh"),
        "carbon_footprint_tons": data.get("carbon_footprint_tons"),
        "recycling_rate": data.get("recycling_rate"),
        "green_spaces_sqm": data.get("green_spaces_sqm"),
        "sustainable_mobility_pct": data.get("sustainable_mobility_pct"),
        "accessibility_score": data.get("accessibility_score"),
        "waste_produced_tons": data.get("waste_produced_tons"),
        "water_consumption_m3": data.get("water_consumption_m3"),
    })


def _write_research(db: Session, institution_id: int, period: str, data: dict) -> ResearchKPI:
    return _upsert(db, ResearchKPI, "academic_year", institution_id, period, {
        "publications_count": data.get("publications_count"),
        "active_projects": data.get("active_projects"),
        "funding_secured_tnd": data.get("funding_secured_tnd"),
        "phd_students": data.get("phd_students"),
        "patents_filed": data.get("patents_filed"),
        "international_collaborations": data.get("international_collaborations"),
        "national_collaborations": data.get("national_collaborations"),
        "conferences_attended": data.get("conferences_attended"),
    })


def _write_employment(db: Session, institution_id: int, period: str, data: dict) -> EmploymentKPI:
    return _upsert(db, EmploymentKPI, "graduation_year", institution_id, period, {
        "graduates_total": data.get("graduates_total"),
        "employed_within_6months": data.get("employed_within_6months"),
        "employed_within_12months": data.get("employed_within_12months"),
        "employability_rate_6m": data.get("employability_rate_6m"),
        "employability_rate_12m": data.get("employability_rate_12m"),
        "avg_months_to_employment": data.get("avg_months_to_employment"),
        "national_employment_pct": data.get("national_employment_pct"),
        "international_employment_pct": data.get("international_employment_pct"),
        "self_employed_pct": data.get("self_employed_pct"),
    })


def _write_infrastructure(db: Session, institution_id: int, period: str, data: dict) -> InfrastructureKPI:
    return _upsert(db, InfrastructureKPI, "semester", institution_id, period, {
        "classroom_occupancy_rate": data.get("classroom_occupancy_rate"),
        "it_equipment_status_pct": data.get("it_equipment_status_pct"),
        "equipment_availability_rate": data.get("equipment_availability_rate"),
        "ongoing_works": data.get("ongoing_works"),
        "maintenance_requests": data.get("maintenance_requests"),
        "resolved_requests": data.get("resolved_requests"),
        "lab_availability_rate": data.get("lab_availability_rate"),
        "library_capacity_used_pct": data.get("library_capacity_used_pct"),
    })


def _write_partnership(db: Session, institution_id: int, period: str, data: dict) -> PartnershipKPI:
    return _upsert(db, PartnershipKPI, "academic_year", institution_id, period, {
        "active_national_agreements": data.get("active_national_agreements"),
        "active_international_agreements": data.get("active_international_agreements"),
        "incoming_students": data.get("incoming_students"),
        "outgoing_students": data.get("outgoing_students"),
        "erasmus_partnerships": data.get("erasmus_partnerships"),
        "joint_programs": data.get("joint_programs"),
        "industry_partnerships": data.get("industry_partnerships"),
        "international_projects": data.get("international_projects"),
    })


_WRITERS = {
    "academic": _write_academic,
    "finance": _write_finance,
    "hr": _write_hr,
    "esg": _write_esg,
    "research": _write_research,
    "employment": _write_employment,
    "infrastructure": _write_infrastructure,
    "partnership": _write_partnership,
}


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/import/kpis", response_model=KPIImportResponse)
def import_kpis(
    payload: KPIImportPayload,
    db: Session = Depends(get_db),
    x_etl_api_key: str = Header(default=""),
):
    if _ETL_API_KEY and x_etl_api_key != _ETL_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid ETL API key")

    institution = (
        db.query(Institution)
        .filter(Institution.code == payload.institution_code.upper())
        .first()
    )
    if not institution:
        raise HTTPException(
            status_code=404,
            detail=f"Institution '{payload.institution_code}' not found. "
                   f"Use the institution code (e.g. EPT, FSB, INSAT).",
        )

    domain = payload.domain.lower()
    writer = _WRITERS.get(domain)
    if not writer:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown domain '{domain}'. Valid: {sorted(_WRITERS)}",
        )

    kpi = writer(db, institution.id, payload.period, payload.data)
    alerts_created, alerts_resolved = _fire_alerts(db, institution.id, domain, payload.data)

    return KPIImportResponse(
        success=True,
        institution_code=payload.institution_code.upper(),
        domain=domain,
        period=payload.period,
        kpi_id=kpi.id,
        alerts_created=alerts_created,
        alerts_resolved=alerts_resolved,
        message=(
            f"KPIs imported for {institution.name_fr} — {domain} / {payload.period}. "
            f"{alerts_created} alert(s) triggered, {alerts_resolved} auto-resolved."
        ),
    )


@router.post("/alerts/scan", response_model=AlertScanResponse)
def scan_alerts(db: Session = Depends(get_db)):
    """
    Rescan all institutions against current KPI data.
    Creates missing alerts and auto-resolves stale ones.
    Call this once after seeding to sync the alert state.
    """
    stats = scan_all_institutions(db)
    return AlertScanResponse(
        institutions_scanned=stats["institutions"],
        alerts_created=stats["created"],
        alerts_resolved=stats["resolved"],
        message=(
            f"Scanned {stats['institutions']} institutions. "
            f"{stats['created']} alert(s) created, {stats['resolved']} auto-resolved."
        ),
    )
