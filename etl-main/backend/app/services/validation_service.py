from app.schemas.ingestion import ValidationAnomaly
from app.services.validators import validate_by_document_type


def validate_records(
    document_type: str, records: list[dict]
) -> list[ValidationAnomaly]:
    return validate_by_document_type(document_type=document_type, records=records)
