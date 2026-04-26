"""
KPI Formula Engine
==================
Converts raw extracted records into aggregated KPI values ready to push
to the main platform.

Two input modes are supported per domain:
  - RAW: individual records (student grades, staff rows, budget lines)
  - PRE-AGGREGATED: file already contains KPI-level fields (pass-through)

The engine auto-detects which mode applies by inspecting column names.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_float(v: Any) -> float | None:
    if v in (None, ""):
        return None
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _to_int(v: Any) -> int | None:
    f = _to_float(v)
    return int(f) if f is not None else None


def _safe_div(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator is None or denominator == 0:
        return None
    return round(numerator / denominator * 100, 2)


def _current_period() -> str:
    now = datetime.now()
    semester = "S1" if now.month <= 6 else "S2"
    return f"{semester}_{now.year}"


def _detect_period_from_rows(rows: list[dict]) -> str:
    """Try to find a period/semester/fiscal_year field in the data rows."""
    for row in rows[:5]:
        for key in ("semester", "period", "fiscal_year", "academic_year", "graduation_year"):
            val = str(row.get(key) or "").strip()
            if val:
                return val
    return _current_period()


# ─── Academic / Grades ────────────────────────────────────────────────────────

_ACADEMIC_KPI_FIELDS = {
    "success_rate", "dropout_rate", "attendance_rate", "repetition_rate",
    "avg_grade", "total_enrolled", "total_passed", "total_failed", "total_dropped",
}


def _is_pre_aggregated_academic(rows: list[dict]) -> bool:
    if not rows:
        return False
    keys = {str(k).strip().lower() for k in rows[0].keys()}
    return bool(keys & _ACADEMIC_KPI_FIELDS)


def _aggregate_from_raw_grades(rows: list[dict]) -> dict:
    """
    Input: [{student_id, subject, grade, [status]}, ...]
    Output: KPI dict with totals + computed rates.
    Dropout and attendance cannot be derived from grade-only data.
    """
    seen_students: set[str] = set()
    grades: list[float] = []

    for row in rows:
        sid = str(row.get("student_id") or "").strip()
        if sid:
            seen_students.add(sid)
        g = _to_float(row.get("grade"))
        if g is not None:
            grades.append(g)

    total_enrolled = len(seen_students) or len(rows)
    total_passed = sum(1 for g in grades if g >= 10)
    total_failed = len(grades) - total_passed
    avg_grade = round(sum(grades) / len(grades), 2) if grades else None

    return {
        "total_enrolled": total_enrolled,
        "total_passed": total_passed,
        "total_failed": total_failed,
        "total_dropped": None,
        "success_rate": _safe_div(total_passed, total_enrolled),
        "dropout_rate": None,
        "attendance_rate": None,
        "repetition_rate": None,
        "avg_grade": avg_grade,
    }


def _passthrough_academic(row: dict) -> dict:
    return {
        "total_enrolled": _to_int(row.get("total_enrolled")),
        "total_passed": _to_int(row.get("total_passed")),
        "total_failed": _to_int(row.get("total_failed")),
        "total_dropped": _to_int(row.get("total_dropped")),
        "success_rate": _to_float(row.get("success_rate")),
        "dropout_rate": _to_float(row.get("dropout_rate")),
        "attendance_rate": _to_float(row.get("attendance_rate")),
        "repetition_rate": _to_float(row.get("repetition_rate")),
        "avg_grade": _to_float(row.get("avg_grade")),
    }


def compute_academic(rows: list[dict], period: str | None = None) -> dict:
    if not rows:
        return {}
    detected_period = period or _detect_period_from_rows(rows)
    if _is_pre_aggregated_academic(rows):
        kpi = _passthrough_academic(rows[0])
    else:
        kpi = _aggregate_from_raw_grades(rows)
    kpi["_period"] = detected_period
    kpi["_domain"] = "academic"
    return kpi


# ─── Finance / Budget ─────────────────────────────────────────────────────────

_FINANCE_KPI_FIELDS = {
    "allocated_budget", "consumed_budget", "budget_execution_rate",
    "cost_per_student",
}

def _is_pre_aggregated_finance(rows: list[dict]) -> bool:
    if not rows:
        return False
    keys = {str(k).strip().lower() for k in rows[0].keys()}
    return bool(keys & _FINANCE_KPI_FIELDS)


def _aggregate_from_raw_budget(rows: list[dict]) -> dict:
    """
    Input: [{allocated[_tnd], consumed[_tnd]/spent, ...}, ...]
    Also handles PDF-extracted rows where numbers are embedded in string values.
    """
    import re

    def _get_pair(row: dict) -> tuple[float | None, float | None]:
        # Standard column aliases
        alloc = (
            _to_float(row.get("allocated_tnd"))
            or _to_float(row.get("allocated"))
            or _to_float(row.get("budget_alloue"))
        )
        spent = (
            _to_float(row.get("consumed_tnd"))
            or _to_float(row.get("consumed"))
            or _to_float(row.get("spent"))
            or _to_float(row.get("depense"))
        )
        if alloc is not None and spent is not None:
            return alloc, spent
        # Fallback: scan string values for "NNN,NNN" or "NNN NNN" patterns (PDF extraction)
        for v in row.values():
            text = str(v or "")
            nums = [float(n.replace(" ", "")) for n in re.findall(r"\b(\d[\d\s]{3,})\b", text)
                    if _to_float(n.replace(" ", "")) and _to_float(n.replace(" ", "")) > 1000]
            if len(nums) >= 2:
                return nums[0], nums[1]
        return None, None

    total_allocated = 0.0
    total_spent = 0.0
    for row in rows:
        a, s = _get_pair(row)
        if a and s:
            total_allocated += a
            total_spent += s

    return {
        "allocated_budget": round(total_allocated, 2),
        "consumed_budget": round(total_spent, 2),
        "budget_execution_rate": _safe_div(total_spent, total_allocated),
        "cost_per_student": None,
        "staff_budget_pct": None,
        "infrastructure_budget_pct": None,
        "research_budget_pct": None,
        "other_budget_pct": None,
    }


def _passthrough_finance(row: dict) -> dict:
    return {
        "allocated_budget": _to_float(row.get("allocated_budget")),
        "consumed_budget": _to_float(row.get("consumed_budget")),
        "budget_execution_rate": _to_float(row.get("budget_execution_rate")),
        "cost_per_student": _to_float(row.get("cost_per_student")),
        "staff_budget_pct": _to_float(row.get("staff_budget_pct")),
        "infrastructure_budget_pct": _to_float(row.get("infrastructure_budget_pct")),
        "research_budget_pct": _to_float(row.get("research_budget_pct")),
        "other_budget_pct": _to_float(row.get("other_budget_pct")),
    }


def compute_finance(rows: list[dict], period: str | None = None) -> dict:
    if not rows:
        return {}
    detected_period = period or _detect_period_from_rows(rows)
    if _is_pre_aggregated_finance(rows):
        kpi = _passthrough_finance(rows[0])
    else:
        kpi = _aggregate_from_raw_budget(rows)
    kpi["_period"] = detected_period
    kpi["_domain"] = "finance"
    return kpi


# ─── HR ───────────────────────────────────────────────────────────────────────

_HR_KPI_FIELDS = {
    "total_teaching_staff", "total_admin_staff", "absenteeism_rate",
    "avg_teaching_load_hours", "staff_turnover_rate", "training_completion_rate",
}

def _is_pre_aggregated_hr(rows: list[dict]) -> bool:
    if not rows:
        return False
    keys = {str(k).strip().lower() for k in rows[0].keys()}
    return bool(keys & _HR_KPI_FIELDS)


def _aggregate_from_raw_hr(rows: list[dict]) -> dict:
    """
    Input: [{staff_type, headcount, absent_days, total_days,
              teaching_hours, total_teaching_slots, left_count}, ...]
    """
    teaching_staff = 0
    admin_staff = 0
    total_absent = 0.0
    total_work_days = 0.0
    total_teaching_hours = 0.0
    teaching_rows = 0
    total_left = 0
    total_headcount = 0

    for row in rows:
        staff_type = str(row.get("staff_type") or "").strip().lower()
        hc = _to_int(row.get("headcount")) or 0
        total_headcount += hc

        if "teach" in staff_type or "enseignant" in staff_type:
            teaching_staff += hc
            th = _to_float(row.get("teaching_hours"))
            if th is not None:
                total_teaching_hours += th
                teaching_rows += 1
        else:
            admin_staff += hc

        absent = _to_float(row.get("absent_days"))
        work = _to_float(row.get("total_days"))
        if absent is not None:
            total_absent += absent
        if work is not None:
            total_work_days += work

        left = _to_int(row.get("left_count")) or 0
        total_left += left

    absenteeism_rate = _safe_div(total_absent, total_work_days) if total_work_days else None
    avg_teaching_load = (
        round(total_teaching_hours / teaching_rows, 2) if teaching_rows else None
    )
    turnover_rate = _safe_div(total_left, total_headcount) if total_headcount else None

    return {
        "total_teaching_staff": teaching_staff or None,
        "total_admin_staff": admin_staff or None,
        "absenteeism_rate": absenteeism_rate,
        "avg_teaching_load_hours": avg_teaching_load,
        "staff_turnover_rate": turnover_rate,
        "training_completion_rate": None,
        "permanent_staff_pct": None,
        "contract_staff_pct": None,
    }


def _passthrough_hr(row: dict) -> dict:
    return {
        "total_teaching_staff": _to_int(row.get("total_teaching_staff")),
        "total_admin_staff": _to_int(row.get("total_admin_staff")),
        "absenteeism_rate": _to_float(row.get("absenteeism_rate")),
        "avg_teaching_load_hours": _to_float(row.get("avg_teaching_load_hours")),
        "staff_turnover_rate": _to_float(row.get("staff_turnover_rate")),
        "training_completion_rate": _to_float(row.get("training_completion_rate")),
        "permanent_staff_pct": _to_float(row.get("permanent_staff_pct")),
        "contract_staff_pct": _to_float(row.get("contract_staff_pct")),
    }


def compute_hr(rows: list[dict], period: str | None = None) -> dict:
    if not rows:
        return {}
    detected_period = period or _detect_period_from_rows(rows)
    if _is_pre_aggregated_hr(rows):
        kpi = _passthrough_hr(rows[0])
    else:
        kpi = _aggregate_from_raw_hr(rows)
    kpi["_period"] = detected_period
    kpi["_domain"] = "hr"
    return kpi


# ─── ESG — always pre-aggregated (environmental data isn't row-level) ─────────

def compute_esg(rows: list[dict], period: str | None = None) -> dict:
    if not rows:
        return {}
    row = rows[0]
    detected_period = period or _detect_period_from_rows(rows)
    return {
        "_period": detected_period,
        "_domain": "esg",
        "energy_consumption_kwh": _to_float(row.get("energy_consumption_kwh")),
        "carbon_footprint_tons": _to_float(row.get("carbon_footprint_tons")),
        "recycling_rate": _to_float(row.get("recycling_rate")),
        "green_spaces_sqm": _to_int(row.get("green_spaces_sqm")),
        "sustainable_mobility_pct": _to_float(row.get("sustainable_mobility_pct")),
        "accessibility_score": _to_float(row.get("accessibility_score")),
        "waste_produced_tons": _to_float(row.get("waste_produced_tons")),
        "water_consumption_m3": _to_float(row.get("water_consumption_m3")),
    }


# ─── Research ─────────────────────────────────────────────────────────────────

def compute_research(rows: list[dict], period: str | None = None) -> dict:
    if not rows:
        return {}
    row = rows[0]
    detected_period = period or _detect_period_from_rows(rows)
    return {
        "_period": detected_period,
        "_domain": "research",
        "publications_count": _to_int(row.get("publications_count")),
        "active_projects": _to_int(row.get("active_projects")),
        "funding_secured_tnd": _to_float(row.get("funding_secured_tnd")),
        "phd_students": _to_int(row.get("phd_students")),
        "patents_filed": _to_int(row.get("patents_filed")),
        "international_collaborations": _to_int(row.get("international_collaborations")),
        "national_collaborations": _to_int(row.get("national_collaborations")),
        "conferences_attended": _to_int(row.get("conferences_attended")),
    }


# ─── Employment ───────────────────────────────────────────────────────────────

def compute_employment(rows: list[dict], period: str | None = None) -> dict:
    if not rows:
        return {}
    row = rows[0]
    detected_period = period or _detect_period_from_rows(rows)

    graduates = _to_int(row.get("graduates_total"))
    emp_6m = _to_int(row.get("employed_within_6months"))
    emp_12m = _to_int(row.get("employed_within_12months"))

    return {
        "_period": detected_period,
        "_domain": "employment",
        "graduates_total": graduates,
        "employed_within_6months": emp_6m,
        "employed_within_12months": emp_12m,
        "employability_rate_6m": (
            _to_float(row.get("employability_rate_6m"))
            or _safe_div(emp_6m, graduates)
        ),
        "employability_rate_12m": (
            _to_float(row.get("employability_rate_12m"))
            or _safe_div(emp_12m, graduates)
        ),
        "avg_months_to_employment": _to_float(row.get("avg_months_to_employment")),
        "national_employment_pct": _to_float(row.get("national_employment_pct")),
        "international_employment_pct": _to_float(row.get("international_employment_pct")),
        "self_employed_pct": _to_float(row.get("self_employed_pct")),
    }


# ─── Infrastructure ───────────────────────────────────────────────────────────

def compute_infrastructure(rows: list[dict], period: str | None = None) -> dict:
    if not rows:
        return {}
    row = rows[0]
    detected_period = period or _detect_period_from_rows(rows)
    return {
        "_period": detected_period,
        "_domain": "infrastructure",
        "classroom_occupancy_rate": _to_float(row.get("classroom_occupancy_rate")),
        "it_equipment_status_pct": _to_float(row.get("it_equipment_status_pct")),
        "equipment_availability_rate": _to_float(row.get("equipment_availability_rate")),
        "ongoing_works": _to_int(row.get("ongoing_works")),
        "maintenance_requests": _to_int(row.get("maintenance_requests")),
        "resolved_requests": _to_int(row.get("resolved_requests")),
        "lab_availability_rate": _to_float(row.get("lab_availability_rate")),
        "library_capacity_used_pct": _to_float(row.get("library_capacity_used_pct")),
    }


# ─── Partnership ──────────────────────────────────────────────────────────────

def compute_partnership(rows: list[dict], period: str | None = None) -> dict:
    if not rows:
        return {}
    row = rows[0]
    detected_period = period or _detect_period_from_rows(rows)
    return {
        "_period": detected_period,
        "_domain": "partnership",
        "active_national_agreements": _to_int(row.get("active_national_agreements")),
        "active_international_agreements": _to_int(row.get("active_international_agreements")),
        "incoming_students": _to_int(row.get("incoming_students")),
        "outgoing_students": _to_int(row.get("outgoing_students")),
        "erasmus_partnerships": _to_int(row.get("erasmus_partnerships")),
        "joint_programs": _to_int(row.get("joint_programs")),
        "industry_partnerships": _to_int(row.get("industry_partnerships")),
        "international_projects": _to_int(row.get("international_projects")),
    }


# ─── Dispatch ─────────────────────────────────────────────────────────────────

_FORMULA_REGISTRY: dict[str, Any] = {
    "grades": compute_academic,
    "academic": compute_academic,
    "budget": compute_finance,
    "finance": compute_finance,
    "hr": compute_hr,
    "esg": compute_esg,
    "research": compute_research,
    "employment": compute_employment,
    "infrastructure": compute_infrastructure,
    "partnership": compute_partnership,
}


def compute_kpis(document_type: str, rows: list[dict], period: str | None = None) -> dict:
    """
    Main entry point. Returns a KPI dict with _domain and _period metadata keys,
    or an empty dict if the document type has no formula.
    """
    fn = _FORMULA_REGISTRY.get(document_type.strip().lower())
    if fn is None:
        return {}
    return fn(rows, period)
