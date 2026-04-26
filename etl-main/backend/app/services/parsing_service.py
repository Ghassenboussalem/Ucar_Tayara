import csv
import json
from io import BytesIO
from io import StringIO


ALLOWED_EXTENSIONS = {
    ".csv", ".txt", ".json", ".xlsx",
    ".pdf",
    ".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif",
}


def detect_file_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return "." + filename.split(".")[-1].lower()


def parse_payload(content: bytes, filename: str) -> tuple[list[dict], int]:
    extension = detect_file_extension(filename)
    text = content.decode("utf-8", errors="ignore").strip()
    if not text:
        raise ValueError("Uploaded file is empty")

    if extension == ".json":
        try:
            raw = json.loads(text)
        except json.JSONDecodeError as exc:
            raise ValueError("Invalid JSON payload") from exc
        if isinstance(raw, dict):
            rows = [raw]
        else:
            rows = list(raw)
    elif extension in {".csv", ".txt"}:
        reader = csv.DictReader(StringIO(text))
        rows = [dict(row) for row in reader]
        if not reader.fieldnames:
            raise ValueError("CSV/TXT file must include a header row")
    elif extension == ".xlsx":
        try:
            import pandas as pd  # type: ignore
        except Exception as exc:
            raise ValueError("XLSX support requires pandas and openpyxl") from exc

        frame = pd.read_excel(BytesIO(content), dtype=str)
        if frame.empty or not list(frame.columns):
            raise ValueError("XLSX file must include headers and at least one row")
        rows = frame.fillna("").to_dict(orient="records")
    else:
        # Binary files should be processed through OCR before this parser.
        raise ValueError("Binary file requires OCR preprocessing")

    extraction_quality = estimate_extraction_quality(rows)
    return rows, extraction_quality


def parse_text_payload(text: str) -> tuple[list[dict], int]:
    content = text.strip()
    if not content:
        raise ValueError("OCR extracted empty text")
    reader = csv.DictReader(StringIO(content))
    rows = [dict(row) for row in reader]
    if not reader.fieldnames:
        raise ValueError("OCR output is not a structured table")
    return rows, estimate_extraction_quality(rows)


def estimate_extraction_quality(rows: list[dict]) -> int:
    if not rows:
        return 0

    non_empty_fields = 0
    total_fields = 0
    for row in rows:
        for value in row.values():
            total_fields += 1
            if str(value).strip():
                non_empty_fields += 1

    if total_fields == 0:
        return 0
    return round((non_empty_fields / total_fields) * 100)
