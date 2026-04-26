from app.core.database import SessionLocal
from app.repositories.ingestion_repository import IngestionRepository
from app.services.ingestion_service import IngestionService


def process_ingestion_job(file_id: str, auto_store: bool = True) -> None:
    with SessionLocal() as db:
        service = IngestionService(IngestionRepository(db))
        service.process_queued_document(file_id=file_id, auto_store=auto_store)
