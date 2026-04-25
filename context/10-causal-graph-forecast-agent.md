# Causal Graph for ForecastAgent

## Why a Causal Graph?

Standard time-series forecasting (Prophet, LSTM) answers:
> "Based on past values of X, what will X be next month?"

A causal graph answers:
> "If Y changes, what happens to X — and what happens to everything downstream of X?"

This is the difference between **correlation-based prediction** and **causal reasoning**.
In a university context, KPIs don't live in isolation. A budget cut doesn't just affect finance —
it ripples through HR, pedagogy, student life, and eventually academic outcomes.
The causal graph makes those ripples explicit and computable.

---

## Graph Structure

### Node Types

```
KPINode {
  id: string              // e.g. "ACADEMIC_DROPOUT_RATE"
  label_fr: string
  label_ar: string
  module: enum
  current_value: float
  unit: string
  is_root_cause: boolean  // can be externally set (budget, policy)
  is_outcome: boolean     // terminal node (e.g. student success)
}
```

### Edge Types

```
CausalEdge {
  from: KPINode
  to: KPINode
  direction: "positive" | "negative"
  // positive = increase in FROM causes increase in TO
  // negative = increase in FROM causes decrease in TO
  strength: float         // 0.0 to 1.0 (learned from historical data)
  lag_months: int         // how many months before effect is felt
  confidence: float       // how well-established is this causal link
  evidence: string[]      // references to studies / historical observations
}
```

---

## The Full Causal Graph

### Domain: Finance → Everything

```
BUDGET_ALLOCATED
    │ positive (lag: 0)
    ▼
BUDGET_CONSUMED_RATIO ──negative──► BUDGET_DEVIATION_ALERT
    │
    ├── negative (lag: 1) ──► HR_VACANCY_RATE
    │                              │ negative (lag: 2)
    │                              ▼
    │                         TEACHING_LOAD_PER_FACULTY
    │                              │ negative (lag: 1)
    │                              ▼
    │                         PEDAGOGICAL_QUALITY_SCORE
    │                              │ negative (lag: 2)
    │                              ▼
    │                         STUDENT_SATISFACTION
    │                              │ negative (lag: 1)
    │                              ▼
    │                         ACADEMIC_DROPOUT_RATE ◄──────────┐
    │                                                           │
    ├── negative (lag: 2) ──► INFRASTRUCTURE_MAINTENANCE_SCORE │
    │                              │ negative (lag: 3)          │
    │                              ▼                            │
    │                         EQUIPMENT_AVAILABILITY            │
    │                              │ negative (lag: 1)          │
    │                              ▼                            │
    │                         LAB_OCCUPANCY_RATE ───────────────┘
    │
    └── negative (lag: 1) ──► SCHOLARSHIP_PROCESSING_TIME
                                   │ positive (lag: 1)
                                   ▼
                              STUDENT_FINANCIAL_STRESS_INDEX
                                   │ positive (lag: 1)
                                   ▼
                              ACADEMIC_DROPOUT_RATE
```

---

### Domain: HR → Academic Outcomes

```
STAFF_HEADCOUNT_TEACHING
    │ negative (lag: 0)
    ▼
TEACHING_LOAD_PER_FACULTY ──positive──► FACULTY_ABSENTEEISM_RATE
    │                                        │ positive (lag: 1)
    │                                        ▼
    │                                   COURSE_CANCELLATION_RATE
    │                                        │ positive (lag: 0)
    │                                        ▼
    │                                   EXAM_ATTENDANCE_RATE
    │                                        │ positive (lag: 0)
    │                                        ▼
    │                                   ACADEMIC_SUCCESS_RATE
    │
    ├── negative (lag: 1) ──► PEDAGOGICAL_INNOVATION_RATE
    │                              │ positive (lag: 2)
    │                              ▼
    │                         LMS_ADOPTION_RATE
    │                              │ positive (lag: 1)
    │                              ▼
    │                         STUDENT_ENGAGEMENT_SCORE
    │                              │ positive (lag: 1)
    │                              ▼
    │                         ACADEMIC_SUCCESS_RATE
    │
    └── positive (lag: 0) ──► ADJUNCT_FACULTY_RATIO
                                   │ negative (lag: 1)
                                   ▼
                              PROGRAM_ACCREDITATION_HEALTH
                                   │ positive (lag: 6)
                                   ▼
                              EMPLOYABILITY_RATE
```

---

### Domain: Student Life → Retention

```
RESIDENCE_OCCUPANCY_RATE
    │ positive (lag: 1) [when > 90% threshold]
    ▼
STUDENT_HOUSING_STRESS_INDEX
    │ positive (lag: 1)
    ▼
ACADEMIC_DROPOUT_RATE

SCHOLARSHIP_ACTIVE_COUNT
    │ negative (lag: 0)
    ▼
STUDENT_FINANCIAL_STRESS_INDEX
    │ positive (lag: 1)
    ▼
ACADEMIC_DROPOUT_RATE

STUDENT_CLUB_PARTICIPATION_RATE
    │ negative (lag: 2)
    ▼
STUDENT_ISOLATION_INDEX
    │ positive (lag: 1)
    ▼
PSYCHOLOGICAL_CONSULTATION_RATE
    │ positive (lag: 1)
    ▼
ACADEMIC_DROPOUT_RATE
```

---

### Domain: Research → Reputation → Enrollment

```
RESEARCH_PUBLICATIONS_COUNT
    │ positive (lag: 6)
    ▼
INSTITUTIONAL_RANKING_SCORE
    │ positive (lag: 3)
    ▼
ENROLLMENT_DEMAND_INDEX
    │ positive (lag: 1)
    ▼
STUDENT_QUALITY_INDEX
    │ positive (lag: 2)
    ▼
ACADEMIC_SUCCESS_RATE

RESEARCH_FUNDING_SECURED
    │ positive (lag: 2)
    ▼
RESEARCH_PROJECTS_ACTIVE
    │ positive (lag: 1)
    ▼
FACULTY_RESEARCH_ENGAGEMENT
    │ negative (lag: 1) [research load competes with teaching]
    ▼
TEACHING_LOAD_PER_FACULTY
```

---

### Domain: ESG → Wellbeing → Performance

```
ENERGY_CONSUMPTION_PER_STUDENT
    │ negative (lag: 0) [proxy for campus quality]
    ▼
CAMPUS_COMFORT_INDEX
    │ positive (lag: 1)
    ▼
STUDENT_SATISFACTION

CAMPUS_ACCESSIBILITY_SCORE
    │ positive (lag: 0)
    ▼
DISABLED_STUDENT_ENROLLMENT_RATE
    │ positive (lag: 1)
    ▼
DIVERSITY_INDEX
    │ positive (lag: 2)
    ▼
INSTITUTIONAL_RANKING_SCORE
```

---

### Domain: Partnerships → Employability

```
INTERNATIONAL_AGREEMENTS_ACTIVE
    │ positive (lag: 3)
    ▼
STUDENT_MOBILITY_OUTGOING
    │ positive (lag: 2)
    ▼
GRADUATE_INTERNATIONAL_EXPOSURE
    │ positive (lag: 1)
    ▼
EMPLOYABILITY_RATE

NATIONAL_AGREEMENTS_ACTIVE
    │ positive (lag: 2)
    ▼
INTERNSHIP_PLACEMENT_RATE
    │ positive (lag: 1)
    ▼
TIME_TO_EMPLOYMENT_POST_GRAD
    │ negative (lag: 0) [lower is better]
    ▼
EMPLOYABILITY_RATE
```

---

## Key Outcome Nodes (Terminal / Most Watched)

These are the nodes that presidents and deans care about most.
Everything else is a cause or intermediate variable.

| Outcome KPI | Driven by (top causes) |
|---|---|
| `ACADEMIC_DROPOUT_RATE` | Financial stress, housing stress, teaching load, engagement |
| `ACADEMIC_SUCCESS_RATE` | Teaching quality, attendance, engagement, equipment |
| `EMPLOYABILITY_RATE` | Partnerships, accreditation, program quality, mobility |
| `INSTITUTIONAL_RANKING_SCORE` | Research output, success rate, employability, ESG |
| `BUDGET_DEVIATION_ALERT` | Consumption rate, HR costs, infrastructure spend |

---

## How ForecastAgent Uses the Graph

### Step 1: Identify the target KPI
User asks: "What will the dropout rate at ISET Tunis look like in S2 2026?"

### Step 2: Traverse upstream causes
Graph traversal finds all nodes with a path to `ACADEMIC_DROPOUT_RATE`:
- `SCHOLARSHIP_PROCESSING_TIME` (lag: 2 months, strength: 0.72)
- `RESIDENCE_OCCUPANCY_RATE` (lag: 1 month, strength: 0.61)
- `TEACHING_LOAD_PER_FACULTY` (lag: 3 months, strength: 0.58)
- `STUDENT_CLUB_PARTICIPATION_RATE` (lag: 3 months, strength: 0.41)

### Step 3: Fetch current values of all upstream nodes
```python
upstream_values = {
  "SCHOLARSHIP_PROCESSING_TIME": 34,  # days (was 12 — alarming)
  "RESIDENCE_OCCUPANCY_RATE": 94,     # % (critical)
  "TEACHING_LOAD_PER_FACULTY": 384,   # hours (96% of limit)
  "STUDENT_CLUB_PARTICIPATION_RATE": 40  # % (stable)
}
```

### Step 4: Run causal propagation model
```python
# Weighted causal contribution to dropout rate
causal_score = sum(
  edge.strength * normalize(upstream_values[node]) * direction_sign
  for node, edge in upstream_edges
)

# Combine with time-series baseline forecast (Prophet)
baseline_forecast = prophet_model.predict(horizon=6_months)
causal_adjustment = causal_score * adjustment_factor

final_forecast = baseline_forecast + causal_adjustment
confidence = compute_confidence(causal_score, data_freshness)
```

### Step 5: Generate explanation
LLM receives the causal path + values and generates:
```
Prévision taux d'abandon ISET Tunis — S2 2026: 11.2% (↑ depuis 9.8%)
Confiance: 68%

Principaux facteurs causaux identifiés:
1. Délai de traitement des bourses: 34 jours (×2.8 vs normale)
   → Impact estimé: +1.8 points de taux d'abandon
2. Saturation des résidences: 94% d'occupation
   → Impact estimé: +0.9 points
3. Charge enseignante à 96% du plafond
   → Impact estimé: +0.5 points (effet différé 3 mois)

Sans intervention, le taux d'abandon pourrait atteindre 11-13% en S2 2026.
```

---

## What-If Simulation Engine

The causal graph enables counterfactual reasoning:

```
Simulation: "What if we reduce scholarship processing time from 34 to 10 days?"

Graph traversal:
SCHOLARSHIP_PROCESSING_TIME ↓ 71%
  → STUDENT_FINANCIAL_STRESS_INDEX ↓ (strength: 0.72, lag: 1 month)
    → ACADEMIC_DROPOUT_RATE ↓ estimated 1.6 points

Projected dropout rate with intervention: 9.6% (vs 11.2% baseline)
Confidence: 61%
```

Multiple interventions can be stacked:
```
Scenario A: Reduce scholarship delay only → 9.6%
Scenario B: Add 50 residence spots only → 10.1%
Scenario C: Both interventions → 8.4%
Scenario D: Both + hire 5 faculty → 7.9%
```

---

## Graph Learning & Maintenance

### Initial Graph
- Seeded from education research literature (OECD, UNESCO, Tunisian ministry studies)
- Expert-validated by UCAR academic staff
- Edge strengths initialized from published effect sizes

### Continuous Learning
- After each semester, compare predictions vs actuals
- Update edge strengths using Bayesian updating:
  ```
  new_strength = prior_strength * likelihood(observed_effect | predicted_effect)
  ```
- New causal links can be proposed by the system when correlation + temporal precedence is detected
- Human expert must approve new edges before they enter the graph

### Graph Storage
- **Neo4j** or **Apache AGE** (PostgreSQL graph extension — keeps stack simple)
- Versioned: every graph state is snapshotted per semester
- Queryable via Cypher (Neo4j) or SQL (AGE)

---

## Implementation Stack

```python
# Core libraries
networkx          # graph construction and traversal
pgmpy             # probabilistic graphical models (Bayesian networks)
causalnex         # causal graph learning from data (by QuantumBlack/McKinsey)
prophet           # baseline time-series forecasting
langchain         # LLM explanation generation
neo4j-driver      # graph DB interface

# Causal inference
dowhy             # causal effect estimation, what-if simulations
econml            # heterogeneous treatment effects (per-institution)
```

---

## Visual Representation in UI

The causal graph is surfaced to users as an interactive diagram:

```
[Dropout Rate: 9.8% ↑]
        ▲
   ┌────┴────┐
   │         │
[Scholarship  [Housing
 Delay: 34d]  Stress: HIGH]
   ▲               ▲
   │               │
[Budget        [Residence
 Pressure]      Occupancy: 94%]
```

- Nodes colored by current health (green/orange/red)
- Edge thickness = causal strength
- Click any node → see its current value, trend, and upstream causes
- "Simulate" button on any node → opens what-if panel
