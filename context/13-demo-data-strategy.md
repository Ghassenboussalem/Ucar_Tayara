# Demo Data Strategy

## Core Principle
> Real institution names. Realistic numbers. Intentional drama.

The demo data must feel like UCAR's actual data — not random numbers.
Judges from UCAR will recognize their own institutions.
Every anomaly and alert must fire at exactly the right moment during the demo.

---

## Institutions Selected for Demo (6 of 32)

Pick 6 that cover different types, sizes, and geographic spread:

| Code | Full Name | Type | City | Students |
|---|---|---|---|---|
| **EPT** | École Polytechnique de Tunisie | Engineering Grande École | La Marsa | 2 400 |
| **INSAT** | Institut National des Sciences Appliquées et de Technologie | Applied Sciences | Tunis | 3 800 |
| **SupCom** | École Supérieure des Communications de Tunis | Telecom/IT | Ariana | 2 100 |
| **IHEC** | Institut des Hautes Études Commerciales de Carthage | Business | Carthage | 4 200 |
| **FSB** | Faculté des Sciences de Bizerte | Sciences Faculty | Bizerte | 5 600 |
| **ESAC** | École Supérieure de l'Audiovisuel et du Cinéma de Gammarth | Arts | Gammarth | 480 |

**Why this selection:**
- EPT & INSAT = engineering prestige schools (judges know them well)
- SupCom = tech school, strong research angle
- IHEC = business school, finance KPIs shine here
- FSB = large faculty, shows scale
- ESAC = small arts school, shows diversity + contrast

---

## Demo Narrative: "A Tuesday Morning at UCAR"

The demo tells a story. The data is designed to support this exact narrative:

> "It's Tuesday morning. The University President logs in.
> Three things need attention today. The platform already knows."

**Alert 1 — Academic (EPT):** Dropout rate spiked to 9.2% this semester (was 5.8%)
**Alert 2 — Finance (IHEC):** Budget 88% consumed with 4 months remaining
**Alert 3 — Infrastructure (FSB):** Lab HVAC system failure, 3 units down before exams

Each alert has a full causal chain, a root cause analysis, and a recommended action.
The demo walks through each one.

---

## KPI Data per Institution — S1 2025-2026

### Academic KPIs

| KPI | EPT | INSAT | SupCom | IHEC | FSB | ESAC | Network Avg |
|---|---|---|---|---|---|---|---|
| Taux de réussite (%) | 74.1 | 81.3 | 78.6 | 69.4 | 65.2 | 88.1 | 76.1 |
| Taux d'abandon (%) | **9.2** 🔴 | 5.1 | 4.8 | 7.3 | 8.1 | 2.4 | 6.2 |
| Taux de présence (%) | 82.4 | 91.2 | 89.7 | 85.1 | 78.3 | 94.6 | 86.9 |
| Taux de redoublement (%) | 12.3 | 8.7 | 9.1 | 14.2 | 16.8 | 4.1 | 10.9 |
| Satisfaction étudiante (%) | 71 | 84 | 79 | 62 🟡 | 68 | 91 | 75.8 |

### Finance KPIs

| KPI | EPT | INSAT | SupCom | IHEC | FSB | ESAC |
|---|---|---|---|---|---|---|
| Budget alloué (MDT) | 4.2 | 6.8 | 3.9 | 5.1 | 7.4 | 0.9 |
| Budget consommé (%) | 71 | 68 | 74 | **88** 🔴 | 62 | 55 |
| Coût/étudiant (DT) | 1 750 | 1 789 | 1 857 | 1 214 | 1 321 | 1 875 |
| Taux d'exécution (%) | 71 | 68 | 74 | 88 | 62 | 55 |

### HR KPIs

| KPI | EPT | INSAT | SupCom | IHEC | FSB | ESAC |
|---|---|---|---|---|---|---|
| Effectif enseignant | 187 | 312 | 164 | 248 | 421 | 38 |
| Charge moy. (h) | **391** 🟡 | 342 | 358 | 371 | 384 | 290 |
| Taux vacataires (%) | 28 | 31 | 34 | 41 🟡 | 38 | 22 |
| Taux absentéisme (%) | 4.2 | 3.1 | 5.8 | 6.4 🟡 | 7.1 🟡 | 2.1 |

### Infrastructure KPIs

| KPI | EPT | INSAT | SupCom | IHEC | FSB | ESAC |
|---|---|---|---|---|---|---|
| Taux occupation salles (%) | 84 | 91 | 78 | 86 | 88 | 62 |
| Score maintenance (%) | 79 | 82 | 74 | 71 | **48** 🔴 | 88 |
| Équipements à renouveler (%) | 12 | 9 | 18 | 22 🟡 | 31 🔴 | 7 |
| Accessibilité handicap (%) | 45 | 52 | 38 | 41 | 35 | 71 |

### Research KPIs (SupCom & INSAT focus)

| KPI | EPT | INSAT | SupCom | IHEC | FSB | ESAC |
|---|---|---|---|---|---|---|
| Publications indexées | 34 | 89 | 127 | 12 | 67 | 3 |
| Projets actifs | 8 | 24 | 31 | 4 | 18 | 1 |
| Financements (MDT) | 0.8 | 2.1 | 3.4 | 0.2 | 1.6 | 0.05 |

### ESG KPIs

| KPI | EPT | INSAT | SupCom | IHEC | FSB | ESAC |
|---|---|---|---|---|---|---|
| Consommation énergie (kWh/étudiant) | 1 240 | 1 180 | 980 | 1 420 | 1 650 🟡 | 890 |
| Part énergie renouvelable (%) | 18 | 24 | 31 | 8 | 12 | 42 |
| Empreinte carbone (tCO2e) | 142 | 198 | 124 | 218 | 312 🟡 | 28 |

---

## Time-Series Data (12 months history)

### EPT — Dropout Rate (the main story)

```
S2 2024-25:  5.8%  (baseline, normal)
Jul 2025:    5.9%
Aug 2025:    6.1%  (slight uptick — scholarship delays begin)
Sep 2025:    6.8%  (semester start, housing pressure)
Oct 2025:    7.4%  (trending up — alert threshold approaching)
Nov 2025:    8.1%  (WARNING alert fires)
Dec 2025:    8.7%
Jan 2026:    9.2%  (CRITICAL alert — demo moment)
Feb 2026:    9.8%  (forecast if no action)  ← predicted
Mar 2026:   10.4%  (forecast if no action)  ← predicted
```

**Causal chain visible in data:**
- Scholarship processing time: 12 days (Jul) → 38 days (Jan) ← root cause
- Residence occupancy: 87% (Sep) → 96% (Jan) ← contributing factor
- Teaching load: 374h (Sep) → 391h (Jan) ← contributing factor

### IHEC — Budget Consumption

```
May 2025:   31%  consumed
Jun 2025:   38%
Jul 2025:   44%
Aug 2025:   51%
Sep 2025:   58%  (semester start spending spike)
Oct 2025:   67%
Nov 2025:   74%
Dec 2025:   81%  (WARNING alert fires)
Jan 2026:   88%  (CRITICAL — 4 months remaining)  ← demo moment
Feb 2026:   94%  (forecast)  ← predicted overrun
Mar 2026:  101%  (forecast — overrun)  ← predicted
```

---

## The 3 Demo Alerts (pre-seeded, fire during demo)

### Alert 1: EPT Dropout Crisis
```json
{
  "id": "ALT-2026-0142",
  "severity": "CRITICAL",
  "institution": "EPT",
  "module": "Académique",
  "kpi": "Taux d'abandon",
  "current_value": 9.2,
  "threshold": 8.0,
  "unit": "%",
  "triggered_at": "2026-01-23T08:14:00",
  "status": "ACTIVE",
  "ai_explanation": "Le taux d'abandon à l'EPT a atteint 9.2%, dépassant le seuil critique de 8%. L'analyse causale identifie trois facteurs corrélés : (1) le délai de traitement des bourses a triplé (12→38 jours), (2) le taux d'occupation des résidences est à 96%, (3) la charge enseignante approche le plafond réglementaire. Sans intervention, le taux pourrait atteindre 10.4% en mars 2026.",
  "recommendation": "Action prioritaire : accélérer le traitement des 67 dossiers de bourse en attente. Action secondaire : activer le protocole d'hébergement d'urgence (18 places disponibles à l'INSAT)."
}
```

### Alert 2: IHEC Budget Overrun Risk
```json
{
  "id": "ALT-2026-0138",
  "severity": "CRITICAL",
  "institution": "IHEC",
  "module": "Finance",
  "kpi": "Taux d'exécution budgétaire",
  "current_value": 88,
  "threshold": 85,
  "unit": "%",
  "triggered_at": "2026-01-22T14:30:00",
  "status": "ACTIVE",
  "ai_explanation": "L'IHEC a consommé 88% de son budget annuel avec 4 mois restants. Au rythme actuel (6.5%/mois), un dépassement de 14% est prévu en avril 2026. L'analyse par département révèle que 61% de la surconsommation provient du département RH (recrutements non planifiés) et 28% de l'infrastructure.",
  "recommendation": "Geler les recrutements non essentiels jusqu'en juin. Réallouer 8% du budget infrastructure vers une réserve de contingence. Convoquer le comité financier dans les 72h."
}
```

### Alert 3: FSB Infrastructure Failure
```json
{
  "id": "ALT-2026-0145",
  "severity": "CRITICAL",
  "institution": "FSB",
  "module": "Infrastructure",
  "kpi": "Score de maintenance",
  "current_value": 48,
  "threshold": 60,
  "unit": "%",
  "triggered_at": "2026-01-24T06:45:00",
  "status": "ACTIVE",
  "ai_explanation": "Le score de maintenance de la FSB est tombé à 48%, bien en dessous du seuil critique de 60%. Cause principale : 3 unités de climatisation des laboratoires scientifiques sont hors service. Les examens de fin de semestre sont prévus dans 18 jours. Sans intervention, 340 étudiants passeront leurs examens dans des conditions dégradées.",
  "recommendation": "Intervention urgente requise sous 48h. Contacter le prestataire de maintenance (contrat n°FSB-2024-HVAC). Budget estimé : 12 000 DT (disponible dans la réserve infrastructure)."
}
```

---

## What-If Simulation Data (pre-computed for demo)

### Scenario: EPT Dropout — "What if we fix scholarship delays?"

```
Intervention: Réduire délai bourses de 38 → 10 jours

Résultat simulé:
  Taux d'abandon projeté (mars 2026):
    Sans intervention:  10.4%
    Avec intervention:   8.1%  (-2.3 points)
  
  Confiance: 71%
  Délai d'effet: 6-8 semaines
```

### Scenario: IHEC Budget — "What if we freeze HR hiring?"

```
Intervention: Gel recrutements RH (économie: 180 000 DT/mois)

Résultat simulé:
  Taux d'exécution projeté (juin 2026):
    Sans intervention: 107%  (dépassement)
    Avec intervention:  96%  (dans les limites)
  
  Confiance: 84%
```

---

## NL Query Demo Script

Pre-tested queries that work perfectly during the demo:

```
Query 1: "Quel établissement a le taux d'abandon le plus élevé ?"
→ "L'EPT affiche le taux d'abandon le plus élevé du réseau avec 9.2% 
   ce semestre, en hausse de 3.4 points vs S2 2024-25."

Query 2: "Compare le budget de l'IHEC et de l'INSAT"
→ [Table comparative avec valeurs, % consommé, tendance]

Query 3: "Quels sont les établissements à risque ce semestre ?"
→ "3 établissements présentent des signaux de risque :
   EPT (abandon critique), IHEC (budget), FSB (infrastructure)"

Query 4: "Génère un résumé exécutif pour le président"
→ [AI-generated 3-paragraph executive summary]

Query 5 (Arabic): "ما هو معدل النجاح في المدرسة متعددة التقنيات؟"
→ "معدل النجاح في المدرسة متعددة التقنيات هو 74.1% هذا الفصل"
```

---

## Seed Data Files to Prepare

```
/demo-data/
  institutions.json          ← 6 institutions with metadata
  kpi_definitions.json       ← all KPI definitions with thresholds
  kpi_values_history.json    ← 12 months × 6 institutions × 20 KPIs
  alerts_active.json         ← 3 pre-seeded critical alerts
  predictions.json           ← pre-computed forecasts for all KPIs
  whatif_scenarios.json      ← pre-computed simulation results
  reports/
    rapport_mensuel_jan2026.pdf   ← pre-generated AI report
    rapport_etp_abandon.pdf       ← incident report for EPT
  uploads/
    budget_ihec_sample.xlsx       ← sample Excel for OCR demo
    resultats_examens_sample.pdf  ← sample PDF for ingestion demo
```

---

## Demo Data Anti-Patterns to Avoid

- ❌ Round numbers everywhere (74%, 80%, 90%) — looks fake
- ❌ All institutions performing similarly — no drama, no story
- ❌ Alerts that don't have a clear causal explanation
- ❌ Predictions that are just "current value + 2%"
- ❌ Using institution names not in the real UCAR list
- ❌ KPI values outside realistic Tunisian university ranges

## Realism Checks

- Tunisian university success rates typically range 60-85% ✓
- Budget execution at 88% with 4 months left is realistic and alarming ✓
- Scholarship processing at 38 days is a known real pain point ✓
- Teaching load near 400h threshold matches Tunisian regulations ✓
- Residence occupancy at 96% reflects known housing shortage ✓
