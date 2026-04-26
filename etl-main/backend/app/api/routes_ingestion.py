from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import AuthUser, get_current_user, require_roles
from app.domain.models import AuditLog
from app.repositories.ingestion_repository import IngestionRepository
from app.schemas.ingestion import (
    ApplyCorrectionsRequest,
    ApplyCorrectionsResponse,
    AuditLogItem,
    DocumentTemplate,
    JobDetail,
    JobSummary,
    IngestionOpsSummary,
    SchemaSuggestionResponse,
    JobExplanationResponse,
    OcrRuntimeInfoResponse,
    AsyncUploadResponse,
    BatchUploadItem,
    BatchUploadResponse,
    ErrorResponse,
    TemplateRegistryResponse,
    TemplateRegistryDeleteRequest,
    TemplateRegistryHistoryResponse,
    TemplateRegistryUpsertRequest,
    StoreRequest,
    StoreResponse,
    UploadResponse,
    ValidateRequest,
    ValidateResponse,
)
from app.services.audit_service import AuditService
from app.services.explainability_service import ExplainabilityService
from app.services.ingestion_service import IngestionService
from app.services.ocr_service import get_ocr_runtime_info
from app.services.queue_service import QueueService

router = APIRouter(prefix="/api", tags=["ingestion"])


def get_service(db: Session = Depends(get_db)) -> IngestionService:
    return IngestionService(IngestionRepository(db))


def get_audit_service(db: Session = Depends(get_db)) -> AuditService:
    return AuditService(db)


ERROR_RESPONSES = {
    401: {"model": ErrorResponse, "description": "Unauthorized"},
    403: {"model": ErrorResponse, "description": "Forbidden"},
    404: {"model": ErrorResponse, "description": "Not found"},
    409: {"model": ErrorResponse, "description": "Conflict"},
    422: {"model": ErrorResponse, "description": "Validation error"},
    500: {"model": ErrorResponse, "description": "Internal server error"},
}


@router.post(
    "/upload",
    response_model=UploadResponse,
    responses=ERROR_RESPONSES,
)
async def upload(
    file: UploadFile = File(...),
    institution: str = Form(...),
    document_type: str | None = Form(default=None),
    user: AuthUser = Depends(require_roles("admin", "dean", "professor", "data_officer")),
    service: IngestionService = Depends(get_service),
    audit: AuditService = Depends(get_audit_service),
):
    job = await service.upload_document(file, institution, document_type)
    audit.log_action(
        action="upload_sync",
        actor=user,
        resource_id=job.id,
        details={"document_type": job.document_type, "institution": institution},
    )
    return UploadResponse(
        status="success",
        file_id=job.id,
        extraction_quality=job.extraction_quality,
        anomalies_detected=len(job.anomalies),
    )


@router.post("/upload-async", response_model=AsyncUploadResponse, responses=ERROR_RESPONSES)
async def upload_async(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    institution: str = Form(...),
    document_type: str | None = Form(default=None),
    auto_store: bool = Form(default=True),
    user: AuthUser = Depends(require_roles("admin", "dean", "professor", "data_officer")),
    service: IngestionService = Depends(get_service),
    audit: AuditService = Depends(get_audit_service),
):
    job = await service.queue_document(file, institution, document_type)
    queue_service = QueueService()
    queued_in_redis = queue_service.enqueue_ingestion_job(file_id=job.id, auto_store=auto_store)
    if not queued_in_redis:
        background_tasks.add_task(service.process_queued_document, job.id, auto_store)
    audit.log_action(
        action="upload_async_queued",
        actor=user,
        resource_id=job.id,
        details={"document_type": job.document_type, "institution": institution, "auto_store": auto_store},
    )
    return AsyncUploadResponse(
        status="queued",
        file_id=job.id,
        processing_stage=job.processing_stage,
    )


@router.post("/upload-batch", response_model=BatchUploadResponse, responses=ERROR_RESPONSES)
async def upload_batch(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    institution: str = Form(...),
    document_type: str | None = Form(default=None),
    auto_store: bool = Form(default=True),
    user: AuthUser = Depends(require_roles("admin", "dean", "professor", "data_officer")),
    service: IngestionService = Depends(get_service),
    audit: AuditService = Depends(get_audit_service),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    queue_service = QueueService()
    jobs = []
    redis_queued = 0

    for file in files:
        job = await service.queue_document(file, institution, document_type)
        jobs.append(job)
        queued_in_redis = queue_service.enqueue_ingestion_job(file_id=job.id, auto_store=auto_store)
        if queued_in_redis:
            redis_queued += 1
        else:
            background_tasks.add_task(service.process_queued_document, job.id, auto_store)

    audit.log_action(
        action="upload_batch_queued",
        actor=user,
        details={
            "institution": institution,
            "files_count": len(jobs),
            "redis_queued": redis_queued,
            "fallback_background_tasks": len(jobs) - redis_queued,
            "auto_store": auto_store,
        },
    )
    return BatchUploadResponse(
        status="queued",
        queued_count=len(jobs),
        jobs=[
            BatchUploadItem(
                file_id=job.id,
                filename=job.filename,
                processing_stage=job.processing_stage,
            )
            for job in jobs
        ],
    )


@router.post("/validate", response_model=ValidateResponse, responses=ERROR_RESPONSES)
def validate(
    request: ValidateRequest,
    user: AuthUser = Depends(require_roles("admin", "dean", "data_officer")),
    service: IngestionService = Depends(get_service),
    audit: AuditService = Depends(get_audit_service),
):
    job, anomalies = service.validate_document(request.file_id)
    audit.log_action(
        action="validate",
        actor=user,
        resource_id=job.id,
        details={"anomalies_detected": len(anomalies)},
    )
    return ValidateResponse(status="validated", anomalies=anomalies)


@router.get(
    "/schema/suggestions/{file_id}",
    response_model=SchemaSuggestionResponse,
    responses=ERROR_RESPONSES,
)
def schema_suggestions(
    file_id: str,
    user: AuthUser = Depends(get_current_user),
    service: IngestionService = Depends(get_service),
):
    job = service.get_job(file_id)
    if user.role != "admin" and user.institution != job.institution:
        raise HTTPException(status_code=403, detail="Cannot access jobs outside your institution")
    payload = service.suggest_schema_corrections(file_id=file_id)
    return SchemaSuggestionResponse(**payload)


@router.get(
    "/jobs/{file_id}/explanation",
    response_model=JobExplanationResponse,
    responses=ERROR_RESPONSES,
)
def explain_job(
    file_id: str,
    include_llm: bool = Query(default=False),
    user: AuthUser = Depends(get_current_user),
    service: IngestionService = Depends(get_service),
):
    job = service.get_job(file_id)
    if user.role != "admin" and user.institution != job.institution:
        raise HTTPException(status_code=403, detail="Cannot access jobs outside your institution")
    schema_payload = service.suggest_schema_corrections(file_id=file_id)
    explanation_service = ExplainabilityService()
    payload = explanation_service.explain_job(
        file_id=job.id,
        filename=job.filename,
        status=job.status,
        processing_stage=job.processing_stage,
        document_type=job.document_type,
        institution=job.institution,
        rows=job.extracted_payload or [],
        anomalies=job.anomalies or [],
        schema_suggestions=schema_payload["suggestions"],
        include_llm=include_llm,
    )
    return JobExplanationResponse(**payload)


@router.post("/store", response_model=StoreResponse, responses=ERROR_RESPONSES)
def store(
    request: StoreRequest,
    user: AuthUser = Depends(require_roles("admin", "dean", "data_officer")),
    service: IngestionService = Depends(get_service),
    audit: AuditService = Depends(get_audit_service),
):
    job, stored_records = service.store_document(request.file_id)
    audit.log_action(
        action="store",
        actor=user,
        resource_id=job.id,
        details={"stored_records": stored_records},
    )
    return StoreResponse(
        status="stored",
        sql_table="ingested_records",
        stored_records=stored_records,
    )


@router.get("/jobs", response_model=list[JobSummary], responses=ERROR_RESPONSES)
def list_jobs(
    limit: int = Query(default=50, ge=1, le=200),
    user: AuthUser = Depends(get_current_user),
    service: IngestionService = Depends(get_service),
):
    jobs = service.list_jobs(limit=limit)
    if user.role != "admin":
        jobs = [job for job in jobs if user.institution and job.institution == user.institution]
    return [
        JobSummary(
            id=job.id,
            institution=job.institution,
            document_type=job.document_type,
            filename=job.filename,
            status=job.status,
            processing_stage=job.processing_stage,
            processing_error=job.processing_error,
            extraction_quality=job.extraction_quality,
            anomalies_detected=len(job.anomalies),
            records_count=len(job.extracted_payload) if job.extracted_payload else 0,
            updated_at=job.updated_at.isoformat() if job.updated_at else None,
        )
        for job in jobs
    ]


@router.get("/jobs/{file_id}", response_model=JobDetail, responses=ERROR_RESPONSES)
def get_job(
    file_id: str,
    user: AuthUser = Depends(get_current_user),
    service: IngestionService = Depends(get_service),
):
    job = service.get_job(file_id)
    if user.role != "admin" and user.institution != job.institution:
        raise HTTPException(status_code=403, detail="Cannot access jobs outside your institution")
    return JobDetail(
        id=job.id,
        institution=job.institution,
        document_type=job.document_type,
        filename=job.filename,
        status=job.status,
        processing_stage=job.processing_stage,
        processing_error=job.processing_error,
        extraction_quality=job.extraction_quality,
        anomalies_detected=len(job.anomalies),
        extracted_payload=job.extracted_payload or [],
        anomalies=job.anomalies or [],
    )


@router.get("/templates", response_model=list[DocumentTemplate], responses=ERROR_RESPONSES)
def list_templates(
    institution: str | None = Query(default=None),
    user: AuthUser = Depends(get_current_user),
    service: IngestionService = Depends(get_service),
):
    effective_institution = institution
    if user.role != "admin":
        effective_institution = user.institution
    return service.get_templates(institution=effective_institution)


@router.get("/templates/registry", response_model=list[DocumentTemplate], responses=ERROR_RESPONSES)
def list_template_registry(
    institution: str | None = Query(default=None),
    user: AuthUser = Depends(require_roles("admin", "dean", "data_officer", "auditor")),
    service: IngestionService = Depends(get_service),
):
    effective_institution = institution
    if user.role != "admin":
        effective_institution = user.institution
    return service.list_registry_templates(institution=effective_institution)


@router.post("/templates/registry", response_model=TemplateRegistryResponse, responses=ERROR_RESPONSES)
def upsert_template_registry(
    request: TemplateRegistryUpsertRequest,
    user: AuthUser = Depends(require_roles("admin", "dean", "data_officer")),
    service: IngestionService = Depends(get_service),
    audit: AuditService = Depends(get_audit_service),
):
    if user.role != "admin" and user.institution != request.institution:
        raise HTTPException(
            status_code=403,
            detail="Cannot manage templates outside your institution",
        )
    template = service.upsert_registry_template(
        institution=request.institution,
        document_type=request.document_type,
        supported_extensions=request.supported_extensions,
        fields=[field.model_dump() for field in request.fields],
        sample_file=request.sample_file,
    )
    audit.log_action(
        action="template_registry_upsert",
        actor=user,
        resource_id=f"{template['institution']}:{template['document_type']}",
        details={
            "institution": template["institution"],
            "document_type": template["document_type"],
            "fields_count": len(template["fields"]),
        },
    )
    return TemplateRegistryResponse(status="upserted", template=DocumentTemplate(**template))


@router.post("/templates/registry/deactivate", response_model=TemplateRegistryResponse, responses=ERROR_RESPONSES)
def deactivate_template_registry(
    request: TemplateRegistryDeleteRequest,
    user: AuthUser = Depends(require_roles("admin", "dean", "data_officer")),
    service: IngestionService = Depends(get_service),
    audit: AuditService = Depends(get_audit_service),
):
    if user.role != "admin" and user.institution != request.institution:
        raise HTTPException(
            status_code=403,
            detail="Cannot manage templates outside your institution",
        )
    template = service.deactivate_registry_template(
        institution=request.institution,
        document_type=request.document_type,
    )
    audit.log_action(
        action="template_registry_deactivate",
        actor=user,
        resource_id=f"{template['institution']}:{template['document_type']}",
        details={
            "institution": template["institution"],
            "document_type": template["document_type"],
            "version": template["version"],
        },
    )
    return TemplateRegistryResponse(status="deactivated", template=DocumentTemplate(**template))


@router.get(
    "/templates/registry/history",
    response_model=TemplateRegistryHistoryResponse,
    responses=ERROR_RESPONSES,
)
def template_registry_history(
    institution: str = Query(...),
    document_type: str = Query(...),
    user: AuthUser = Depends(require_roles("admin", "dean", "data_officer", "auditor")),
    service: IngestionService = Depends(get_service),
):
    if user.role != "admin" and user.institution != institution:
        raise HTTPException(
            status_code=403,
            detail="Cannot access template history outside your institution",
        )
    items = service.template_history(institution=institution, document_type=document_type)
    return TemplateRegistryHistoryResponse(
        institution=institution,
        document_type=document_type,
        items=[DocumentTemplate(**item) for item in items],
    )


@router.post("/review/apply-corrections", response_model=ApplyCorrectionsResponse, responses=ERROR_RESPONSES)
def apply_corrections(
    request: ApplyCorrectionsRequest,
    user: AuthUser = Depends(require_roles("admin", "dean", "professor", "data_officer")),
    service: IngestionService = Depends(get_service),
    audit: AuditService = Depends(get_audit_service),
):
    current_job = service.get_job(request.file_id)
    if user.role != "admin" and user.institution != current_job.institution:
        raise HTTPException(status_code=403, detail="Cannot modify jobs outside your institution")
    job, stored_count = service.apply_corrections(
        file_id=request.file_id,
        corrections=[item.model_dump() for item in request.corrections],
        auto_store=request.auto_store,
    )
    audit.log_action(
        action="apply_corrections",
        actor=user,
        resource_id=job.id,
        details={
            "corrections_count": len(request.corrections),
            "anomalies_remaining": len(job.anomalies),
            "auto_store": request.auto_store,
        },
    )
    return ApplyCorrectionsResponse(
        status="corrected",
        file_id=job.id,
        anomalies_remaining=len(job.anomalies),
        final_status=job.status,
        stored_records=stored_count,
    )


@router.get("/ops/summary", response_model=IngestionOpsSummary, responses=ERROR_RESPONSES)
def ops_summary(
    user: AuthUser = Depends(require_roles("admin", "auditor", "data_officer", "dean")),
    service: IngestionService = Depends(get_service),
):
    scope_institution = None if user.role in {"admin", "auditor"} else user.institution
    return IngestionOpsSummary(**service.get_ops_summary(institution=scope_institution))


@router.get("/ops/ocr-runtime", response_model=OcrRuntimeInfoResponse, responses=ERROR_RESPONSES)
def ocr_runtime_info(
    user: AuthUser = Depends(require_roles("admin", "auditor", "data_officer", "dean")),
):
    return OcrRuntimeInfoResponse(**get_ocr_runtime_info())


@router.post("/demo/trigger", responses=ERROR_RESPONSES)
def demo_trigger(
    scenario: str = Form(...),
    service: IngestionService = Depends(get_service),
):
    """
    Hackathon demo endpoint — processes a pre-built scenario without requiring
    a real file upload. Triggers the full pipeline: validate → compute KPIs →
    push to platform → fire alerts. No auth required (demo only).
    Valid scenarios: academic, finance, hr, esg, research, employment
    """
    job = service.demo_trigger(scenario=scenario)
    return {
        "job_id": job.id,
        "institution": job.institution,
        "document_type": job.document_type,
        "status": job.status,
        "records": len(job.extracted_payload or []),
        "anomalies": len(job.anomalies or []),
        "scenario": scenario,
    }


@router.get("/demo/scenarios")
def list_demo_scenarios():
    """Return available demo scenario names and their metadata."""
    return {
        "scenarios": [
            {"id": "academic",    "label": "Résultats académiques",  "institution": "EPT",    "domain": "academic",    "alert": "Taux de réussite critique (38%)"},
            {"id": "finance",     "label": "Budget & Finance",        "institution": "INSAT",  "domain": "finance",     "alert": "Dépassement budgétaire (108%)"},
            {"id": "hr",          "label": "Ressources Humaines",     "institution": "FSB",    "domain": "hr",          "alert": "Absentéisme critique (22%)"},
            {"id": "esg",         "label": "ESG / Environnement",     "institution": "IHEC",   "domain": "esg",         "alert": "Accessibilité sous la norme"},
            {"id": "research",    "label": "Recherche scientifique",  "institution": "SUPCOM", "domain": "research",    "alert": None},
            {"id": "employment",  "label": "Insertion professionnelle","institution": "ESAC",   "domain": "employment",  "alert": "Taux d'employabilité faible (41%)"},
        ]
    }


@router.get("/audit-logs", response_model=list[AuditLogItem], responses=ERROR_RESPONSES)
def list_audit_logs(
    limit: int = Query(default=100, ge=1, le=500),
    user: AuthUser = Depends(require_roles("admin", "auditor")),
    db: Session = Depends(get_db),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        AuditLogItem(
            id=log.id,
            action=log.action,
            actor_username=log.actor_username,
            actor_role=log.actor_role,
            institution_scope=log.institution_scope,
            resource_id=log.resource_id,
            details=log.details or {},
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]
