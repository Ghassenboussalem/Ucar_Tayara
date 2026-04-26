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
    """Parse OCR-extracted text into structured rows.

    Tries CSV, TSV, and semicolon-separated formats in order.
    Falls back to a single raw_text row so the job never crashes
    (the data officer can review/correct it in the UI).
    """
    content = text.strip()
    if not content:
        raise ValueError("OCR extracted empty text")

    # Try comma CSV first (most common after Groq structuring)
    reader = csv.DictReader(StringIO(content))
    rows = [dict(row) for row in reader]
    if reader.fieldnames and rows:
        return rows, estimate_extraction_quality(rows)

    # Try tab-separated (common from pdfplumber on tables)
    reader_tsv = csv.DictReader(StringIO(content), delimiter='\t')
    rows_tsv = [dict(row) for row in reader_tsv]
    if reader_tsv.fieldnames and rows_tsv:
        return rows_tsv, estimate_extraction_quality(rows_tsv)

    # Try semicolon-separated (common in French locale exports)
    reader_semi = csv.DictReader(StringIO(content), delimiter=';')
    rows_semi = [dict(row) for row in reader_semi]
    if reader_semi.fieldnames and rows_semi:
        return rows_semi, estimate_extraction_quality(rows_semi)

    # Last resort: return a single raw_text row so the job doesn't crash.
    # Extraction quality is 0 — the UI will flag it as "needs_review".
    fallback = [{"raw_text": content[:2000]}]
    return fallback, 0


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
