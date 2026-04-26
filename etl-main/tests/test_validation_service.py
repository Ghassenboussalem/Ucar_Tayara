from app.services.validation_service import validate_records


def test_validate_records_detects_out_of_range_grade():
    records = [{"student_id": "UCAR001", "grade": 24, "subject": "math"}]
    anomalies = validate_records("grades", records)
    assert len(anomalies) == 1
    assert anomalies[0].field == "grade"
    assert anomalies[0].row_index == 0


def test_validate_records_detects_missing_student_id():
    records = [{"grade": 12, "subject": "physics"}]
    anomalies = validate_records("grades", records)
    assert len(anomalies) == 1
    assert anomalies[0].field == "student_id"


def test_validate_records_accepts_valid_rows():
    records = [
        {"student_id": "UCAR001", "grade": 12, "subject": "physics"},
        {"student_id": "UCAR002", "grade": 16, "subject": "math"},
    ]
    anomalies = validate_records("grades", records)
    assert anomalies == []


def test_validate_budget_detects_overspending():
    records = [{"institution": "ISITCOM", "allocated": 1000, "spent": 1200}]
    anomalies = validate_records("budget", records)
    assert len(anomalies) == 1
    assert anomalies[0].field == "spent"
    assert anomalies[0].severity == "error"


def test_validate_budget_accepts_valid_row():
    records = [{"institution": "ISITCOM", "allocated": 1000, "spent": 900}]
    anomalies = validate_records("budget", records)
    assert anomalies == []
