# Technical Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
│   Web App (React)  │  Mobile (React Native)  │  PDF/Excel│
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                          │
│         Auth (JWT/OAuth2) + Rate Limiting               │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                  BACKEND SERVICES                       │
│  KPI Service │ Alert Service │ Report Service │ AI Service│
│  Auth Service│ Module APIs   │ Ingestion Service         │
└─────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────────┐
│                    DATA LAYER                           │
│  PostgreSQL (multi-tenant) │ Redis (cache) │ S3 (files) │
│  TimescaleDB (time-series) │ Vector DB (AI/RAG)         │
└─────────────────────────────────────────────────────────┘
```

## Multi-Tenancy Strategy

**Approach: Schema-per-tenant (PostgreSQL)**
- Each institution gets its own schema: `ucar_enim`, `ucar_iset_tunis`, etc.
- Shared schema for cross-institution aggregation: `ucar_consolidated`
- Row-level security (RLS) as a second layer of isolation
- Single deployment, horizontally scalable

**Why not database-per-tenant?**
- 30+ institutions = 30+ databases = operational nightmare
- Schema isolation gives strong enough separation with much lower overhead

## Tech Stack

### Frontend
- **React + TypeScript** — component-based, maintainable
- **Tailwind CSS** — fast UI, consistent design system
- **Recharts / Apache ECharts** — KPI visualizations, charts
- **i18next** — French + Arabic (RTL support)
- **React Query** — server state management

### Backend
- **Node.js + Express** or **Python FastAPI** — REST APIs
- **PostgreSQL** — primary relational store (multi-tenant schemas)
- **Redis** — caching KPI aggregations, session management
- **TimescaleDB** — time-series KPI history (extends PostgreSQL)
- **Celery + Redis** — async task queue (report generation, alerts)

### AI / ML
- **Python** — all ML workloads
- **Facebook Prophet** — time-series forecasting
- **scikit-learn** — anomaly detection, classification
- **LangChain + OpenAI / Mistral** — NL query interface, report generation
- **PaddleOCR / Tesseract** — document ingestion
- **pgvector** — vector embeddings for RAG

### Infrastructure
- **Docker + Docker Compose** — local dev
- **Kubernetes** — production orchestration
- **Nginx** — reverse proxy
- **MinIO / S3** — file storage (uploaded documents, generated reports)
- **GitHub Actions** — CI/CD

## Data Flow: KPI Ingestion

```
Source Data (Excel/PDF/API/Manual Form)
        │
        ▼
  Ingestion Service
  (OCR + validation + normalization)
        │
        ▼
  Staging Table (per tenant schema)
        │
        ▼
  KPI Calculation Engine
  (aggregations, ratios, deltas)
        │
        ▼
  KPI Store (TimescaleDB)
        │
   ┌────┴────┐
   ▼         ▼
Dashboard  Alert Engine
           (anomaly detection)
```

## Security Considerations
- JWT tokens with institution-scoped claims
- All API routes enforce tenant context
- Audit log for every data write operation
- Encrypted at rest (PostgreSQL TDE)
- HTTPS only, HSTS enforced
- Role-based access control (RBAC): President / Dean / Staff / Viewer

## Scalability Plan
- Horizontal scaling of API services via Kubernetes HPA
- Read replicas for heavy dashboard queries
- Redis caching for KPI aggregations (TTL: 5 minutes)
- Async report generation (never blocks UI)
- CDN for static assets
