import pytest

from app.services.parsing_service import parse_payload


def test_parse_payload_reads_csv():
    content = b"student_id,subject,grade\nUCAR001,math,14\n"
    rows, quality = parse_payload(content, "grades.csv")
    assert len(rows) == 1
    assert rows[0]["student_id"] == "UCAR001"
    assert quality > 0


def test_parse_payload_rejects_invalid_json():
    with pytest.raises(ValueError, match="Invalid JSON payload"):
        parse_payload(b"{invalid", "data.json")


def test_parse_payload_rejects_empty_file():
    with pytest.raises(ValueError, match="empty"):
        parse_payload(b"", "data.csv")
