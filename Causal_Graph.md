# Implementation Plan — Interactive Causal Graph
**Assigned to:** Team Member C  
**References:** `context/10-causal-graph-forecast-agent.md`  
**Estimated effort:** 5–8h  

---

## Current State

Already done by Ghassen:
- `/api/causal/{kpi_name}` — returns causes/effects/recommendation as JSON
- `CausalTooltip.jsx` — hover text tooltip on KPI cards

**Missing:** interactive visual graph where you click a node and see the causal chain.

---

## Install

```bash
cd hack4ucar-frontend
npm install reactflow
```

---

## Files to Create

### `src/pages/CausalGraphPage.jsx`

Full-screen interactive graph using React Flow.

**Node data** (hard-code from the existing causal graph in `api.py`):
```js
const NODES = [
  { id: 'dropout_rate',            label: "Taux d'abandon",    domain: 'academic', position: { x: 400, y: 150 } },
  { id: 'success_rate',            label: 'Taux de réussite',  domain: 'academic', position: { x: 700, y: 150 } },
  { id: 'attendance_rate',         label: 'Présence',          domain: 'academic', position: { x: 400, y: 300 } },
  { id: 'budget_execution_rate',   label: 'Exécution budget',  domain: 'finance',  position: { x: 100, y: 400 } },
  { id: 'absenteeism_rate',        label: 'Absentéisme',       domain: 'hr',       position: { x: 400, y: 450 } },
  { id: 'avg_teaching_load_hours', label: 'Charge horaire',    domain: 'hr',       position: { x: 100, y: 250 } },
  { id: 'staff_turnover_rate',     label: 'Turnover RH',       domain: 'hr',       position: { x: 100, y: 100 } },
  { id: 'scholarship_delay',       label: 'Délai bourses',     domain: 'external', position: { x: 200, y: 0   } },
  { id: 'residence_occupancy',     label: 'Résidences',        domain: 'external', position: { x: 550, y: 0   } },
]

const EDGES = [
  { id: 'e1', source: 'scholarship_delay',      target: 'dropout_rate',            label: '0.72' },
  { id: 'e2', source: 'residence_occupancy',     target: 'dropout_rate',            label: '0.58' },
  { id: 'e3', source: 'avg_teaching_load_hours', target: 'dropout_rate',            label: '0.44' },
  { id: 'e4', source: 'dropout_rate',            target: 'success_rate',            label: '-0.81' },
  { id: 'e5', source: 'attendance_rate',         target: 'success_rate',            label: '0.69' },
  { id: 'e6', source: 'avg_teaching_load_hours', target: 'absenteeism_rate',        label: '0.67' },
  { id: 'e7', source: 'staff_turnover_rate',     target: 'absenteeism_rate',        label: '0.51' },
  { id: 'e8', source: 'absenteeism_rate',        target: 'attendance_rate',         label: '-0.61' },
  { id: 'e9', source: 'budget_execution_rate',   target: 'avg_teaching_load_hours', label: '0.43' },
]
```

**On node click:** fetch `/api/causal/{nodeId}` → show detail panel on the right.

**Node custom style:** color border by domain (`academic=blue`, `finance=green`, `hr=purple`, `external=gray`). Show animated pulse on selected node.

**Highlighted on click:**
- Incoming edges → red
- Outgoing edges → orange
- Unrelated nodes → dimmed opacity

### `src/components/CausalDetailPanel.jsx`

Right panel when a node is selected:
- KPI label + domain badge
- Causes list (strength bars like existing CausalTooltip)
- Effects list with arrows
- Recommendation box
- **"Simuler une intervention" button** → opens WhatIfPanel with matching scenario

---

## Files to Modify

### `src/App.jsx`
Add route: `<Route path="/causal" element={<ProtectedRoute><CausalGraphPage /></ProtectedRoute>} />`

### `src/components/Sidebar.jsx`
In Intelligence section, replace the "Graphe Causal" coming-soon shell with a real link.  
Import `Network` from `lucide-react`.

---

## Backend — Add one endpoint

```python
# In routes/api.py — add after /causal/{kpi_name}
@router.get("/causal/graph/all")
def get_full_graph():
    nodes = [{"id": k, "label": v["label"], "domain": v["domain"]} for k, v in CAUSAL_GRAPH.items()]
    edges = [
        {"source": kpi, "target": e["kpi"], "strength": e.get("strength", 0)}
        for kpi, data in CAUSAL_GRAPH.items()
        for e in data.get("causes", [])
    ]
    return {"nodes": nodes, "edges": edges}
```

---

## Stretch Goal — Live Propagation

When WhatIfPanel selects an intervention, animate node color changes to show the causal chain propagating: scholarship fixed → dropout drops (node turns green) → success_rate rises (node turns lighter green).

---

## Do NOT Touch
- `CausalTooltip.jsx` — leave as-is
- `DashboardPage.jsx`, `InstitutionDetailPage.jsx` — Ghassen's work
- Existing `/api/causal/{kpi}` endpoint — add `/causal/graph/all` but don't change existing

## Merge Strategy
Branch: `feat/causal-graph`  
New files: `CausalGraphPage.jsx`, `CausalDetailPanel.jsx`  
Modify: `App.jsx`, `Sidebar.jsx` (low conflict risk)
