# Team Collaboration Guide — UCAR Intelligence Platform
**Owner:** Ghassen (main branch, baseline code)  
**Last baseline commit:** `f99fa0e` — Phase 2 complete

---

## Project Structure

```
D:\Ucar_dataset\
├── hack4ucar-backend/          ← FastAPI Python backend
│   ├── routes/api.py           ← ALL endpoints here
│   ├── services/               ← Claude, auth, report services
│   ├── agents/                 ← NEW: to be created by Team A
│   └── models/models.py        ← DB models — DO NOT CHANGE
├── hack4ucar-frontend/
│   └── src/
│       ├── pages/              ← One file per page
│       ├── components/         ← Reusable components
│       ├── api/client.js       ← All API calls — add yours here
│       └── App.jsx             ← Routes — add yours here
└── *.md                        ← Implementation plans (this file)
```

---

## Who Works on What

| Person | Branch | Plan File | Risk of Conflict |
|---|---|---|---|
| **Ghassen** | `main` | — (baseline done) | Owner of all existing files |
| **Team A** | `feat/multi-agent` | `implement_ai_multi_agent.md` | Low — new `agents/` folder |
| **Team B** | `feat/predictive` | `implement_ai_prediction.md` | Medium — touches `InstitutionDetailPage.jsx` |
| **Team C** | `feat/causal-graph` | `Causal_Graph.md` | Low — new `CausalGraphPage.jsx` |
| **Team D** | `feat/workflow-builder` | `implement_automation_workflow.md` | Low — new pages only |

---

## Git Workflow

### Initial Setup (everyone does this once)

```bash
git clone https://github.com/Ghassenboussalem/Ucar_Tayara.git
cd Ucar_Tayara

# Backend
cd hack4ucar-backend
pip install -r requirements.txt

# Frontend
cd ../hack4ucar-frontend
npm install
```

### Start Your Feature Branch

```bash
git checkout main
git pull origin main                    # always sync first
git checkout -b feat/YOUR-FEATURE-NAME
```

### Daily Workflow

```bash
# Start of day — sync with main
git fetch origin
git rebase origin/main                  # rebase (not merge) to keep history clean

# After finishing a chunk of work
git add -A
git commit -m "feat(your-module): what you did"
git push origin feat/YOUR-FEATURE-NAME
```

### Merging Back (when ready)

```bash
git checkout main
git pull origin main
git merge feat/YOUR-FEATURE-NAME --no-ff -m "feat: merge your-feature into main"
git push origin main
```

> **Coordinate with Ghassen before merging** — he will review and merge all PRs to avoid conflicts.

---

## High-Conflict Files — Coordinate Before Touching

These files are owned by Ghassen. If you MUST modify them, **tell him first**:

| File | Owner | Why risky |
|---|---|---|
| `hack4ucar-frontend/src/pages/DashboardPage.jsx` | Ghassen | Dashboard Phase 2 complete |
| `hack4ucar-frontend/src/pages/InstitutionDetailPage.jsx` | Ghassen | Charts + causal tooltips wired |
| `hack4ucar-backend/routes/api.py` | Ghassen | All endpoints — append only, don't reorder |
| `hack4ucar-frontend/src/components/Sidebar.jsx` | Ghassen | Only edit the `COMING_SOON_MODULES` array |
| `hack4ucar-frontend/src/App.jsx` | Ghassen | Add routes at the end only |

### Safe Rule for `api.py`

Everyone can add NEW endpoints. **Never change existing ones.** Add yours at the bottom before the helpers section:

```python
# ─────────────────────────────────────────────────────────────
# YOUR MODULE NAME
# ─────────────────────────────────────────────────────────────

@router.get("/your-endpoint")
def your_function(...):
    ...
```

### Safe Rule for `App.jsx`

Add routes **at the end** of the route list, before the closing `</Routes>`:

```jsx
{/* Your feature routes */}
<Route path="/your-path" element={<ProtectedRoute><YourPage /></ProtectedRoute>} />
```

### Safe Rule for `Sidebar.jsx`

Replace one entry in the `COMING_SOON_MODULES` array with your real nav item.  
Don't touch the `NAV` array without asking Ghassen.

---

## Running the Project Locally

### Backend

```bash
cd hack4ucar-backend
# Make sure PostgreSQL is running and ucar_demo DB exists
uvicorn main:app --reload --port 8000
# API available at: http://localhost:8000/api
# Docs at: http://localhost:8000/docs
```

### Frontend

```bash
cd hack4ucar-frontend
npm run dev
# App available at: http://localhost:5173
```

### Login Credentials (demo)

| Email | Password | Role |
|---|---|---|
| `president@ucar.rnu.tn` | `demo2024` | presidency (sees all institutions) |
| `directeur@ept.rnu.tn` | `demo2024` | institution_admin (EPT only) |
| `viewer@ucar.rnu.tn` | `demo2024` | viewer |

---

## Adding a New Page (step-by-step)

1. Create `src/pages/YourPage.jsx`
2. Add the API call function in `src/api/client.js` (append at end)
3. Add the route in `src/App.jsx`
4. Replace your locked module in `Sidebar.jsx`
5. Test locally, then push your branch

---

## Adding a New API Endpoint (step-by-step)

1. Add endpoint in `routes/api.py` (append in your section)
2. If you need a new service file, create `services/your_service.py`
3. Add the axios call in `src/api/client.js`:
   ```js
   export const getYourData = (params) => client.get('/your-endpoint', { params }).then(r => r.data)
   ```
4. Test with: `curl http://localhost:8000/api/your-endpoint`

---

## Design System (copy-paste these)

```js
// UCAR Blue — primary color
color: 'rgb(29, 83, 148)'

// Standard card
{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }

// Standard section title
{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }

// Secondary text
{ fontSize: '0.8rem', color: '#64748b' }

// Muted text
{ fontSize: '0.72rem', color: '#94a3b8' }

// Danger red
color: '#dc2626'

// Success green
color: '#059669'

// Warning amber
color: '#f59e0b'

// Standard button
{ padding: '8px 16px', borderRadius: '8px', background: 'rgb(29,83,148)', color: 'white', border: 'none', fontFamily: 'Inter, sans-serif', fontWeight: 600, cursor: 'pointer' }
```

---

## Commit Message Format

```
feat(module): short description
fix(module): what was broken
chore: dependency or config change

Examples:
feat(multi-agent): add OrchestratorAgent with intent classification
feat(causal-graph): add ReactFlow interactive node graph
fix(predictions): handle empty DB result in forecast endpoint
```

---

## Before the Demo — Merge Checklist

- [ ] All branches merged into `main`
- [ ] `npm run build` runs without errors in `hack4ucar-frontend`
- [ ] All 7 backend endpoints respond (run the verify script)
- [ ] Login works with `president@ucar.rnu.tn`
- [ ] Dashboard shows 3 prediction cards
- [ ] What-If panel opens from dropout card
- [ ] Causal tooltip appears on dropout_rate card hover
- [ ] Causal graph page is accessible from sidebar (Team C)
- [ ] Workflow builder is accessible (Team D)
- [ ] No `console.error` in browser dev tools

```bash
# Quick verify all endpoints
python -c "
import urllib.request, json
urls = ['/dashboard', '/predictions', '/causal/dropout_rate', '/institutions', '/alerts']
for u in urls:
    try: urllib.request.urlopen('http://localhost:8000/api' + u, timeout=3); print('OK', u)
    except Exception as e: print('FAIL', u, e)
"
```
