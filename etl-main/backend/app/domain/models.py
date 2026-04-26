from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IngestionJob(Base):
    __tablename__ = "ingestion_jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    institution: Mapped[str] = mapped_column(String(120), index=True)
    document_type: Mapped[str] = mapped_column(String(60), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    source_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(32), index=True)
    processing_stage: Mapped[str] = mapped_column(String(32), default="created")
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction_quality: Mapped[int] = mapped_column(Integer, default=0)
    extracted_payload: Mapped[list[dict]] = mapped_column(JSON, default=list)
    anomalies: Mapped[list[dict]] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    records: Mapped[list["IngestedRecord"]] = relationship(
        back_populates="job", cascade="all, delete-orphan"
    )


class IngestedRecord(Base):
    __tablename__ = "ingested_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("ingestion_jobs.id"), index=True)
    source_record_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    student_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    subject: Mapped[str | None] = mapped_column(String(120), nullable=True)
    grade: Mapped[float | None] = mapped_column(Float, nullable=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    validation_status: Mapped[str] = mapped_column(String(32), default="pending")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    job: Mapped[IngestionJob] = relationship(back_populates="records")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(80), index=True)
    actor_username: Mapped[str] = mapped_column(String(120), index=True)
    actor_role: Mapped[str] = mapped_column(String(50), index=True)
    institution_scope: Mapped[str | None] = mapped_column(String(120), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class InstitutionTemplate(Base):
    __tablename__ = "institution_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    institution: Mapped[str] = mapped_column(String(120), index=True)
    document_type: Mapped[str] = mapped_column(String(80), index=True)
    supported_extensions: Mapped[list[str]] = mapped_column(JSON, default=list)
    fields: Mapped[list[dict]] = mapped_column(JSON, default=list)
    sample_file: Mapped[str | None] = mapped_column(String(255), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class UserAccount(Base):
    __tablename__ = "user_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), index=True)
    institution: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
