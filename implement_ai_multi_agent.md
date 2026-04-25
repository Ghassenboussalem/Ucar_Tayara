# Implementation Plan — AI Multi-Agent Architecture
**Assigned to:** Team Member A  
**References:** `context/09-ai-agents.md`  
**Estimated effort:** 6–10h  
**Priority:** High — core differentiator for pitch

---

## Current State

A single `claude_service.py` handles **everything** with one function per use-case:
- `chat_with_data()` → general chat
- `explain_anomaly()` → alert explanation
- `generate_narrative()` → PDF report text

All three are direct Claude API calls with hand-crafted prompts. There is **no routing, no specialization, no agent coordination.**

---

## What to Build

Transform the single service into a proper multi-agent system where an **OrchestratorAgent** routes user intent to specialized sub-agents.

### Architecture Diagram

```
User Message
    │
    ▼
OrchestratorAgent          ← classifies intent, selects agent
    ├── AlertInvestigatorAgent   ← cross-references KPIs for anomalies
    ├── ForecastAgent            ← interprets predictions, explains risk
    ├── BenchmarkAgent           ← ranks institutions, gap analysis
    ├── DocumentIntelligenceAgent← OCR, document parsing (Phase 2)
    └── StrategicAdvisorAgent    ← synthesis, multi-domain recommendations
```

---

## Files to Create

### `hack4ucar-backend/agents/__init__.py`
Empty init.

### `hack4ucar-backend/agents/orchestrator.py`
```python
from agents.alert_investigator import AlertInvestigatorAgent
from agents.forecast import ForecastAgent
from agents.benchmark import BenchmarkAgent
from agents.strategic import StrategicAdvisorAgent

class OrchestratorAgent:
    """Routes user messages to the correct specialized agent."""

    INTENTS = {
        "alert":     ["alerte", "anomalie", "critique", "urgent", "problème"],
        "forecast":  ["prévision", "prédit", "futur", "risque", "tendance"],
        "benchmark": ["comparaison", "réseau", "rang", "meilleur", "pire"],
        "strategic": ["recommandation", "stratégie", "priorité", "que faire"],
    }

    def classify(self, message: str) -> str:
        msg = message.lower()
        for intent, keywords in self.INTENTS.items():
            if any(k in msg for k in keywords):
                return intent
        return "strategic"  # default fallback

    def route(self, message: str, context: dict) -> str:
        intent = self.classify(message)
        agents = {
            "alert":     AlertInvestigatorAgent(),
            "forecast":  ForecastAgent(),
            "benchmark": BenchmarkAgent(),
            "strategic": StrategicAdvisorAgent(),
        }
        return agents[intent].respond(message, context)
```

### `hack4ucar-backend/agents/alert_investigator.py`
- Receives: alert data + institution KPIs
- Does: cross-references all KPI tables for the same institution, finds correlated anomalies
- Returns: structured explanation with correlated KPIs, root cause hypothesis

**Key logic:**
```python
# When dropout_rate > threshold, automatically pull:
# - absenteeism_rate for the same institution
# - budget_execution_rate (are salaries being paid late?)
# - avg_teaching_load_hours (is staff overloaded?)
# Build a causal narrative across all three
```

### `hack4ucar-backend/agents/forecast.py`
- Receives: historical KPI time series (last 6 semesters)
- Does: interpret the prediction output from `/api/predictions`
- Returns: narrative explanation of the forecast in plain French

### `hack4ucar-backend/agents/benchmark.py`
- Receives: user question + all institution KPIs
- Does: ranks institutions by the relevant KPI, computes gap to network average
- Returns: ranking table in markdown + narrative commentary

### `hack4ucar-backend/agents/strategic.py`
- Receives: full institutional context
- Does: synthesis across all domains, generates prioritized action list
- Returns: executive-level recommendation in 3 bullet points

---

## Files to Modify

### `hack4ucar-backend/routes/api.py`
Change `/ai/chat` endpoint to use `OrchestratorAgent` instead of direct Claude call:

```python
# BEFORE
from services.claude_service import chat_with_data

# AFTER
from agents.orchestrator import OrchestratorAgent
orchestrator = OrchestratorAgent()

@router.post("/ai/chat")
def chat(request: ChatMessage, db: Session = Depends(get_db)):
    context = build_context(db)  # existing function
    response = orchestrator.route(request.message, context)
    return {"response": response}
```

### `hack4ucar-backend/services/claude_service.py`
Keep `explain_anomaly()` and `generate_narrative()` — they are still used directly.  
Add a shared `call_claude(prompt, system)` helper that all agents use internally.

---

## New API Endpoint

```
POST /api/ai/agent-status
→ Returns which agent handled the last request and why
→ Useful for debugging + can be shown in the UI as "🤖 Handled by: BenchmarkAgent"
```

---

## Frontend Integration

Add an **agent badge** to the AI chat drawer response:

```jsx
// In AIChatDrawer.jsx, show which agent responded
<div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
  🤖 {response.agent_used || 'StrategicAdvisorAgent'}
</div>
```

---

## Testing

```bash
# Test intent classification
python -c "
from agents.orchestrator import OrchestratorAgent
o = OrchestratorAgent()
print(o.classify('quelles sont les alertes critiques ?'))    # → alert
print(o.classify('quel est le rang de lESSOT ?'))           # → benchmark
print(o.classify('que prévois-tu pour le taux dabandon ?')) # → forecast
"
```

---

## Do NOT Touch

- `DashboardPage.jsx` — already complete
- `InstitutionDetailPage.jsx` — already complete
- Database schema — no changes needed
- Any file already committed by Ghassen

---

## Merge Strategy

Create branch: `feat/multi-agent`  
PR into `main` when all agents respond correctly.  
Conflict risk: only `routes/api.py` `/ai/chat` endpoint — coordinate with Ghassen.
