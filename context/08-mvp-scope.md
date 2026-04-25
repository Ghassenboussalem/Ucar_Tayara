# MVP Scope for Hackathon

## Goal
Deliver a working, impressive prototype in hackathon time — not a full product.
Focus on depth over breadth: nail 3-4 modules perfectly rather than showing 15 empty shells.

---

## What to Build (Must Have)

### Core Shell
- [ ] Login + role-based routing (President / Staff)
- [ ] Institution switcher (at least 3 mock institutions)
- [ ] Navigation sidebar with all 15 modules listed (even if most are "coming soon")

### Executive Dashboard
- [ ] KPI scorecard grid (12 KPIs, mock data)
- [ ] Alert feed (5 active alerts, severity-coded)
- [ ] Predictive risk panel (3 forecasts)
- [ ] Module health overview (color-coded grid)

### 3 Deep Modules (pick the most impressive)
Recommended: **Finance + Academic + Student Life**
- [ ] Module KPI cards
- [ ] Time-series chart (12-month trend)
- [ ] Institution comparison table
- [ ] Module-specific alert list

### AI Features (at least 2 must be live, not mocked)
- [ ] Anomaly detection: real algorithm running on mock data, firing real alerts
- [ ] NL Query chatbot: type a question, get a real answer from the data
- [ ] OR: AI report generator: click button, get a real PDF with narrative

### Data Ingestion (optional but impressive)
- [ ] Upload an Excel file → parse it → show data in dashboard
- [ ] Even if OCR is mocked, the flow should work end-to-end

---

## What to Mock (Acceptable for Hackathon)

- Most KPI data (use realistic mock data, not random numbers)
- Predictions (can use pre-computed values, not live ML)
- 12 of the 15 modules (show the UI shell, mark as "in development")
- PDF report generation (can be a pre-generated PDF triggered by button click)
- Multi-tenant isolation (can simulate with a dropdown, real isolation not required)

---

## What NOT to Build

- Real OCR pipeline (too slow to build in hackathon time)
- Real-time data sync from external systems
- Full user management / RBAC
- Mobile app (web responsive is enough)
- Production-grade security

---

## Recommended Tech for Speed

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind | Fast setup, great component ecosystem |
| Charts | Recharts or ECharts | Easy, beautiful, React-native |
| Backend | FastAPI (Python) | Fast to write, great for AI integration |
| Database | PostgreSQL + mock seed data | Real DB, realistic queries |
| AI/NL Query | OpenAI API or Mistral | Fastest path to working NL interface |
| Forecasting | Prophet or pre-computed | Show the output, not the training |
| Deployment | Vercel (frontend) + Railway/Render (backend) | Zero-config deployment |

---

## Demo Data Strategy

Use realistic Tunisian university data:
- 7 institutions: ENIM, ISET Tunis, ESC, ENIG, ESPRIT, FSEG, ISSAT
- 2 academic years of history (2024-2025, 2025-2026)
- Inject 3-4 intentional anomalies so alerts fire during demo
- Make predictions show an interesting trend (e.g., dropout risk rising)

---

## 48-Hour Build Plan

### Hour 0-4: Setup
- Project scaffold, DB schema, mock data seed
- Auth + routing

### Hour 4-16: Core UI
- Executive Dashboard (full)
- 3 module dashboards
- Alert center

### Hour 16-28: AI Features
- Anomaly detection algorithm
- NL query interface
- Connect to real mock data

### Hour 28-36: Polish
- Fix bugs, improve UX
- Add loading states, error handling
- Bilingual toggle (FR/AR)

### Hour 36-44: Demo Prep
- Seed perfect demo data
- Practice demo flow
- Prepare pitch slides

### Hour 44-48: Buffer
- Bug fixes
- Deployment
- Rehearsal
