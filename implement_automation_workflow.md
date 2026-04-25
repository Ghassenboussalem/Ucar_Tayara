# Implementation Plan — No-Code Workflow Builder
**Assigned to:** Team Member D  
**References:** `context/11-ai-automation.md`, `context/12-nocode-workflow-builder-ux.md`  
**Estimated effort:** 8–12h (this is the biggest feature)  
**Priority:** Medium — show as working MVP, not full product

---

## Current State

Nothing built. This is a completely new module.  
The sidebar has a locked "Formation Continue" placeholder — we'll repurpose the slot for the Workflow Builder.

---

## Scope for Hackathon (MVP only)

Do NOT try to build the full product. Build:
1. A workflow **list page** (see existing workflows)
2. A workflow **create page** with a simple IF → THEN form (not a canvas)
3. 3 **pre-built templates** that already work
4. One **live trigger test** (simulate a threshold breach)

Skip for hackathon: drag-and-drop canvas, email/SMS actions, scheduling engine, AI text-to-workflow.

---

## Files to Create

### `src/pages/WorkflowPage.jsx`

Main page — workflow list + template gallery.

```jsx
const TEMPLATES = [
  {
    id: 'tpl_dropout_alert',
    name: 'Alerte abandon critique',
    description: 'Envoie une notification si le taux d\'abandon dépasse 10%',
    trigger: { type: 'kpi_threshold', kpi: 'dropout_rate', operator: '>', value: 10 },
    actions: [{ type: 'create_alert', severity: 'critical', message: 'Taux d\'abandon critique détecté' }],
    domain: 'academic',
    icon: '🎓',
    active: true,
  },
  {
    id: 'tpl_budget_overrun',
    name: 'Dépassement budgétaire',
    description: 'Alerte si l\'exécution budgétaire dépasse 95%',
    trigger: { type: 'kpi_threshold', kpi: 'budget_execution_rate', operator: '>', value: 95 },
    actions: [{ type: 'create_alert', severity: 'warning', message: 'Dépassement budgétaire imminent' }],
    domain: 'finance',
    icon: '💰',
    active: true,
  },
  {
    id: 'tpl_hr_load',
    name: 'Surcharge enseignante',
    description: 'Alerte si la charge dépasse 28h/semaine',
    trigger: { type: 'kpi_threshold', kpi: 'avg_teaching_load_hours', operator: '>', value: 28 },
    actions: [{ type: 'create_alert', severity: 'warning', message: 'Charge enseignante excessive' }],
    domain: 'hr',
    icon: '👥',
    active: false,
  },
]
```

Layout:
```
┌─────────────────────────────────────────────────┐
│ Workflows actifs         [+ Créer un workflow]  │
├──────────────────┬──────────────────────────────┤
│ Liste workflows  │  Galerie de templates        │
│ - Alerte abandon │  [🎓 Alerte abandon]         │
│ - Budget         │  [💰 Budget overrun]         │
│                  │  [👥 Surcharge RH]           │
└──────────────────┴──────────────────────────────┘
```

### `src/pages/WorkflowBuilderPage.jsx`

Simple form-based workflow creator (no canvas):

```
DÉCLENCHEUR
  [ Institution: (dropdown) ]
  [ KPI: (dropdown) ]
  [ Condition: > / < / = ]
  [ Valeur seuil: (number) ]

ACTIONS
  [x] Créer une alerte dans le système
  [ ] Générer un rapport automatique  ← stretch
  [ ] Envoyer un email                ← stretch

NOM DU WORKFLOW
  [ __________ ]

[Annuler]  [Tester]  [Sauvegarder]
```

### `src/components/WorkflowCard.jsx`

Card component showing a single workflow with:
- Name, trigger description, action badges
- Active/inactive toggle (stored in localStorage for demo)
- "Tester" button → runs simulation

### `src/components/WorkflowSimulator.jsx`

When "Tester" is clicked — shows a simulation modal:
```
Simulation en cours…
  Vérification: dropout_rate > 10% pour EPT
  Valeur actuelle: 9.2% ✓
  → Condition non déclenchée
  
  [Forcer le déclenchement] → [Alerte créée ✅]
```

---

## Files to Modify

### `src/App.jsx`
```jsx
import WorkflowPage from './pages/WorkflowPage'
import WorkflowBuilderPage from './pages/WorkflowBuilderPage'

<Route path="/workflows" element={<ProtectedRoute><WorkflowPage /></ProtectedRoute>} />
<Route path="/workflows/new" element={<ProtectedRoute><WorkflowBuilderPage /></ProtectedRoute>} />
```

### `src/components/Sidebar.jsx`
Replace one of the locked coming-soon items with:
```js
{ to: '/workflows', icon: Zap, label: 'Automatisation' },
```
Import `Zap` from `lucide-react`.

---

## State Management

For the hackathon, store workflows in **localStorage** (no backend needed):

```js
const STORAGE_KEY = 'ucar_workflows'

function getWorkflows() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  // Merge with pre-built templates if empty
  return saved.length ? saved : TEMPLATES
}

function saveWorkflow(workflow) {
  const existing = getWorkflows()
  const updated = [...existing.filter(w => w.id !== workflow.id), workflow]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}
```

---

## Backend (Optional stretch)

If time permits, add a `/api/workflows/trigger` endpoint that:
1. Receives `{ kpi, operator, value, institution_id }`
2. Queries the actual KPI from DB
3. Returns `{ triggered: true/false, actual_value: X, condition: '9.2 > 10' }`

This makes the "Tester" button show real data.

```python
@router.post("/workflows/trigger")
def test_trigger(payload: dict, db: Session = Depends(get_db)):
    kpi = payload.get("kpi")
    operator = payload.get("operator", ">")
    threshold = float(payload.get("value", 0))
    institution_id = payload.get("institution_id")

    # Query actual value
    row = db.query(AcademicKPI).filter(
        AcademicKPI.institution_id == institution_id
    ).order_by(AcademicKPI.id.desc()).first()

    actual = float(getattr(row, kpi, 0) or 0) if row else 0
    triggered = (operator == '>' and actual > threshold) or \
                (operator == '<' and actual < threshold) or \
                (operator == '=' and actual == threshold)

    return {"triggered": triggered, "actual_value": actual, "threshold": threshold}
```

---

## Design Guidance

Match the UCAR design system exactly:
- UCAR Blue: `rgb(29, 83, 148)`
- Cards: white, `border: 1px solid #e2e8f0`, `borderRadius: 12px`
- Font: Inter (already loaded globally)
- Use `Zap`, `PlayCircle`, `ToggleLeft`, `ToggleRight` icons from lucide-react

---

## Do NOT Touch
- `DashboardPage.jsx`, `InstitutionDetailPage.jsx` — Ghassen's work
- `api.py` existing endpoints — only add new ones
- Any database tables — no schema changes

## Merge Strategy
Branch: `feat/workflow-builder`  
New files: `WorkflowPage.jsx`, `WorkflowBuilderPage.jsx`, `WorkflowCard.jsx`, `WorkflowSimulator.jsx`  
Modify: `App.jsx`, `Sidebar.jsx` (low conflict risk)
