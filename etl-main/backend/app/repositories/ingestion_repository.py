from sqlalchemy.orm import Session

from app.domain.models import IngestedRecord, IngestionJob, InstitutionTemplate


class IngestionRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_job(self, job: IngestionJob) -> IngestionJob:
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_job(self, job_id: str) -> IngestionJob | None:
        return self.db.query(IngestionJob).filter(IngestionJob.id == job_id).first()

    def list_jobs(self, limit: int = 50) -> list[IngestionJob]:
        return (
            self.db.query(IngestionJob)
            .order_by(IngestionJob.created_at.desc())
            .limit(limit)
            .all()
        )

    def save_job(self, job: IngestionJob) -> IngestionJob:
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def upsert_records(self, records: list[IngestedRecord]) -> int:
        for record in records:
            self.db.add(record)
        self.db.commit()
        return len(records)

    def list_templates(self, institution: str | None = None) -> list[InstitutionTemplate]:
        query = self.db.query(InstitutionTemplate).filter(InstitutionTemplate.is_active.is_(True))
        if institution:
            query = query.filter(InstitutionTemplate.institution == institution)
        return query.order_by(InstitutionTemplate.updated_at.desc()).all()

    def list_template_history(
        self, institution: str, document_type: str
    ) -> list[InstitutionTemplate]:
        return (
            self.db.query(InstitutionTemplate)
            .filter(InstitutionTemplate.institution == institution)
            .filter(InstitutionTemplate.document_type == document_type)
            .order_by(InstitutionTemplate.version.desc(), InstitutionTemplate.updated_at.desc())
            .all()
        )

    def get_template(
        self, institution: str, document_type: str
    ) -> InstitutionTemplate | None:
        return (
            self.db.query(InstitutionTemplate)
            .filter(InstitutionTemplate.institution == institution)
            .filter(InstitutionTemplate.document_type == document_type)
            .filter(InstitutionTemplate.is_active.is_(True))
            .first()
        )

    def upsert_template(
        self,
        institution: str,
        document_type: str,
        supported_extensions: list[str],
        fields: list[dict],
        sample_file: str | None = None,
    ) -> InstitutionTemplate:
        existing = self.get_template(institution=institution, document_type=document_type)
        if existing:
            existing.is_active = False
            self.db.add(existing)
            self.db.commit()
            next_version = existing.version + 1
        else:
            next_version = 1

        item = InstitutionTemplate(
            institution=institution,
            document_type=document_type,
            supported_extensions=supported_extensions,
            fields=fields,
            sample_file=sample_file,
            version=next_version,
            is_active=True,
        )
        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def deactivate_template(self, institution: str, document_type: str) -> InstitutionTemplate | None:
        existing = self.get_template(institution=institution, document_type=document_type)
        if not existing:
            return None
        existing.is_active = False
        self.db.add(existing)
        self.db.commit()
        self.db.refresh(existing)
        return existing
