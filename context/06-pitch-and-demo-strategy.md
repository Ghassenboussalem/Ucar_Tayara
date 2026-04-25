# Pitch & Demo Strategy

## Pitch Structure (5–7 minutes)

### Minute 1 — The Problem (make it visceral)
> "Right now, the president of a UCAR institution has no idea what's happening across their 30+ affiliated schools — unless someone sends them an Excel file. By the time they read it, the data is 3 weeks old. A student dropout crisis is already underway. A budget overrun is already happening. They find out too late."

- Show the "before" state: scattered Excel files, paper forms, no visibility
- Quote the problem statement numbers: 30+ institutions, fragmented systems

### Minute 2 — Our Solution
> "We built UniPilot — an AI-native platform that centralizes all institutional data in real time and turns it into actionable intelligence."

- Show the Executive Dashboard live
- Highlight: 15 modules, real-time KPIs, cross-institution view

### Minute 3 — AI at the Core (this is the differentiator)
> "AI isn't a chatbot we bolted on. It's the engine."

- Demo the anomaly detection: show an alert firing with plain-language explanation
- Demo the predictive engine: show dropout risk forecast with confidence interval
- Demo the NL query: type "Quel est le taux d'abandon à l'ISET ?" → instant answer

### Minute 4 — Depth: One Module Deep Dive
> "Let's go deeper. Here's the Finance module."

- Show budget vs consumed, cost per student, deviation alert
- Show the AI-generated monthly report (PDF preview)
- Show the OCR ingestion: upload an Excel file → data appears in dashboard

### Minute 5 — Scalability & Feasibility
> "This isn't a demo that breaks at institution #2."

- Show multi-tenant architecture slide
- Show institution #2 with completely different data, same platform
- Mention: schema-per-tenant, horizontal scaling, Tunisian hosting compatible

### Minute 6 — Impact
> "What changes for UCAR?"

| Before | After |
|---|---|
| 3-week-old Excel reports | Real-time KPI dashboard |
| Manual anomaly detection | Automated alerts in minutes |
| No cross-institution view | Consolidated benchmark across 30+ schools |
| Paper-based processes | Digital workflows with audit trail |
| Reactive decisions | Predictive risk management |

### Minute 7 — Call to Action
> "We're ready to pilot with 3 institutions in semester 1. Full rollout to all 30+ by year 2."

- Show roadmap slide
- Mention open to partnership with UCAR IT team

---

## Demo Script (what to show live)

1. Login as "President, University of Carthage"
2. Executive Dashboard → point out consolidated KPI grid
3. Click on a red alert → show alert detail + AI explanation + recommendation
4. Navigate to Finance module → show budget deviation
5. Click "Generate Report" → show PDF preview with AI narrative
6. Go to Predictive Analytics → show dropout forecast chart
7. Open AI chatbot → type a question in French → show answer
8. Show institution switcher → switch to ISET Tunis → different data, same UX
9. Go to Data Ingestion → upload a sample Excel → show OCR processing

---

## Judging Criteria Mapping

| Criterion | How we address it |
|---|---|
| Impact | 15 modules, all UCAR processes covered, real institutional pain solved |
| Innovation | Anomaly detection + predictive engine + NL query + OCR ingestion |
| Usability | No-code interface, bilingual, mobile-aware, action-oriented UX |
| Scalability | Multi-tenant architecture, schema isolation, horizontal scaling |
| Feasibility | Built on standard open-source stack, deployable on Tunisian infrastructure |

---

## Backup Questions & Answers

**Q: How do you handle data quality from legacy systems?**
A: OCR + AI extraction pipeline with human-in-the-loop validation for low-confidence fields. Every ingested record has an audit trail.

**Q: What if an institution doesn't have digital data at all?**
A: Manual entry forms + bulk Excel upload + OCR for scanned documents. We meet institutions where they are.

**Q: How do you ensure data privacy between institutions?**
A: Schema-per-tenant isolation in PostgreSQL + row-level security + JWT tokens scoped to institution. No data crosses tenant boundaries.

**Q: What's the AI model you're using?**
A: Combination — Prophet for forecasting, scikit-learn for anomaly detection, LLM (Mistral/GPT-4) for report generation and NL queries. All explainable, no black boxes.

**Q: How long to deploy for all 30+ institutions?**
A: Pilot with 3 institutions in 3 months. Full rollout in 12 months with a dedicated onboarding team.
