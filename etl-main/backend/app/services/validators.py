from app.schemas.ingestion import ValidationAnomaly


def _to_float(value) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def validate_grades(records: list[dict]) -> list[ValidationAnomaly]:
    anomalies: list[ValidationAnomaly] = []
    seen_ids: set[str] = set()
    valid_grades: list[float] = []

    for idx, record in enumerate(records):
        student_id = str(record.get("student_id") or "").strip()
        if not student_id:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="student_id",
                    value=record.get("student_id"),
                    expected=f"non-empty student_id at row {idx + 1}",
                    severity="error",
                )
            )
        elif student_id in seen_ids:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="student_id",
                    value=student_id,
                    expected="unique student_id",
                    severity="error",
                )
            )
        else:
            seen_ids.add(student_id)

        if not str(record.get("subject") or "").strip():
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="subject",
                    value=record.get("subject"),
                    expected=f"non-empty subject at row {idx + 1}",
                    severity="error",
                )
            )

        grade = _to_float(record.get("grade"))
        if grade is None:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="grade",
                    value=record.get("grade"),
                    expected="numeric value between 0 and 20",
                    severity="error",
                )
            )
            continue
        if grade < 0 or grade > 20:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="grade",
                    value=grade,
                    expected="0-20",
                    severity="error",
                )
            )
        else:
            valid_grades.append(grade)

    if valid_grades:
        mean_grade = sum(valid_grades) / len(valid_grades)
        variance = sum((x - mean_grade) ** 2 for x in valid_grades) / len(valid_grades)
        std_dev = variance ** 0.5
        high_ratio = sum(1 for g in valid_grades if g >= 18) / len(valid_grades)
        low_ratio = sum(1 for g in valid_grades if g <= 2) / len(valid_grades)

        if std_dev < 1.0 and len(valid_grades) >= 10:
            anomalies.append(
                ValidationAnomaly(
                    row_index=None,
                    field="grade_distribution",
                    value={"mean": round(mean_grade, 2), "std": round(std_dev, 2)},
                    expected="normal variation across grades",
                    severity="warning",
                )
            )
        if high_ratio > 0.6:
            anomalies.append(
                ValidationAnomaly(
                    row_index=None,
                    field="grade_distribution",
                    value={"high_grade_ratio": round(high_ratio, 2)},
                    expected="high grades ratio <= 0.60",
                    severity="warning",
                )
            )
        if low_ratio > 0.4:
            anomalies.append(
                ValidationAnomaly(
                    row_index=None,
                    field="grade_distribution",
                    value={"very_low_grade_ratio": round(low_ratio, 2)},
                    expected="very low grades ratio <= 0.40",
                    severity="warning",
                )
            )

    return anomalies


def validate_budget(records: list[dict]) -> list[ValidationAnomaly]:
    anomalies: list[ValidationAnomaly] = []

    for idx, record in enumerate(records):
        institution = str(record.get("institution") or "").strip()
        if not institution:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="institution",
                    value=record.get("institution"),
                    expected=f"non-empty institution at row {idx + 1}",
                    severity="error",
                )
            )

        allocated = _to_float(record.get("allocated"))
        spent = _to_float(record.get("spent"))
        if allocated is None or allocated < 0:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="allocated",
                    value=record.get("allocated"),
                    expected="allocated >= 0",
                    severity="error",
                )
            )
        if spent is None or spent < 0:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="spent",
                    value=record.get("spent"),
                    expected="spent >= 0",
                    severity="error",
                )
            )

        if allocated is not None and spent is not None and spent > allocated:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="spent",
                    value=spent,
                    expected="spent <= allocated",
                    severity="error",
                )
            )

    return anomalies


def validate_generic(records: list[dict]) -> list[ValidationAnomaly]:
    anomalies: list[ValidationAnomaly] = []
    for idx, record in enumerate(records):
        if not isinstance(record, dict) or not record:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="row",
                    value=record,
                    expected=f"non-empty object at row {idx + 1}",
                    severity="error",
                )
            )
    return anomalies


def validate_hr(records: list[dict]) -> list[ValidationAnomaly]:
    anomalies: list[ValidationAnomaly] = []
    for idx, record in enumerate(records):
        headcount = _to_float(record.get("headcount"))
        if headcount is not None and headcount < 0:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="headcount",
                    value=headcount,
                    expected="headcount >= 0",
                    severity="error",
                )
            )
        absenteeism = _to_float(record.get("absenteeism_rate"))
        if absenteeism is not None and not (0 <= absenteeism <= 100):
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="absenteeism_rate",
                    value=absenteeism,
                    expected="0 <= absenteeism_rate <= 100",
                    severity="error",
                )
            )
        if absenteeism is not None and absenteeism > 20:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="absenteeism_rate",
                    value=absenteeism,
                    expected="absenteeism_rate <= 20% (critical threshold)",
                    severity="warning",
                )
            )
        teaching_load = _to_float(record.get("avg_teaching_load_hours"))
        if teaching_load is not None and teaching_load > 600:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="avg_teaching_load_hours",
                    value=teaching_load,
                    expected="avg_teaching_load_hours <= 600h/year",
                    severity="warning",
                )
            )
    return anomalies


def validate_esg(records: list[dict]) -> list[ValidationAnomaly]:
    anomalies: list[ValidationAnomaly] = []
    for idx, record in enumerate(records):
        for rate_field in ("recycling_rate", "sustainable_mobility_pct", "accessibility_score"):
            val = _to_float(record.get(rate_field))
            if val is not None and not (0 <= val <= 100):
                anomalies.append(
                    ValidationAnomaly(
                        row_index=idx,
                        field=rate_field,
                        value=val,
                        expected=f"0 <= {rate_field} <= 100",
                        severity="error",
                    )
                )
        for positive_field in ("energy_consumption_kwh", "carbon_footprint_tons", "water_consumption_m3"):
            val = _to_float(record.get(positive_field))
            if val is not None and val < 0:
                anomalies.append(
                    ValidationAnomaly(
                        row_index=idx,
                        field=positive_field,
                        value=val,
                        expected=f"{positive_field} >= 0",
                        severity="error",
                    )
                )
    return anomalies


def validate_research(records: list[dict]) -> list[ValidationAnomaly]:
    anomalies: list[ValidationAnomaly] = []
    for idx, record in enumerate(records):
        for count_field in ("publications_count", "active_projects", "phd_students", "patents_filed"):
            val = _to_float(record.get(count_field))
            if val is not None and val < 0:
                anomalies.append(
                    ValidationAnomaly(
                        row_index=idx,
                        field=count_field,
                        value=val,
                        expected=f"{count_field} >= 0",
                        severity="error",
                    )
                )
        funding = _to_float(record.get("funding_secured_tnd"))
        if funding is not None and funding < 0:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="funding_secured_tnd",
                    value=funding,
                    expected="funding_secured_tnd >= 0",
                    severity="error",
                )
            )
    return anomalies


def validate_employment(records: list[dict]) -> list[ValidationAnomaly]:
    anomalies: list[ValidationAnomaly] = []
    for idx, record in enumerate(records):
        graduates = _to_float(record.get("graduates_total"))
        if graduates is not None and graduates < 0:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="graduates_total",
                    value=graduates,
                    expected="graduates_total >= 0",
                    severity="error",
                )
            )
        for rate_field in ("employability_rate_6m", "employability_rate_12m",
                           "national_employment_pct", "international_employment_pct",
                           "self_employed_pct"):
            val = _to_float(record.get(rate_field))
            if val is not None and not (0 <= val <= 100):
                anomalies.append(
                    ValidationAnomaly(
                        row_index=idx,
                        field=rate_field,
                        value=val,
                        expected=f"0 <= {rate_field} <= 100",
                        severity="error",
                    )
                )
        # employed_within_Xmonths must not exceed graduates_total
        for emp_field in ("employed_within_6months", "employed_within_12months"):
            emp = _to_float(record.get(emp_field))
            if emp is not None and graduates is not None and emp > graduates:
                anomalies.append(
                    ValidationAnomaly(
                        row_index=idx,
                        field=emp_field,
                        value=emp,
                        expected=f"{emp_field} <= graduates_total ({graduates})",
                        severity="error",
                    )
                )
    return anomalies


def validate_infrastructure(records: list[dict]) -> list[ValidationAnomaly]:
    anomalies: list[ValidationAnomaly] = []
    for idx, record in enumerate(records):
        for rate_field in ("classroom_occupancy_rate", "it_equipment_status_pct",
                           "equipment_availability_rate", "lab_availability_rate",
                           "library_capacity_used_pct"):
            val = _to_float(record.get(rate_field))
            if val is not None and not (0 <= val <= 100):
                anomalies.append(
                    ValidationAnomaly(
                        row_index=idx,
                        field=rate_field,
                        value=val,
                        expected=f"0 <= {rate_field} <= 100",
                        severity="error",
                    )
                )
        resolved = _to_float(record.get("resolved_requests"))
        total_maint = _to_float(record.get("maintenance_requests"))
        if resolved is not None and total_maint is not None and resolved > total_maint:
            anomalies.append(
                ValidationAnomaly(
                    row_index=idx,
                    field="resolved_requests",
                    value=resolved,
                    expected=f"resolved_requests <= maintenance_requests ({total_maint})",
                    severity="error",
                )
            )
    return anomalies


def validate_by_document_type(
    document_type: str, records: list[dict]
) -> list[ValidationAnomaly]:
    normalized = document_type.strip().lower()
    dispatch = {
        "grades": validate_grades,
        "academic": validate_grades,
        "budget": validate_budget,
        "finance": validate_budget,
        "hr": validate_hr,
        "esg": validate_esg,
        "research": validate_research,
        "employment": validate_employment,
        "infrastructure": validate_infrastructure,
    }
    validator = dispatch.get(normalized, validate_generic)
    return validator(records)
