# Data Model Brainstorm

## Core Entities

### Institution
```
Institution {
  id: UUID
  name: string
  code: string          // e.g. "ENIM", "ISET_TUNIS"
  type: enum            // University | ISET | ENET | ESC | ...
  city: string
  student_count: int
  created_at: timestamp
  schema_name: string   // PostgreSQL schema for tenant isolation
}
```

### KPI Definition (shared schema)
```
KPIDefinition {
  id: UUID
  code: string          // e.g. "ACADEMIC_SUCCESS_RATE"
  name_fr: string
  name_ar: string
  module: enum          // ACADEMIC | FINANCE | HR | RESEARCH | ...
  unit: string          // %, DT, count, hours
  aggregation: enum     // AVG | SUM | LAST
  alert_threshold_low: float
  alert_threshold_high: float
  target_value: float
}
```

### KPI Value (per tenant schema, time-series)
```
KPIValue {
  id: UUID
  kpi_definition_id: UUID
  institution_id: UUID
  value: float
  period: date          // e.g. 2026-01-01 (semester/month/year)
  period_type: enum     // SEMESTER | MONTH | YEAR
  source: enum          // MANUAL | IMPORT | API | CALCULATED
  created_at: timestamp
  created_by: UUID
}
```

### Alert
```
Alert {
  id: UUID
  institution_id: UUID
  kpi_definition_id: UUID
  severity: enum        // CRITICAL | WARNING | INFO
  title: string
  description: string   // AI-generated plain language explanation
  kpi_value: float
  threshold_value: float
  status: enum          // ACTIVE | ACKNOWLEDGED | RESOLVED | DISMISSED
  triggered_at: timestamp
  resolved_at: timestamp
  recommendation: string // AI-generated action suggestion
}
```

### Prediction
```
Prediction {
  id: UUID
  institution_id: UUID
  kpi_definition_id: UUID
  predicted_value: float
  confidence: float     // 0.0 - 1.0
  prediction_date: date // when the prediction is for
  generated_at: timestamp
  model_version: string
  explanation: string   // why this prediction was made
}
```

### Report
```
Report {
  id: UUID
  institution_id: UUID  // null = consolidated cross-institution
  type: enum            // WEEKLY | MONTHLY | ANNUAL | CUSTOM
  scope_modules: string[] // which modules are included
  period_start: date
  period_end: date
  status: enum          // GENERATING | READY | FAILED
  file_url: string      // S3/MinIO path
  generated_at: timestamp
  ai_narrative: boolean
}
```

### User
```
User {
  id: UUID
  email: string
  name: string
  role: enum            // SUPER_ADMIN | INSTITUTION_ADMIN | DEAN | STAFF | VIEWER
  institution_ids: UUID[] // can belong to multiple institutions
  language: enum        // FR | AR
  created_at: timestamp
}
```

### DataIngestionJob
```
DataIngestionJob {
  id: UUID
  institution_id: UUID
  module: enum
  source_type: enum     // EXCEL | PDF | CSV | API
  file_url: string
  status: enum          // PENDING | PROCESSING | REVIEW | COMPLETED | FAILED
  records_extracted: int
  records_validated: int
  records_rejected: int
  confidence_avg: float
  created_at: timestamp
  completed_at: timestamp
}
```

---

## Module-Specific Tables (examples)

### Academic Module
```
StudentCohort {
  id, institution_id, program_id, academic_year,
  enrolled_count, active_count, dropout_count,
  success_count, repeat_count
}

ExamSession {
  id, institution_id, subject_id, semester,
  registered_count, present_count, pass_count,
  avg_grade, grade_distribution: jsonb
}
```

### Finance Module
```
BudgetLine {
  id, institution_id, department, category,
  fiscal_year, allocated_amount, consumed_amount,
  last_updated
}
```

### HR Module
```
StaffRecord {
  id, institution_id, type (TEACHING | ADMIN),
  full_time_equivalent, contract_type,
  teaching_hours_assigned, teaching_hours_done,
  absences_count, trainings_completed
}
```

---

## Cross-Institution Aggregation View

```sql
-- Example: consolidated success rate across all institutions
CREATE MATERIALIZED VIEW consolidated_kpi_summary AS
SELECT
  kd.code,
  kd.module,
  AVG(kv.value) as network_avg,
  MIN(kv.value) as network_min,
  MAX(kv.value) as network_max,
  COUNT(DISTINCT kv.institution_id) as institution_count,
  kv.period,
  kv.period_type
FROM kpi_values kv
JOIN kpi_definitions kd ON kv.kpi_definition_id = kd.id
GROUP BY kd.code, kd.module, kv.period, kv.period_type;
```

---

## Data Retention Policy
- Raw KPI values: 10 years
- Alert history: 5 years
- Predictions: 2 years (rolling)
- Generated reports: 7 years (regulatory)
- Ingestion job logs: 3 years
