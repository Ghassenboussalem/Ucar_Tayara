# AI Engine Deep Dive — 2026 Architecture

## Philosophy
> "Not one AI. A society of specialized agents that collaborate, debate, and escalate."

In 2026, the right architecture isn't a single LLM answering questions.
It's an **orchestrated multi-agent system** where each agent owns a domain,
uses the right retrieval strategy for its data type, and hands off to peers when needed.

---

## Agent Roster

### 1. OrchestratorAgent (The Router)
**Role:** Entry point for all user requests. Understands intent, routes to the right specialist agent, aggregates responses.

**Capabilities:**
- Intent classification: Is this a query? An alert investigation? A report request? A what-if simulation?
- Multi-agent fan-out: can call multiple agents in parallel and merge results
- Conflict resolution: if two agents give contradictory answers, escalates to user
- Memory: maintains conversation context across turns (short-term + long-term)

**Model:** Fast, cheap model for routing (GPT-4o-mini / Mistral-Small) + tool-calling

**Tools available:**
- `route_to_agent(agent_name, query)`
- `fan_out(agents[], query)` — parallel calls
- `get_conversation_history(session_id)`
- `escalate_to_human(reason)`

---

### 2. KPIAnalystAgent
**Role:** Answers quantitative questions about KPI data across institutions.

**Capabilities:**
- Text-to-SQL over the KPI database
- Cross-institution comparison queries
- Trend analysis (delta, moving average, YoY)
- Threshold breach detection

**RAG Strategy:** Structured RAG (Text-to-SQL)
- Retrieves from: PostgreSQL KPI tables, TimescaleDB time-series
- Uses schema-aware prompting (knows the exact table/column structure)
- Validates SQL before execution (no hallucinated column names)

**Example queries it handles:**
- "Quel est le taux d'abandon moyen sur le réseau UCAR ce semestre ?"
- "Quels sont les 3 établissements avec le meilleur taux de réussite ?"
- "Compare le budget consommé de l'ENIM vs l'ISET sur les 6 derniers mois"

**Model:** GPT-4o or Mistral-Large (needs strong SQL generation)

---

### 3. AlertInvestigatorAgent
**Role:** When an anomaly is detected, this agent digs into root causes and generates actionable explanations.

**Capabilities:**
- Correlates the anomalous KPI with related KPIs (e.g., dropout spike → check attendance, exam results, scholarship data)
- Searches historical alerts for similar past events
- Generates plain-language root cause hypothesis
- Suggests concrete remediation actions

**RAG Strategy:** Hybrid RAG
- Vector search over: past alert resolutions, institutional reports, best practice documents
- Structured query: pulls correlated KPI values from DB
- Combines both to generate grounded explanation

**Example output:**
```
Alert: Dropout rate at ISET Tunis jumped from 6.1% to 9.8% (S1 2026)

Root cause hypothesis (confidence: 71%):
Correlated signals detected:
  - Attendance rate dropped 14% in the same period
  - Scholarship processing time increased from 12 to 34 days
  - Residence occupancy at 94% (210 students on waitlist)

Similar past event: ISET Sfax, S2 2023 — resolved by emergency scholarship
processing + temporary housing allocation.

Recommended actions:
  1. Expedite pending scholarship applications (89 in queue)
  2. Activate emergency housing protocol
  3. Schedule academic support sessions for at-risk cohorts
```

**Model:** GPT-4o with function calling + retrieval

---

### 4. ForecastAgent
**Role:** Generates predictions and runs what-if simulations.

**Capabilities:**
- Time-series forecasting per KPI per institution
- Scenario simulation ("what if budget is cut by 15%?")
- Risk scoring (probability × impact matrix)
- Confidence interval generation

**RAG Strategy:** No traditional RAG — uses ML models directly
- Prophet / NeuralProphet for time-series
- Gradient boosting (XGBoost/LightGBM) for multi-variate risk scoring
- LLM layer only for generating the plain-language explanation of the forecast

**Unique feature — Causal Graph:**
- Maintains a causal graph of KPI relationships
- e.g., budget cut → teaching load increase → satisfaction drop → dropout risk
- Allows multi-hop "what-if" reasoning

---

### 5. ReportWriterAgent
**Role:** Generates narrative synthesis reports from structured data.

**Capabilities:**
- Pulls KPI data for the requested scope (institution + module + period)
- Structures the narrative: executive summary → key findings → alerts → recommendations
- Bilingual output (French + Arabic)
- Exports to PDF and Excel

**RAG Strategy:** Template RAG + Data RAG
- Retrieves: report templates, previous reports for style consistency
- Injects: live KPI data, active alerts, predictions
- Uses few-shot examples from past approved reports to match institutional tone

**Output structure:**
```
1. Résumé Exécutif (3 bullet points max)
2. Indicateurs Clés — tableau comparatif
3. Alertes Actives — avec explications
4. Tendances & Prévisions
5. Recommandations Prioritaires
6. Annexes (données brutes)
```

**Model:** GPT-4o or Claude 3.5 Sonnet (best for long-form structured writing)

---

### 6. DocumentIntelligenceAgent
**Role:** Processes uploaded documents (PDF, Excel, scanned images) and extracts structured data.

**Capabilities:**
- OCR for scanned Arabic/French documents
- Table extraction from PDFs and Excel files
- Field mapping to the unified data model
- Confidence scoring per extracted field
- Flags ambiguous fields for human review

**RAG Strategy:** Multimodal RAG
- Vision model (GPT-4o Vision / LLaVA) for scanned documents
- Schema-aware extraction: knows the target data model fields
- Retrieves: field mapping rules, past extraction examples for similar document types

**Pipeline:**
```
Upload → OCR → Vision LLM extraction → Schema mapping →
Confidence scoring → Human review queue (if confidence < 0.85) →
Validated → DB ingestion
```

---

### 7. BenchmarkAgent
**Role:** Compares institutions against each other and against external benchmarks.

**Capabilities:**
- Peer grouping (cluster similar institutions for fair comparison)
- Gap analysis ("ISET Tunis is 23% below network average on employability")
- Best practice identification ("ESPRIT leads on student satisfaction — here's why")
- External benchmark comparison (national averages, international standards)

**RAG Strategy:** Knowledge Graph RAG
- Maintains a knowledge graph of institution profiles, KPI histories, and relationships
- Graph traversal to find "most similar" institutions for peer comparison
- Vector search over external benchmark documents (OECD, UNESCO education reports)

---

### 8. StrategicAdvisorAgent
**Role:** High-level strategic reasoning for presidents and deans.

**Capabilities:**
- Synthesizes signals across all modules into strategic insights
- Identifies systemic risks (not just individual KPI anomalies)
- Connects institutional performance to national/international context
- Generates strategic recommendations aligned with the institution's declared objectives

**RAG Strategy:** Multi-source RAG
- Retrieves from: strategic plan documents, ministry directives, accreditation requirements
- Cross-references: KPI trends, alert history, benchmark data
- Uses chain-of-thought reasoning to connect dots across domains

**Example output:**
```
Strategic Risk Assessment — ENIM — Q1 2026

Systemic risk identified: ENIM shows correlated degradation across 3 domains:
  - Teaching load at 96% capacity (HR)
  - ABET accreditation renewal due in 5 months (Pedagogy)
  - Budget execution at 87% with 4 months remaining (Finance)

These three signals together suggest a capacity crisis that could jeopardize
accreditation renewal if not addressed in the next 60 days.

Strategic recommendation: Convene emergency steering committee.
Priority actions: (1) Fast-track 5 FTE hires, (2) Reallocate 8% budget
from infrastructure to HR, (3) Assign dedicated ABET preparation team.
```

---

## Multi-RAG Strategy Overview

| Agent | RAG Type | Data Sources |
|---|---|---|
| KPIAnalystAgent | Structured RAG (Text-to-SQL) | PostgreSQL, TimescaleDB |
| AlertInvestigatorAgent | Hybrid RAG (vector + SQL) | Past alerts, reports, KPI DB |
| ForecastAgent | ML models + LLM explanation | Time-series DB, causal graph |
| ReportWriterAgent | Template RAG + Data RAG | Report templates, live KPI data |
| DocumentIntelligenceAgent | Multimodal RAG | Uploaded docs, schema definitions |
| BenchmarkAgent | Knowledge Graph RAG | Institution profiles, external benchmarks |
| StrategicAdvisorAgent | Multi-source RAG | Strategic plans, ministry docs, KPI trends |

---

## RAG Infrastructure

### Vector Store
- **pgvector** (PostgreSQL extension) — keeps everything in one DB
- Alternatively: **Qdrant** for high-volume semantic search
- Embeddings model: **text-embedding-3-large** (OpenAI) or **multilingual-e5-large** (open source, handles French + Arabic)

### Knowledge Graph
- **Neo4j** or **Apache AGE** (PostgreSQL graph extension)
- Nodes: Institution, KPI, Alert, Program, Staff, Report
- Edges: affects, correlates_with, triggers, belongs_to, similar_to

### Document Store
- **MinIO** (S3-compatible) for raw files
- Extracted text + metadata stored in PostgreSQL with vector embeddings

### Retrieval Pipeline
```
Query → Query rewriting (LLM) → Parallel retrieval:
  ├── Vector search (semantic similarity)
  ├── SQL query (structured data)
  └── Graph traversal (relationships)
        │
        ▼
  Reranking (cross-encoder model)
        │
        ▼
  Context assembly → LLM generation → Response
```

---

## Agent Orchestration Pattern

```
User Query
    │
    ▼
OrchestratorAgent
    │
    ├── Simple KPI question → KPIAnalystAgent
    ├── Alert investigation → AlertInvestigatorAgent + KPIAnalystAgent (parallel)
    ├── Report request → ReportWriterAgent + KPIAnalystAgent (parallel)
    ├── What-if simulation → ForecastAgent
    ├── Document upload → DocumentIntelligenceAgent
    ├── Benchmark request → BenchmarkAgent + KPIAnalystAgent (parallel)
    └── Strategic question → StrategicAdvisorAgent (calls all others as sub-agents)
```

**Framework:** LangGraph (2026 standard for stateful multi-agent workflows)
- Nodes = agents
- Edges = routing decisions
- State = shared context passed between agents
- Checkpointing = conversation memory persisted to DB

---

## Memory Architecture

### Short-term Memory (per session)
- Conversation history (last 20 turns)
- Active context: which institution, which module, which time period
- Stored in: Redis (TTL: 24 hours)

### Long-term Memory (per user)
- User preferences (language, preferred KPIs, notification settings)
- Past queries and their resolutions
- Stored in: PostgreSQL

### Institutional Memory (per institution)
- Past alerts and how they were resolved
- Past reports and their narratives
- Strategic decisions and their outcomes
- Stored in: PostgreSQL + vector embeddings in pgvector

---

## Explainability Layer

Every AI output MUST include:
```json
{
  "answer": "Le taux d'abandon est de 9.8%",
  "confidence": 0.94,
  "sources": [
    { "type": "sql_query", "query": "SELECT ...", "result": "9.8%" },
    { "type": "vector_search", "document": "Rapport S1 2026", "relevance": 0.87 }
  ],
  "reasoning_steps": [
    "Queried KPI table for dropout rate at ISET Tunis, S1 2026",
    "Found value: 9.8% (up from 6.1% in S2 2025)",
    "Cross-referenced with attendance data to confirm correlation"
  ],
  "agent": "KPIAnalystAgent",
  "latency_ms": 340
}
```

---

## Guardrails & Safety

- **Hallucination prevention:** all factual claims must be grounded in retrieved data — no generation without retrieval
- **Tenant isolation:** agents are initialized with institution context — cannot query other tenants' data
- **Sensitive data:** HR individual records never surfaced in responses — only aggregates
- **Human-in-the-loop:** all AI-generated reports require human approval before sending
- **Audit log:** every agent call, retrieval, and generation is logged with full trace
- **Fallback:** if confidence < 0.6, agent responds "Je n'ai pas assez de données fiables pour répondre" instead of guessing
