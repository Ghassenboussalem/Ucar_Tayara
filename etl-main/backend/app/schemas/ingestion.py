from typing import Any

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    status: str
    file_id: str
    extraction_quality: int
    anomalies_detected: int


class AsyncUploadResponse(BaseModel):
    status: str
    file_id: str
    processing_stage: str


class BatchUploadItem(BaseModel):
    file_id: str
    filename: str
    processing_stage: str


class BatchUploadResponse(BaseModel):
    status: str
    queued_count: int
    jobs: list[BatchUploadItem]


class ValidateRequest(BaseModel):
    file_id: str = Field(min_length=1)


class ValidationAnomaly(BaseModel):
    row_index: int | None = None
    field: str
    value: Any
    expected: str
    severity: str = "error"


class ValidateResponse(BaseModel):
    status: str
    anomalies: list[ValidationAnomaly]


class SchemaSuggestionItem(BaseModel):
    source_field: str
    suggested_field: str | None = None
    confidence: str = "low"
    reason: str


class SchemaSuggestionResponse(BaseModel):
    file_id: str
    document_type: str
    suggestions: list[SchemaSuggestionItem]


class ExplanationStep(BaseModel):
    step: str
    summary: str
    details: dict[str, Any] = Field(default_factory=dict)


class JobExplanationResponse(BaseModel):
    file_id: str
    status: str
    processing_stage: str
    explanation_steps: list[ExplanationStep]
    llm_explanation: str | None = None


class StoreRequest(BaseModel):
    file_id: str = Field(min_length=1)


class StoreResponse(BaseModel):
    status: str
    sql_table: str
    stored_records: int


class JobSummary(BaseModel):
    id: str
    institution: str
    document_type: str
    filename: str
    status: str
    processing_stage: str
    processing_error: str | None
    extraction_quality: int
    anomalies_detected: int


class JobDetail(JobSummary):
    extracted_payload: list[dict]
    anomalies: list[ValidationAnomaly]


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorDetail


class AuditLogItem(BaseModel):
    id: int
    action: str
    actor_username: str
    actor_role: str
    institution_scope: str | None
    resource_id: str | None
    details: dict[str, Any]
    created_at: str


class CorrectionItem(BaseModel):
    row_index: int = Field(ge=0)
    field: str = Field(min_length=1)
    value: Any


class ApplyCorrectionsRequest(BaseModel):
    file_id: str = Field(min_length=1)
    corrections: list[CorrectionItem]
    auto_store: bool = False


class ApplyCorrectionsResponse(BaseModel):
    status: str
    file_id: str
    anomalies_remaining: int
    final_status: str
    stored_records: int | None = None


class TemplateField(BaseModel):
    name: str
    required: bool = True
    description: str


class DocumentTemplate(BaseModel):
    institution: str | None = None
    document_type: str
    supported_extensions: list[str]
    fields: list[TemplateField]
    sample_file: str | None = None
    version: int = 1
    is_active: bool = True
    source: str = "default"


class IngestionOpsSummary(BaseModel):
    total_jobs: int
    queued: int
    processing: int
    needs_review: int
    validated: int
    stored: int
    failed: int


class OcrRuntimeInfoResponse(BaseModel):
    groq_enabled: bool
    groq_model: str
    languages: list[str]
    pipeline_order: list[str]


class TemplateRegistryUpsertRequest(BaseModel):
    institution: str = Field(min_length=1)
    document_type: str = Field(min_length=1)
    supported_extensions: list[str] = Field(min_length=1)
    fields: list[TemplateField] = Field(min_length=1)
    sample_file: str | None = None


class TemplateRegistryResponse(BaseModel):
    status: str
    template: DocumentTemplate


class TemplateRegistryDeleteRequest(BaseModel):
    institution: str = Field(min_length=1)
    document_type: str = Field(min_length=1)


class TemplateRegistryHistoryResponse(BaseModel):
    institution: str
    document_type: str
    items: list[DocumentTemplate]
