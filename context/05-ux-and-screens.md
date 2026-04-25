# UX & Screen Design Brainstorm

## Design Principles
- **Clarity over density** — deans are not data analysts, every screen must be immediately readable
- **Action-oriented** — every alert or anomaly has a clear next step
- **Bilingual first** — French/Arabic toggle, full RTL support for Arabic
- **Mobile-aware** — presidents check dashboards on phones, not just desktops
- **Progressive disclosure** — summary first, drill-down on demand

---

## Screen Map

### 1. Login & Onboarding
- Institution selector (for multi-institution users)
- Role-based redirect after login (President → Executive Dashboard, Staff → Module Dashboard)
- First-time setup wizard for new institutions

---

### 2. Executive Dashboard (President / Dean view)
**Purpose:** Single-screen strategic overview

**Components:**
- Top bar: institution selector, date range, last sync timestamp
- KPI scorecard grid (12 cards): each shows value, trend arrow, vs target, vs network avg
- Alert feed (right panel): top 5 active alerts, severity-coded
- Predictive risk panel: 3-4 forward-looking indicators with confidence %
- Module quick-access grid (15 modules, color-coded by health status)
- "Generate Report" button → triggers AI report for selected period

**Filters:**
- By institution (or "All — consolidated view")
- By domain (Academic / Finance / HR / ESG / Research / Partnerships)
- By time period (current semester / academic year / custom)

---

### 3. Module Dashboard (e.g., Finance)
**Purpose:** Deep dive into one process domain

**Components:**
- Module KPI cards (6-8 KPIs specific to the module)
- Time-series chart: KPI evolution over last 12 months
- Institution comparison table: all institutions ranked on key KPI
- Alert list: module-specific alerts only
- Data entry / upload button (for manual data input)
- Export button (PDF / Excel)

---

### 4. Alert Center
**Purpose:** Centralized view of all active alerts

**Components:**
- Filter by: severity / institution / module / date
- Alert card: title, institution, module, KPI value vs threshold, timestamp, status
- Alert detail panel: explanation, source data, AI recommendation, action buttons (Acknowledge / Escalate / Dismiss)
- Alert history log

---

### 5. Predictive Analytics Screen
**Purpose:** Forward-looking risk and trend analysis

**Components:**
- Forecast chart per KPI (with confidence interval bands)
- Risk matrix: probability vs impact grid for top risks
- "What-if" simulator: adjust an input (e.g., budget cut 10%) → see projected KPI impact
- Scenario comparison: optimistic / baseline / pessimistic

---

### 6. Report Center
**Purpose:** Generate, schedule, and download reports

**Components:**
- Report templates: Weekly Ops / Monthly KPI / Annual Strategic / Custom
- Institution + module scope selector
- Schedule builder: one-time / recurring (weekly/monthly/annual)
- Report history: list of generated reports with download links
- AI narrative toggle: include/exclude AI-generated commentary

---

### 7. Data Ingestion Screen
**Purpose:** Upload and manage data sources

**Components:**
- Upload zone: drag & drop PDF/Excel/CSV
- OCR processing status (real-time progress)
- Validation results: fields extracted, confidence scores, flagged issues
- Manual correction interface for low-confidence fields
- Ingestion history log

---

### 8. Settings & Administration
**Purpose:** Platform configuration (super-admin / institution admin)

**Components:**
- Institution management (add/edit/deactivate)
- User management (invite, assign roles)
- KPI threshold configuration (set alert thresholds per KPI per institution)
- Notification preferences (email / in-app / SMS)
- Data source connections (API integrations, scheduled imports)

---

## Key UX Patterns

### Alert Card
```
🔴 CRITICAL — Finance · ENIM
Budget consumption at 87% with 4 months remaining
Current: 87% | Threshold: 80% | Triggered: 2h ago
[View Details]  [Acknowledge]  [Generate Report]
```

### KPI Card
```
┌─────────────────────────┐
│ 🎓 Success Rate         │
│  78.4%  ↑ +2.1%        │
│  Target: 80%            │
│  Network avg: 74.2%     │
│  ████████░░ 78%         │
└─────────────────────────┘
```

### Prediction Card
```
┌─────────────────────────────┐
│ ⚠️ Dropout Risk — S2 2026  │
│  Projected: 8.2%            │
│  Current: 6.1%              │
│  Confidence: 74%            │
│  Trend: ↑ Rising            │
│  [See full forecast]        │
└─────────────────────────────┘
```
