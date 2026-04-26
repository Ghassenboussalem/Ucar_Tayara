<div align="center">

# UCAR Intelligence

**Plateforme de pilotage universitaire nouvelle génération**  
*Built for HACK4UCAR 2025 — Université de Carthage*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Claude AI](https://img.shields.io/badge/Claude-3.7-CC785C?style=flat-square&logo=anthropic)](https://anthropic.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)](https://python.org)

> Centralisez, analysez et anticipez les données de 33 institutions — 30 000 étudiants, 3 000 personnels — en temps réel, avec un moteur d'IA prédictive intégré.

</div>

---

## Vue d'ensemble

UCAR Intelligence est une plateforme de gouvernance universitaire complète développée pour l'Université de Carthage. Elle centralise les KPIs de 33 établissements, détecte les anomalies en temps réel, génère des prévisions par IA et permet l'ingestion de données multi-formats (CSV, PDF, images).

La plateforme s'articule autour de trois services indépendants qui communiquent via API REST :

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UCAR Intelligence                           │
│                                                                     │
│   ┌──────────────┐    ┌──────────────┐    ┌───────────────────┐   │
│   │   Frontend   │    │   Backend    │    │   ETL Service     │   │
│   │  React 19    │◄──►│   FastAPI    │◄──►│   FastAPI +       │   │
│   │  Vite SPA    │    │ PostgreSQL   │    │   Groq Vision     │   │
│   │  Port 5173   │    │  Port 8000   │    │   Port 8001       │   │
│   └──────────────┘    └──────┬───────┘    └───────────────────┘   │
│                              │                                      │
│                    ┌─────────┴─────────┐                           │
│                    │   AI Engine       │                           │
│                    │  Claude (Anthropic)│                           │
│                    │  Groq (Llama 4)   │                           │
│                    │  ChromaDB (RAG)   │                           │
│                    └───────────────────┘                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fonctionnalités

### Tableau de bord
- Vue consolidée temps réel de l'ensemble du réseau UCAR
- Cartes KPI animées avec sparklines (taux de réussite, étudiants, alertes, budget)
- Filtrage par institution via le sélecteur en barre supérieure
- Résumé IA automatique à chaque chargement

### Gestion des institutions
- Fiche détaillée par établissement avec 8 domaines KPI : académique, finance, RH, recherche, ESG, infrastructures, partenariats, insertion professionnelle
- Graphe de causalité interactif entre indicateurs
- Score de santé global (0–100) avec alertes critiques

### Intelligence artificielle
| Module | Description |
|--------|-------------|
| **Chatbot IA** | Agent conversationnel Claude 3.7 avec accès au contexte institutionnel et navigation guidée |
| **Prévisions prédictives** | Régression polynomiale sur séries temporelles, horizon 2 semestres |
| **Graphe causal** | Réseau D3 force-directed visualisant les corrélations entre KPIs |
| **Multi-agents** | Orchestrateur → agents spécialisés (Prévision, Alertes, Benchmark, Stratégie) |
| **RAG** | Base de connaissances ChromaDB indexée sur 10 documents UCAR officiels |
| **Simulation What-If** | Scénarios interactifs (taux d'abandon, budget, charge enseignante) |

### Système d'alertes
- Détection automatique d'anomalies au démarrage du serveur
- 3 niveaux de sévérité : critique, attention, info
- Explication IA par alerte (contexte + recommandation)
- Résolution avec horodatage

### ETL & Ingestion de données
- Upload multi-formats : **CSV**, **PDF** (natif + scanné), **PNG/JPEG**
- OCR intelligent via Groq Llama 4 Vision pour les documents en arabe et français
- Graphe réseau interactif des fichiers ingérés (D3 force-directed)
- Validation et transformation automatique vers le schéma UCAR

### Rapports
- Génération PDF/Excel par établissement
- Types : mensuel, semestriel, annuel
- Bilingue français/arabe

### Carte interactive
- Localisation géographique des 33 établissements
- Score de santé par institution sur la carte

### Contrôle d'accès (RBAC)
| Rôle | Accès |
|------|-------|
| `presidency` | Toutes les institutions, tous les modules, causal graph, analytics prédictives |
| `institution_admin` | Sa propre institution + ETL + rapports |
| `viewer` | Lecture seule sur sa propre institution |

---

## Stack technique

### Frontend
| Technologie | Usage |
|-------------|-------|
| React 19 + Vite | Framework SPA |
| React Router v7 | Navigation |
| D3-force | Graphes réseau (causal + ETL) |
| Recharts | Sparklines et graphiques KPI |
| Lucide React | Iconographie |
| Axios | Appels API |

### Backend principal
| Technologie | Usage |
|-------------|-------|
| FastAPI 0.115 | API REST |
| SQLAlchemy 2 | ORM |
| PostgreSQL 17 | Base de données principale |
| Pydantic v2 | Validation des schémas |
| Python-JOSE | JWT Authentication |
| bcrypt | Hachage des mots de passe |
| scikit-learn | Modèles de prévision |
| ChromaDB | Vector store (RAG) |

### IA & LLMs
| Technologie | Usage |
|-------------|-------|
| Claude 3.7 Sonnet (Anthropic) | Chatbot, explications, rapports |
| Llama 4 Scout 17B (Groq) | OCR vision, structuration PDF/image |
| sentence-transformers | Embeddings pour le RAG |

### ETL Service
| Technologie | Usage |
|-------------|-------|
| FastAPI | API d'ingestion |
| pdfplumber | Extraction texte PDF natif |
| Groq Vision | OCR documents scannés / images |
| SQLite | Stockage des jobs ETL |

---

## Architecture du projet

```
Ucar_Tayara/
│
├── hack4ucar-frontend/          # SPA React 19
│   └── src/
│       ├── pages/               # 10 pages (Login, Dashboard, Institutions, Alerts,
│       │                        #          Map, Reports, Causal, Analytics, ETL, Detail)
│       ├── components/          # Layout, Sidebar, TopBar, WhatIfPanel, ChatPanel
│       ├── contexts/            # AuthContext (RBAC), LangContext (i18n fr/ar)
│       ├── api/                 # client.js (axios)
│       └── utils/               # institutionFilter.js
│
├── hack4ucar-backend/           # API principale FastAPI
│   ├── routes/
│   │   ├── api.py               # 25 endpoints REST
│   │   └── ingest.py            # Scan alertes & RAG ingestion
│   ├── models/                  # SQLAlchemy models + Pydantic schemas
│   ├── agents/                  # Multi-agents IA (orchestrator, forecast,
│   │                            #   alert_investigator, benchmark, strategic)
│   └── services/                # Auth, Claude, RAG, Forecast, Report
│
├── etl-main/                    # Service ETL indépendant
│   └── backend/
│       └── app/
│           ├── api/             # routes_ingestion.py
│           ├── services/        # ocr_service.py, parsing_service.py,
│           │                    #   validation_service.py, push_service.py
│           └── schemas/         # ingestion.py
│
├── rag_dataset/                 # Base de connaissances UCAR (10 documents)
│   ├── 01_Reglement_Examens_UCAR.md
│   ├── 02_Statut_Personnel_Enseignant.md
│   ├── 03_Guide_Gestion_Budgetaire.md
│   └── ...
│
├── test-data/                   # Jeux de données de démonstration
│   ├── EPT_academic_S1_2025.csv
│   ├── IHEC_hr_S1_2025_arabic.pdf
│   ├── SUPCOM_finance_S1_2025.pdf
│   └── ...
│
└── *.sql                        # Scripts de création et seed PostgreSQL
```

---

## Installation et démarrage

### Prérequis
- Node.js 20+
- Python 3.12+
- PostgreSQL 17
- Clés API : Anthropic, Groq

### 1. Base de données PostgreSQL

```bash
psql -U postgres -c "CREATE DATABASE ucar_db;"
psql -U postgres -d ucar_db -f 01_create_tables.sql
psql -U postgres -d ucar_db -f 02_institutions.sql
psql -U postgres -d ucar_db -f 03_academic_kpis.sql
psql -U postgres -d ucar_db -f 04_finance_kpis.sql
psql -U postgres -d ucar_db -f 05_hr_kpis.sql
psql -U postgres -d ucar_db -f 06_alerts_users.sql
psql -U postgres -d ucar_db -f 07_esg_kpis.sql
psql -U postgres -d ucar_db -f 08_research_kpis.sql
psql -U postgres -d ucar_db -f 09_infrastructure_kpis.sql
psql -U postgres -d ucar_db -f 10_partnership_kpis.sql
psql -U postgres -d ucar_db -f 11_employment_kpis.sql
```

### 2. Backend principal

```bash
cd hack4ucar-backend

# Créer et activer l'environnement virtuel
python -m venv venv
source venv/bin/activate       # Windows : venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
cp .env.example .env
# Renseigner : DATABASE_URL, SECRET_KEY, ANTHROPIC_API_KEY

# Lancer le serveur
uvicorn main:app --reload --port 8000
```

### 3. Service ETL

```bash
cd etl-main/backend

source ../../hack4ucar-backend/venv/bin/activate
pip install -r requirements.txt

# Configurer
cp ../../.env.example .env
# Renseigner : GROQ_API_KEY, PLATFORM_BASE_URL=http://localhost:8000/api

# Lancer le service ETL
uvicorn app.main:app --reload --port 8001
```

### 4. Frontend

```bash
cd hack4ucar-frontend
npm install
npm run dev
# → http://localhost:5173
```

---

## Comptes de démonstration

| Email | Mot de passe | Rôle | Périmètre |
|-------|-------------|------|-----------|
| `president@ucar.rnu.tn` | `demo1234` | 👑 Présidence | Réseau complet (33 institutions) |
| `admin.fsegn@ucar.rnu.tn` | `demo1234` | 🏛 Directeur | FSEGN uniquement |
| `admin.enstab@ucar.rnu.tn` | `demo1234` | 🏛 Directeur | ENSTAB uniquement |
| `admin.essths@ucar.rnu.tn` | `demo1234` | 🏛 Directeur | ESSTHS uniquement |
| `viewer.ihec@ucar.rnu.tn` | `demo1234` | 👁 Observateur | IHEC (lecture seule) |
| `viewer.supcom@ucar.rnu.tn` | `demo1234` | 👁 Observateur | SUPCOM (lecture seule) |

---

## API Reference

Le backend expose une API REST complète documentée automatiquement par FastAPI :

- **Swagger UI** : `http://localhost:8000/docs`
- **ReDoc** : `http://localhost:8000/redoc`

Principaux endpoints :

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/auth/login` | Authentification JWT |
| `GET` | `/api/dashboard` | Statistiques agrégées réseau |
| `GET` | `/api/institutions` | Liste des 33 institutions |
| `GET` | `/api/institutions/{id}` | Détail institution |
| `GET` | `/api/kpis/{id}/all` | Tous les KPIs d'une institution |
| `GET` | `/api/alerts` | Alertes actives |
| `GET` | `/api/alerts/{id}/explain` | Explication IA d'une alerte |
| `GET` | `/api/predictions` | Prévisions IA réseau |
| `GET` | `/api/causal/graph/all` | Graphe causal complet |
| `POST` | `/api/ai/chat` | Chatbot IA contextuel |
| `POST` | `/api/reports/generate` | Génération rapport PDF/Excel |

---

## Données KPI couverts

La plateforme suit **8 domaines** de performance :

| Domaine | Indicateurs clés |
|---------|-----------------|
| **Académique** | Taux de réussite, taux d'abandon, assiduité, note moyenne |
| **Finance** | Taux d'exécution budgétaire, coût par étudiant, répartition budget |
| **Ressources Humaines** | Effectifs, absentéisme, turnover, charge enseignante |
| **Recherche** | Publications, brevets, doctorants, financements |
| **ESG** | Consommation énergie, empreinte carbone, score gouvernance |
| **Infrastructures** | Taux d'occupation, maintenance, connectivité |
| **Partenariats** | Accords Erasmus, conventions entreprises, mobilité |
| **Insertion Pro.** | Taux d'employabilité, délai insertion, salaire médian |

---

## Équipe

Développé avec passion pour **HACK4UCAR 2025** — Université de Carthage, Tunisie.

---

<div align="center">
<sub>UCAR Intelligence · HACK4UCAR 2025 · Université de Carthage</sub>
</div>
