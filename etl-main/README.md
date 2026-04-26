# UCAR ETL Platform (Track 1 Focus)

Track 1 backend prototype for UCAR data ingestion and structuring.  
The platform currently delivers a complete ingestion lifecycle:

- `upload`: parse incoming dataset files
- `validate`: run document-type validation rules
- `store`: persist records into structured storage
- `jobs`: trace pipeline status and results
- `upload-async`: queue large files and process in background

## Current Supported Input

- File formats: `.csv`, `.txt` (CSV-like), `.json`, `.xlsx`, `.pdf`, `.png`, `.jpg`, `.jpeg`
- Document types with dedicated rules:
  - `grades`: checks `student_id`, `subject`, and `grade` range (0..20)
  - `budget`: checks non-negative fields and `spent <= allocated`
  - Any other type uses generic structural validation

## OCR & Multilingual Extraction

Binary documents (`pdf`, `png`, `jpg`, etc.) now use a layered OCR strategy:

1. `pdfplumber` for text-based PDFs
2. `paddleocr` (optional if installed) for scanned pages/images
3. `easyocr` (optional if installed) for harder handwritten-like image text
4. `pytesseract` (`ara+fra+eng`) fallback for images
5. Optional Groq VLM structuring pass (if `GROQ_API_KEY` is provided)
6. Heuristic local structuring fallback (`grades` / `budget`)

Structured spreadsheets (`.xlsx`) are parsed directly via `pandas + openpyxl`.

Sync and async upload paths now both use the same binary-aware extraction pipeline.

### Groq setup (optional but recommended)

Set environment variables:

- `GROQ_API_KEY=<your_key>`
- `GROQ_VLM_MODEL=meta-llama/llama-4-scout-17b-16e-instruct` (default)

Runtime diagnostic endpoint:

- `GET /api/ops/ocr-runtime`

## Clean Architecture

- `backend/app/api`: route contracts and HTTP mapping
- `backend/app/services`: parsing, validation, orchestration
- `backend/app/repositories`: persistence abstraction
- `backend/app/domain`: SQLAlchemy entities
- `backend/app/schemas`: API DTOs
- `backend/app/core`: config and database infrastructure

## API Endpoints

- `POST /api/upload` (multipart): `file`, `institution`, optional `document_type`
- `POST /api/upload-async` (multipart): same fields + `auto_store`
- `POST /api/upload-batch` (multipart): `files[]`, `institution`, optional `document_type`, `auto_store`
- `POST /api/validate` (json): `{ "file_id": "..." }`
- `POST /api/store` (json): `{ "file_id": "..." }`
- `GET /api/jobs?limit=50`
- `GET /api/jobs/{file_id}`
- `GET /api/jobs/{file_id}/explanation?include_llm=false` (pipeline decision trace)
- `GET /api/templates` (recommended fields per document type)
- `GET /api/templates/registry` (DB-backed institution templates)
- `POST /api/templates/registry` (upsert institution template)
- `POST /api/templates/registry/deactivate` (deactivate active template)
- `GET /api/templates/registry/history` (template version history)
- `POST /api/review/apply-corrections` (human-in-the-loop correction)
- `GET /api/ops/summary` (operational ingestion overview)
- `GET /api/schema/suggestions/{file_id}` (schema correction suggestions)
- `GET /api/audit-logs?limit=100` (admin/auditor)
- `GET /health`
- `GET /` lightweight demo UI
- `GET /ui` static UI route

If `document_type` is omitted at upload time, backend auto-detects
from filename and extracted columns (`grades`, `budget`, else `generic`).

Grades validation also includes warning-level distribution checks to surface
suspicious patterns (e.g., unusually low variance, extreme value concentration).

## Durable Queue (Redis Worker)

Async upload now supports a Redis-backed durable queue:

- Set `QUEUE_BACKEND=redis`
- Set `REDIS_URL=redis://<host>:6379/0`
- Set `REDIS_QUEUE_NAME=ingestion`
- Run worker: `python -m app.worker`

`/api/upload-async` and `/api/upload-batch` enqueue jobs to Redis when available,
with automatic fallback to in-process background tasks when Redis is unavailable.

Explainability endpoint details:
- Returns step-by-step reasoning for: document understanding, schema selection,
  validation outcomes, correction path, and final decision.
- Optional `include_llm=true` adds a natural-language explanation generated via Groq
  when `GROQ_API_KEY` is configured (falls back safely when unavailable).

## Authentication & RBAC (Hardening Layer)

All `/api/*` routes now require `Authorization: Bearer ...`.

Primary auth flow (recommended):

- `POST /api/auth/login` with `username` + `password`
- Use returned `access_token` as bearer token
- `GET /api/auth/me` to inspect current user profile
- `GET /api/auth/users` (admin)
- `POST /api/auth/users` (admin create user)
- `PATCH /api/auth/users/{username}` (admin update role/institution/status)
- `POST /api/auth/change-password` (self-service)

Demo accounts:

- `admin1 / admin123`
- `dean_isi / dean123`
- `prof_math / prof123`
- `data_mgr / data123`
- `auditor1 / audit123`

Legacy fallback:

- `Bearer username:role:institution` remains accepted for compatibility.

Supported roles:

- `admin`
- `dean`
- `professor`
- `data_officer`
- `auditor`

Access behavior:

- `admin`: all institutions
- non-admin users: job listing/details are limited to their own institution
- write actions (`upload`, `validate`, `store`) are restricted by role
- audit logs endpoint is restricted to `admin` and `auditor`
- template registry writes are restricted to `admin`, `dean`, `data_officer` (institution-scoped for non-admin)

## Institution Template Registry (Persisted in DB)

You can register institution-specific templates to override defaults.

`POST /api/templates/registry`

```json
{
  "institution": "ISITCOM",
  "document_type": "grades",
  "supported_extensions": [".csv", ".json"],
  "fields": [
    { "name": "student_id", "required": true, "description": "Unique ID" },
    { "name": "subject", "required": true, "description": "Course name" },
    { "name": "grade", "required": true, "description": "0..20" }
  ],
  "sample_file": "samples/grades.csv"
}
```

`GET /api/templates` now returns merged templates:
- default global templates
- institution overrides from database (if present)

### Template lifecycle behavior

- Upserting an existing template creates a **new version**.
- Previous active version is automatically deactivated.
- Deactivation keeps historical records for auditability.

## Standard Error Contract

All errors follow:

```json
{
  "error": {
    "code": "HTTP_403",
    "message": "Insufficient role permissions",
    "details": {
      "path": "/api/store"
    }
  }
}
```

Core error codes:

- `HTTP_401`, `HTTP_403`, `HTTP_404`, `HTTP_409`
- `REQUEST_VALIDATION_ERROR`
- `INTERNAL_SERVER_ERROR`

## Quick Start

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger UI: <http://127.0.0.1:8000/docs>
Demo UI: <http://127.0.0.1:8000/>

### React Frontend (new)

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: <http://127.0.0.1:5173>

## Demo Flow (Ready for presentation)

1. Upload a sample dataset through `/api/upload`.
2. Validate it using returned `file_id` on `/api/validate`.
3. Store valid data through `/api/store`.
4. Show traceability via `/api/jobs` and `/api/jobs/{file_id}`.

### Async demo

1. Open `/` and queue a file with `upload-async`.
2. Monitor stages (`queued -> processing -> validated/stored`).
3. Inspect anomalies or failures through `GET /api/jobs/{file_id}`.
4. Apply corrections through `POST /api/review/apply-corrections` when anomalies exist.

## Tests

```bash
set PYTHONPATH=backend
pytest -q
```

## Demo Sample Files

- `samples/grades.csv`
- `samples/budget.csv`

Use these directly in `/` demo UI or `/api/upload-async`.

## Important Upgrade Note

If you already had a previous `ucar_etl.db` created before this final polish, remove it once
so SQLAlchemy can recreate tables with new tracking columns (`processing_stage`, `processing_error`, `source_path`).

## Next Roadmap (Track 1 extension)

1. Real OCR provider integration (PaddleOCR/Tesseract adapters).
2. Multi-file batch endpoint with job group tracking.
3. Institution-specific schema mapping persistence.
4. Automated anomaly suggestions using LLM normalization.
