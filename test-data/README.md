# Fichiers de test — UCAR Intelligence Platform

Chaque fichier est conçu pour **déclencher des alertes** lors de l'ingestion ETL.

## Fichiers disponibles

| Fichier | Institution | Domaine | Alertes attendues |
|---------|-------------|---------|-------------------|
| `EPT_academic_S1_2025.csv` | EPT | Académique | 🔴 **Taux de réussite critique** — 40% seulement (seuil: 50%) |
| `INSAT_finance_S1_2025.csv` | INSAT | Finance | 🔴 **Dépassement budget critique** — ~130% d'exécution (seuil: 100%) |
| `FSB_hr_S1_2025.csv` | FSB | RH | 🔴 **Absentéisme critique** — ~25% jours perdus (seuil: 20%) |
| `ISPT_esg_S1_2025.csv` | ISPT | ESG | 🟠 **Recyclage insuffisant** — 18% (seuil: 30%) + accessibilité PMR 42% |
| `INAT_research_S1_2025.csv` | INAT | Recherche | 🟠 **Activité recherche faible** — peu de publications, aucun brevet |
| `ISEP_employment_S1_2025.csv` | ISEP | Emploi | 🔴 **Taux d'emploi bas** — ~38-40% à 6 mois (seuil: 60%) |
| `ISSBC_infrastructure_S1_2025.csv` | ISSBC | Infrastructure | 🔴 **Actifs critiques** — groupe électrogène non maintenu, suroccupation amphi |

## Comment tester

### Via l'interface (Import Manuel)
1. Aller sur `/ingestion`
2. Sélectionner l'institution correspondante
3. Glisser-déposer le fichier CSV
4. Observer la pipeline s'activer + la ligne apparaître dans le flux en direct
5. Les alertes toast apparaissent dans le coin supérieur droit

### Via le Mode Démo Hackathon
1. Aller sur `/ingestion` → onglet "Mode Démo"
2. Choisir un scénario dans la liste
3. Cliquer "Lancer"
4. Observer l'animation du flux Institution → ETL → Plateforme
5. L'alerte s'affiche automatiquement

### Via l'API ETL directement
```bash
# Upload single file
curl -X POST http://localhost:8001/api/upload-async \
  -u admin1:admin123 \
  -F "file=@EPT_academic_S1_2025.csv" \
  -F "institution=EPT" \
  -F "document_type=academic"

# Trigger demo scenario
curl -X POST http://localhost:8001/api/demo/trigger \
  -F "scenario=ept_academic_crisis"

# List available scenarios
curl http://localhost:8001/api/demo/scenarios
```

## Format des fichiers

### academic (grades)
Colonnes requises : `student_id, grade, enrolled`
Colonnes optionnelles : `full_name, module, status`

### finance (budget)
Colonnes requises : `allocated_tnd, consumed_tnd`
Colonnes optionnelles : `budget_line, department, category`

### hr (staff)
Colonnes requises : `staff_type, headcount, working_days, absent_days`
Colonnes optionnelles : `employee_id, full_name, department, resigned, hired`

### esg
Colonnes requises : `indicator, value, unit`
Colonnes optionnelles : `target, category, notes`

### research
Colonnes requises : `publications_count, citations_count, phd_students`
Colonnes optionnelles : `lab_name, domain, patents_filed, external_funding_tnd`

### employment
Colonnes requises : `graduates_count, employed_6months, unemployed_12months`
Colonnes optionnelles : `degree_level, speciality, avg_salary_tnd, employed_in_field_pct`

### infrastructure
Colonnes requises : `asset_name, category, capacity, current_usage, condition_score`
Colonnes optionnelles : `maintenance_status, last_maintenance_date, annual_maintenance_cost_tnd`
