from pathlib import Path
from uuid import uuid4
from difflib import get_close_matches

from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.domain.models import IngestedRecord, IngestionJob
from app.repositories.ingestion_repository import IngestionRepository
from app.schemas.ingestion import ValidationAnomaly
from app.services.formula_service import compute_kpis
from app.services.ocr_service import ocr_provider
from app.services.parsing_service import (
    ALLOWED_EXTENSIONS,
    detect_file_extension,
    parse_payload,
    parse_text_payload,
)
from app.services.platform_bridge import push_kpis
from app.services.validation_service import validate_records


class IngestionService:
    def _detect_document_type(self, filename: str, rows: list[dict]) -> str:
        lower = (filename or "").lower()
        keys = {str(k).strip().lower() for row in rows[:10] for k in row.keys()}

        # Filename-based detection (fast path)
        if any(t in lower for t in ("grade", "note", "resultat", "exam", "scolarit")):
            return "grades"
        if any(t in lower for t in ("budget", "financ", "comptab")):
            return "finance"
        if any(t in lower for t in ("rh", "_hr", "personnel", "staff", "ressource")):
            return "hr"
        if any(t in lower for t in ("esg", "rse", "env", "ecolog", "carbone")):
            return "esg"
        if any(t in lower for t in ("recherche", "research", "publication", "labo")):
            return "research"
        if any(t in lower for t in ("emploi", "employment", "insertion", "diplom")):
            return "employment"
        if any(t in lower for t in ("infra", "batiment", "locaux", "equipement", "maintenance")):
            return "infrastructure"
        if any(t in lower for t in ("partenariat", "partnership", "accord", "convention", "mobilit")):
            return "partnership"

        # Column-based detection (fallback)
        if {"student_id", "subject", "grade"}.issubset(keys):
            return "grades"
        if {"success_rate", "dropout_rate"}.issubset(keys):
            return "grades"
        if {"institution", "allocated", "spent"}.issubset(keys):
            return "finance"
        if {"allocated_budget", "consumed_budget"}.issubset(keys):
            return "finance"
        if {"absenteeism_rate", "total_teaching_staff"}.issubset(keys) or \
                {"staff_type", "headcount"}.issubset(keys):
            return "hr"
        if {"energy_consumption_kwh", "carbon_footprint_tons"}.issubset(keys) or \
                {"recycling_rate", "accessibility_score"}.issubset(keys):
            return "esg"
        if {"publications_count", "phd_students"}.issubset(keys) or \
                "patents_filed" in keys:
            return "research"
        if {"employability_rate_6m", "graduates_total"}.issubset(keys):
            return "employment"
        if {"classroom_occupancy_rate", "maintenance_requests"}.issubset(keys):
            return "infrastructure"
        if {"active_national_agreements", "erasmus_partnerships"}.issubset(keys) or \
                {"incoming_students", "outgoing_students"}.issubset(keys):
            return "partnership"

        return "generic"

    def __init__(self, repository: IngestionRepository):
        self.repository = repository

    def _extract_rows(
        self, *, content: bytes, filename: str, document_type: str
    ) -> tuple[list[dict], int]:
        extension = detect_file_extension(filename)
        if extension in {".csv", ".txt", ".json", ".xlsx"}:
            return parse_payload(content, filename)

        extracted_text = ocr_provider.extract_text(
            content, filename, document_type=document_type
        )
        return parse_text_payload(extracted_text)

    async def upload_document(
        self, file: UploadFile, institution: str, document_type: str | None = None
    ) -> IngestionJob:
        extension = detect_file_extension(file.filename or "")
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        content = await file.read()
        try:
            rows, extraction_quality = self._extract_rows(
                content=content,
                filename=file.filename or "unknown.csv",
                document_type=document_type or "generic",
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        resolved_document_type = (
            document_type.strip().lower()
            if document_type and document_type.strip()
            else self._detect_document_type(file.filename or "", rows)
        )

        job = IngestionJob(
            id=str(uuid4()),
            institution=institution,
            document_type=resolved_document_type,
            filename=file.filename or "unknown.csv",
            status="uploaded",
            processing_stage="parsed",
            extraction_quality=extraction_quality,
            extracted_payload=rows,
            anomalies=[],
        )
        return self.repository.create_job(job)

    async def queue_document(
        self, file: UploadFile, institution: str, document_type: str | None = None
    ) -> IngestionJob:
        extension = detect_file_extension(file.filename or "")
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        resolved_document_type = (
            document_type.strip().lower()
            if document_type and document_type.strip()
            else self._detect_document_type(file.filename or "", [])
        )

        job_id = str(uuid4())
        uploads_dir = Path(settings.uploads_dir)
        uploads_dir.mkdir(parents=True, exist_ok=True)
        filename = file.filename or f"{job_id}.dat"
        source_path = uploads_dir / f"{job_id}_{filename}"
        content = await file.read()
        source_path.write_bytes(content)

        job = IngestionJob(
            id=job_id,
            institution=institution,
            document_type=resolved_document_type,
            filename=filename,
            source_path=str(source_path),
            status="queued",
            processing_stage="queued",
            extraction_quality=0,
            extracted_payload=[],
            anomalies=[],
        )
        return self.repository.create_job(job)

    def suggest_schema_corrections(self, file_id: str) -> dict:
        job = self.repository.get_job(file_id)
        if not job:
            raise HTTPException(status_code=404, detail="File not found")
        templates = self.get_templates(institution=job.institution)
        template = next((t for t in templates if t["document_type"] == job.document_type), None)
        expected_fields = [f["name"] for f in (template or {}).get("fields", [])]
        observed_fields = []
        for row in job.extracted_payload[:10]:
            observed_fields.extend(list(row.keys()))
        observed_unique = sorted({str(x) for x in observed_fields if str(x).strip()})

        suggestions = []
        for field in observed_unique:
            if field in expected_fields:
                continue
            match = get_close_matches(field, expected_fields, n=1, cutoff=0.5)
            if match:
                suggestions.append(
                    {
                        "source_field": field,
                        "suggested_field": match[0],
                        "confidence": "medium",
                        "reason": "close lexical match to expected schema",
                    }
                )
            else:
                suggestions.append(
                    {
                        "source_field": field,
                        "suggested_field": None,
                        "confidence": "low",
                        "reason": "unknown field not found in expected schema",
                    }
                )

        for expected in expected_fields:
            if expected not in observed_unique:
                suggestions.append(
                    {
                        "source_field": "<missing>",
                        "suggested_field": expected,
                        "confidence": "high",
                        "reason": "required field missing from extracted payload",
                    }
                )

        return {
            "file_id": job.id,
            "document_type": job.document_type,
            "suggestions": suggestions,
        }

    def process_queued_document(self, file_id: str, auto_store: bool = True) -> IngestionJob:
        job = self.repository.get_job(file_id)
        if not job:
            raise HTTPException(status_code=404, detail="File not found")
        if not job.source_path:
            raise HTTPException(status_code=409, detail="No source file associated with this job")

        source = Path(job.source_path)
        if not source.exists():
            job.status = "failed"
            job.processing_stage = "failed"
            job.processing_error = "Source file missing from upload storage"
            return self.repository.save_job(job)

        try:
            job.status = "processing"
            job.processing_stage = "ocr"
            job.processing_error = None
            self.repository.save_job(job)

            content = source.read_bytes()
            rows, extraction_quality = self._extract_rows(
                content=content,
                filename=job.filename or "unknown.csv",
                document_type=job.document_type,
            )

            job.extracted_payload = rows
            job.extraction_quality = extraction_quality
            job.processing_stage = "validation"
            self.repository.save_job(job)

            anomalies = validate_records(job.document_type, rows)
            job.anomalies = [anomaly.model_dump() for anomaly in anomalies]
            # Always mark as validated so auto_store can proceed;
            # anomalies are preserved in job.anomalies for review.
            job.status = "validated"
            job.processing_stage = "validated"
            self.repository.save_job(job)

            if auto_store:
                self.store_document(job.id)

            return self.repository.get_job(job.id) or job
        except Exception as exc:  # pragma: no cover - defensive final guard
            job.status = "failed"
            job.processing_stage = "failed"
            job.processing_error = str(exc)
            return self.repository.save_job(job)

    def validate_document(self, file_id: str) -> tuple[IngestionJob, list[ValidationAnomaly]]:
        job = self.repository.get_job(file_id)
        if not job:
            raise HTTPException(status_code=404, detail="File not found")

        anomalies = validate_records(job.document_type, job.extracted_payload or [])
        job.status = "validated" if not anomalies else "needs_review"
        job.anomalies = [anomaly.model_dump() for anomaly in anomalies]
        return self.repository.save_job(job), anomalies

    def store_document(self, file_id: str) -> tuple[IngestionJob, int]:
        job = self.repository.get_job(file_id)
        if not job:
            raise HTTPException(status_code=404, detail="File not found")

        if job.status not in {"validated", "needs_review"}:
            raise HTTPException(
                status_code=409,
                detail="Document must be validated before storing",
            )

        records = []
        for payload in job.extracted_payload or []:
            grade_value = payload.get("grade")
            parsed_grade = None
            if grade_value not in (None, ""):
                try:
                    parsed_grade = float(grade_value)
                except ValueError:
                    parsed_grade = None

            records.append(
                IngestedRecord(
                    job_id=job.id,
                    source_record_id=payload.get("record_id"),
                    student_id=payload.get("student_id"),
                    subject=payload.get("subject"),
                    grade=parsed_grade,
                    payload=payload,
                    validation_status="valid" if not job.anomalies else "has_anomalies",
                    notes="Stored via core ingestion flow",
                )
            )

        stored_count = self.repository.upsert_records(records)
        job.status = "stored"
        job.processing_stage = "stored"
        self.repository.save_job(job)

        # Compute KPIs from stored records and push to main platform
        kpi_data = compute_kpis(job.document_type, job.extracted_payload or [])
        bridge_result = push_kpis(
            institution=job.institution,
            kpi_data=kpi_data,
            etl_job_id=job.id,
        )
        if bridge_result.get("error"):
            import logging
            logging.getLogger(__name__).warning(
                "Platform push failed for job %s: %s", job.id, bridge_result["error"]
            )

        return job, stored_count

    def get_job(self, file_id: str) -> IngestionJob:
        job = self.repository.get_job(file_id)
        if not job:
            raise HTTPException(status_code=404, detail="File not found")
        return job

    def list_jobs(self, limit: int = 50) -> list[IngestionJob]:
        if limit <= 0 or limit > 200:
            raise HTTPException(status_code=400, detail="limit must be between 1 and 200")
        return self.repository.list_jobs(limit=limit)

    def _default_templates(self) -> list[dict]:
        _exts = [".csv", ".txt", ".json", ".xlsx", ".pdf", ".png", ".jpg", ".jpeg"]
        return [
            {
                "institution": None,
                "document_type": "grades",
                "supported_extensions": _exts,
                "fields": [
                    {"name": "student_id", "required": True, "description": "Unique student identifier"},
                    {"name": "subject", "required": True, "description": "Course or module name"},
                    {"name": "grade", "required": True, "description": "Numeric grade (0–20)"},
                    {"name": "semester", "required": False, "description": "e.g. S1_2025"},
                ],
                "sample_file": "samples/grades.csv",
                "version": 1,
                "is_active": True,
                "source": "default",
            },
            {
                "institution": None,
                "document_type": "finance",
                "supported_extensions": _exts,
                "fields": [
                    {"name": "institution", "required": True, "description": "Institution code"},
                    {"name": "allocated", "required": True, "description": "Allocated budget (DT, >= 0)"},
                    {"name": "spent", "required": True, "description": "Spent budget (DT, <= allocated)"},
                    {"name": "fiscal_year", "required": False, "description": "e.g. 2025"},
                    {"name": "department", "required": False, "description": "Department / cost centre"},
                ],
                "sample_file": "samples/budget.csv",
                "version": 1,
                "is_active": True,
                "source": "default",
            },
            {
                "institution": None,
                "document_type": "hr",
                "supported_extensions": _exts,
                "fields": [
                    {"name": "staff_type", "required": True, "description": "teaching | admin"},
                    {"name": "headcount", "required": True, "description": "Number of staff"},
                    {"name": "absent_days", "required": False, "description": "Total absent days"},
                    {"name": "total_days", "required": False, "description": "Total working days"},
                    {"name": "teaching_hours", "required": False, "description": "Total teaching hours"},
                    {"name": "left_count", "required": False, "description": "Staff who left (turnover)"},
                    {"name": "semester", "required": False, "description": "e.g. S1_2025"},
                ],
                "sample_file": "samples/hr.csv",
                "version": 1,
                "is_active": True,
                "source": "default",
            },
            {
                "institution": None,
                "document_type": "esg",
                "supported_extensions": _exts,
                "fields": [
                    {"name": "energy_consumption_kwh", "required": False, "description": "kWh/year"},
                    {"name": "carbon_footprint_tons", "required": False, "description": "tCO2e/year"},
                    {"name": "recycling_rate", "required": False, "description": "% (0–100)"},
                    {"name": "green_spaces_sqm", "required": False, "description": "m²"},
                    {"name": "sustainable_mobility_pct", "required": False, "description": "% (0–100)"},
                    {"name": "accessibility_score", "required": False, "description": "% vs 60% norm"},
                    {"name": "fiscal_year", "required": False, "description": "e.g. 2025"},
                ],
                "sample_file": "samples/esg.csv",
                "version": 1,
                "is_active": True,
                "source": "default",
            },
            {
                "institution": None,
                "document_type": "research",
                "supported_extensions": _exts,
                "fields": [
                    {"name": "publications_count", "required": False, "description": "Indexed publications"},
                    {"name": "active_projects", "required": False, "description": "Active research projects"},
                    {"name": "funding_secured_tnd", "required": False, "description": "DT secured"},
                    {"name": "phd_students", "required": False, "description": "PhD students enrolled"},
                    {"name": "patents_filed", "required": False, "description": "Patents filed"},
                    {"name": "academic_year", "required": False, "description": "e.g. 2025-2026"},
                ],
                "sample_file": "samples/research.csv",
                "version": 1,
                "is_active": True,
                "source": "default",
            },
            {
                "institution": None,
                "document_type": "employment",
                "supported_extensions": _exts,
                "fields": [
                    {"name": "graduates_total", "required": True, "description": "Total graduates"},
                    {"name": "employed_within_6months", "required": False, "description": "Employed ≤6 months"},
                    {"name": "employed_within_12months", "required": False, "description": "Employed ≤12 months"},
                    {"name": "graduation_year", "required": False, "description": "e.g. 2025"},
                ],
                "sample_file": "samples/employment.csv",
                "version": 1,
                "is_active": True,
                "source": "default",
            },
            {
                "institution": None,
                "document_type": "infrastructure",
                "supported_extensions": _exts,
                "fields": [
                    {"name": "classroom_occupancy_rate", "required": False, "description": "% (0–100)"},
                    {"name": "equipment_availability_rate", "required": False, "description": "% (0–100)"},
                    {"name": "maintenance_requests", "required": False, "description": "Count"},
                    {"name": "resolved_requests", "required": False, "description": "Count (≤ maintenance_requests)"},
                    {"name": "lab_availability_rate", "required": False, "description": "% (0–100)"},
                    {"name": "semester", "required": False, "description": "e.g. S1_2025"},
                ],
                "sample_file": "samples/infrastructure.csv",
                "version": 1,
                "is_active": True,
                "source": "default",
            },
            {
                "institution": None,
                "document_type": "partnership",
                "supported_extensions": _exts,
                "fields": [
                    {"name": "active_national_agreements", "required": False, "description": "Count"},
                    {"name": "active_international_agreements", "required": False, "description": "Count"},
                    {"name": "incoming_students", "required": False, "description": "Count"},
                    {"name": "outgoing_students", "required": False, "description": "Count"},
                    {"name": "erasmus_partnerships", "required": False, "description": "Count"},
                    {"name": "academic_year", "required": False, "description": "e.g. 2025-2026"},
                ],
                "sample_file": "samples/partnership.csv",
                "version": 1,
                "is_active": True,
                "source": "default",
            },
        ]

    def get_templates(self, institution: str | None = None) -> list[dict]:
        templates_by_type = {item["document_type"]: item for item in self._default_templates()}
        if institution:
            custom_templates = self.repository.list_templates(institution=institution)
            for tpl in custom_templates:
                templates_by_type[tpl.document_type] = {
                    "institution": tpl.institution,
                    "document_type": tpl.document_type,
                    "supported_extensions": tpl.supported_extensions or [],
                    "fields": tpl.fields or [],
                    "sample_file": tpl.sample_file,
                    "version": tpl.version,
                    "is_active": tpl.is_active,
                    "source": "institution",
                }
        return list(templates_by_type.values())

    def list_registry_templates(self, institution: str | None = None) -> list[dict]:
        templates = self.repository.list_templates(institution=institution)
        return [
            {
                "institution": tpl.institution,
                "document_type": tpl.document_type,
                "supported_extensions": tpl.supported_extensions or [],
                "fields": tpl.fields or [],
                "sample_file": tpl.sample_file,
                "version": tpl.version,
                "is_active": tpl.is_active,
                "source": "institution",
            }
            for tpl in templates
        ]

    def upsert_registry_template(
        self,
        institution: str,
        document_type: str,
        supported_extensions: list[str],
        fields: list[dict],
        sample_file: str | None = None,
    ) -> dict:
        if not institution.strip():
            raise HTTPException(status_code=400, detail="institution is required")
        if not document_type.strip():
            raise HTTPException(status_code=400, detail="document_type is required")
        if not supported_extensions:
            raise HTTPException(status_code=400, detail="supported_extensions cannot be empty")
        if not fields:
            raise HTTPException(status_code=400, detail="fields cannot be empty")

        saved = self.repository.upsert_template(
            institution=institution.strip(),
            document_type=document_type.strip().lower(),
            supported_extensions=supported_extensions,
            fields=fields,
            sample_file=sample_file,
        )
        return {
            "institution": saved.institution,
            "document_type": saved.document_type,
            "supported_extensions": saved.supported_extensions or [],
            "fields": saved.fields or [],
            "sample_file": saved.sample_file,
            "version": saved.version,
            "is_active": saved.is_active,
            "source": "institution",
        }

    def deactivate_registry_template(self, institution: str, document_type: str) -> dict:
        target = self.repository.deactivate_template(
            institution=institution.strip(), document_type=document_type.strip().lower()
        )
        if not target:
            raise HTTPException(status_code=404, detail="Template not found")
        return {
            "institution": target.institution,
            "document_type": target.document_type,
            "supported_extensions": target.supported_extensions or [],
            "fields": target.fields or [],
            "sample_file": target.sample_file,
            "version": target.version,
            "is_active": target.is_active,
            "source": "institution",
        }

    def template_history(self, institution: str, document_type: str) -> list[dict]:
        history = self.repository.list_template_history(
            institution=institution.strip(), document_type=document_type.strip().lower()
        )
        return [
            {
                "institution": item.institution,
                "document_type": item.document_type,
                "supported_extensions": item.supported_extensions or [],
                "fields": item.fields or [],
                "sample_file": item.sample_file,
                "version": item.version,
                "is_active": item.is_active,
                "source": "institution",
            }
            for item in history
        ]

    def apply_corrections(
        self, file_id: str, corrections: list[dict], auto_store: bool = False
    ) -> tuple[IngestionJob, int | None]:
        job = self.repository.get_job(file_id)
        if not job:
            raise HTTPException(status_code=404, detail="File not found")
        if not job.extracted_payload:
            raise HTTPException(status_code=409, detail="No extracted payload available to correct")

        rows = list(job.extracted_payload)
        for correction in corrections:
            row_index = int(correction["row_index"])
            field = str(correction["field"])
            value = correction["value"]
            if row_index < 0 or row_index >= len(rows):
                raise HTTPException(status_code=400, detail=f"Invalid row_index: {row_index}")
            rows[row_index][field] = value

        anomalies = validate_records(job.document_type, rows)
        job.extracted_payload = rows
        job.anomalies = [item.model_dump() for item in anomalies]
        job.status = "validated" if not anomalies else "needs_review"
        job.processing_stage = "validated" if not anomalies else "review"
        self.repository.save_job(job)

        stored_count = None
        if auto_store and not anomalies:
            _, stored_count = self.store_document(job.id)

        return job, stored_count

    # ── Demo scenarios (pre-built data for hackathon demonstrations) ──────────

    _DEMO_SCENARIOS: dict[str, dict] = {
        "academic": {
            "document_type": "grades",
            "institution": "EPT",
            "filename": "demo_grades_EPT_S1_2025.csv",
            # Many failing grades → success_rate ~38% → triggers CRITICAL alert
            "rows": [
                *[{"student_id": f"EPT{i:03d}", "subject": "Mathématiques", "grade": g, "semester": "S1_2025"}
                  for i, g in enumerate([6.5, 4.0, 8.5, 11.0, 5.5, 9.0, 3.5, 7.0, 12.5, 6.0,
                                          5.0, 8.0, 4.5, 10.5, 6.5, 7.5, 3.0, 9.5, 5.5, 11.0])],
                *[{"student_id": f"EPT{i+20:03d}", "subject": "Physique", "grade": g, "semester": "S1_2025"}
                  for i, g in enumerate([7.5, 5.0, 9.0, 11.5, 4.0, 8.0, 6.5, 10.0, 3.0, 12.0])],
            ],
        },
        "finance": {
            "document_type": "finance",
            "institution": "INSAT",
            "filename": "demo_budget_INSAT_2025.csv",
            # spending > allocation → budget_execution_rate 108% → triggers CRITICAL alert
            "rows": [
                {"institution": "INSAT", "allocated": 2500000, "spent": 2700000, "fiscal_year": "2025", "department": "Direction Générale"},
                {"institution": "INSAT", "allocated": 800000, "spent": 870000, "fiscal_year": "2025", "department": "Département Informatique"},
                {"institution": "INSAT", "allocated": 600000, "spent": 640000, "fiscal_year": "2025", "department": "Département Génie Civil"},
            ],
        },
        "hr": {
            "document_type": "hr",
            "institution": "FSB",
            "filename": "demo_rh_FSB_S1_2025.csv",
            # absent_days / total_days = 22% → triggers CRITICAL absenteeism alert
            "rows": [
                {"staff_type": "teaching", "headcount": 48, "absent_days": 950, "total_days": 9600,
                 "teaching_hours": 19200, "left_count": 4, "semester": "S1_2025"},
                {"staff_type": "admin", "headcount": 21, "absent_days": 420, "total_days": 4200,
                 "teaching_hours": 0, "left_count": 2, "semester": "S1_2025"},
            ],
        },
        "esg": {
            "document_type": "esg",
            "institution": "IHEC",
            "filename": "demo_esg_IHEC_2025.csv",
            # accessibility_score 52% < 60% norm → triggers WARNING
            "rows": [
                {"energy_consumption_kwh": 492000, "carbon_footprint_tons": 49.2,
                 "recycling_rate": 21.5, "green_spaces_sqm": 1200,
                 "sustainable_mobility_pct": 34.0, "accessibility_score": 52.0,
                 "waste_produced_tons": 18.3, "water_consumption_m3": 28500, "fiscal_year": "2025"},
            ],
        },
        "research": {
            "document_type": "research",
            "institution": "SUPCOM",
            "filename": "demo_recherche_SupCom_2025.csv",
            # clean data — no alerts, just shows ingestion works
            "rows": [
                {"publications_count": 34, "active_projects": 14, "funding_secured_tnd": 520000,
                 "phd_students": 52, "patents_filed": 4, "international_collaborations": 8,
                 "national_collaborations": 11, "conferences_attended": 23, "academic_year": "2025-2026"},
            ],
        },
        "employment": {
            "document_type": "employment",
            "institution": "ESAC",
            "filename": "demo_emploi_ESAC_2025.csv",
            # employability_rate_6m 41% < 50% → triggers WARNING
            "rows": [
                {"graduates_total": 205, "employed_within_6months": 84, "employed_within_12months": 148,
                 "avg_months_to_employment": 8.2, "national_employment_pct": 76.0,
                 "international_employment_pct": 14.0, "self_employed_pct": 10.0, "graduation_year": "2025"},
            ],
        },
    }

    def demo_trigger(self, scenario: str) -> IngestionJob:
        """
        Create and fully process a pre-built demo job without requiring a file upload.
        Used by the hackathon demo mode in the frontend.
        """
        config = self._DEMO_SCENARIOS.get(scenario.lower())
        if config is None:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown scenario '{scenario}'. Valid: {list(self._DEMO_SCENARIOS)}",
            )

        job = IngestionJob(
            id=str(uuid4()),
            institution=config["institution"],
            document_type=config["document_type"],
            filename=config["filename"],
            status="uploaded",
            processing_stage="parsed",
            extraction_quality=95,
            extracted_payload=config["rows"],
            anomalies=[],
        )
        job = self.repository.create_job(job)

        # Validate
        anomalies = validate_records(job.document_type, job.extracted_payload or [])
        job.anomalies = [a.model_dump() for a in anomalies]
        job.status = "validated" if not anomalies else "needs_review"
        job.processing_stage = "validated"
        self.repository.save_job(job)

        # Store → formula engine → platform bridge
        self.store_document(job.id)
        return self.repository.get_job(job.id) or job

    def get_ops_summary(self, institution: str | None = None) -> dict:
        jobs = self.repository.list_jobs(limit=1000)
        if institution:
            jobs = [job for job in jobs if job.institution == institution]
        summary = {
            "total_jobs": len(jobs),
            "queued": 0,
            "processing": 0,
            "needs_review": 0,
            "validated": 0,
            "stored": 0,
            "failed": 0,
        }
        for job in jobs:
            status = (job.status or "").lower()
            if status in summary:
                summary[status] += 1
        return summary
