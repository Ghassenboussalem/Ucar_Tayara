<div align="center">

<img src="hack4ucar-frontend/public/ucar-logo.jpg" alt="Université de Carthage" width="90" style="border-radius:12px"/>

# UCAR Intelligence

### Plateforme de pilotage universitaire nouvelle génération

*HACK4UCAR 2025 — Université de Carthage, Tunisie*

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Claude AI](https://img.shields.io/badge/Claude_3.7-Anthropic-CC785C?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Groq](https://img.shields.io/badge/Groq-Llama_4-F55036?style=for-the-badge)](https://groq.com)

> **33 institutions · 30 000 étudiants · 3 000 personnels**  
> Centralisez, analysez et anticipez. En temps réel. Avec l'IA.

</div>

---

## Sommaire

1. [Contexte et problématique](#1-contexte-et-problématique)
2. [Vue d'ensemble de la solution](#2-vue-densemble-de-la-solution)
3. [Architecture système](#3-architecture-système)
4. [Modules et fonctionnalités](#4-modules-et-fonctionnalités)
5. [Moteur d'IA — architecture détaillée](#5-moteur-dia--architecture-détaillée)
6. [Données et KPIs couverts](#6-données-et-kpis-couverts)
7. [Contrôle d'accès (RBAC)](#7-contrôle-daccès-rbac)
8. [Pipeline ETL](#8-pipeline-etl)
9. [Stack technique complète](#9-stack-technique-complète)
10. [Structure du projet](#10-structure-du-projet)
11. [Installation et démarrage](#11-installation-et-démarrage)
12. [Variables d'environnement](#12-variables-denvironnement)
13. [API Reference](#13-api-reference)
14. [Comptes de démonstration](#14-comptes-de-démonstration)
15. [Données de test](#15-données-de-test)
16. [Dépannage](#16-dépannage)

---

## 1. Contexte et problématique

L'Université de Carthage (UCAR) regroupe **33 établissements d'enseignement supérieur** répartis sur plusieurs gouvernorats tunisiens. Chaque établissement gère de façon autonome ses données académiques, financières, RH, et infrastructurelles — produisant des rapports hétérogènes sous Excel, PDF ou papier.

**Les problèmes identifiés :**

| Problème | Impact |
|----------|--------|
| Données fragmentées entre 33 silos | Aucune vision consolidée en temps réel pour la présidence |
| Formats hétérogènes (Excel, PDF, images, arabe/français) | Impossibilité d'automatiser la collecte |
| Détection d'anomalies manuelle | Alertes tardives, réactions après-coup |
| Aucune capacité prédictive | Pas d'anticipation des crises (abandon, budget) |
| Rapports statiques et chronophages | 48–72h pour produire un bilan semestriel |

**UCAR Intelligence** répond à ces problèmes avec une plateforme unifiée, pilotée par l'IA, accessible à tous les niveaux hiérarchiques de l'université.

---

## 2. Vue d'ensemble de la solution

UCAR Intelligence est une **plateforme de Business Intelligence universitaire** qui combine :

- **Centralisation** : agrégation des KPIs de 33 institutions en une seule interface
- **Automatisation** : ingestion de données multi-formats via pipeline ETL avec OCR
- **Détection** : moteur d'alertes qui identifie les anomalies dès le chargement
- **Prédiction** : modèles ML qui anticipent les tendances sur 2 semestres
- **Explication** : IA générative (Claude 3.7) qui contextualise chaque indicateur
- **Action** : simulation What-If pour tester des scénarios avant de décider

La plateforme est bilingue (français / arabe), supporte l'internationalisation RTL, et propose trois niveaux d'accès distincts (Présidence, Directeur, Observateur).

---

## 3. Architecture système

### Vue macro

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                           UCAR Intelligence Platform                         ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   ┌─────────────────┐        ┌─────────────────┐      ┌──────────────────┐ ║
║   │                 │  HTTP  │                 │ HTTP │                  │ ║
║   │   FRONTEND      │◄──────►│   BACKEND API   │◄────►│   ETL SERVICE    │ ║
║   │   React 19      │        │   FastAPI       │      │   FastAPI        │ ║
║   │   Vite SPA      │        │   PostgreSQL    │      │   SQLite         │ ║
║   │   :5173         │        │   :8000         │      │   :8001          │ ║
║   │                 │        │                 │      │                  │ ║
║   └────────┬────────┘        └────────┬────────┘      └────────┬─────────┘ ║
║            │                          │                         │           ║
║            │              ┌───────────┴──────────┐             │           ║
║            │              │    AI ENGINE          │             │           ║
║            │              │                       │             │           ║
║            │              │  ┌─────────────────┐  │             │           ║
║            └──────────────┤  │  Claude 3.7     │  │◄────────────┘           ║
║                           │  │  (Anthropic)    │  │                         ║
║                           │  └─────────────────┘  │                         ║
║                           │  ┌─────────────────┐  │                         ║
║                           │  │  Llama 4 Vision  │  │                         ║
║                           │  │  (Groq API)     │  │                         ║
║                           │  └─────────────────┘  │                         ║
║                           │  ┌─────────────────┐  │                         ║
║                           │  │  ChromaDB       │  │                         ║
║                           │  │  (RAG / Vector) │  │                         ║
║                           │  └─────────────────┘  │                         ║
║                           └───────────────────────┘                         ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

### Flux de données

```
Établissement                  ETL Service                 Backend API
     │                              │                            │
     │  Upload CSV/PDF/PNG          │                            │
     │─────────────────────────────►│                            │
     │                              │  OCR (Groq Vision)         │
     │                              │  Parsing & Validation      │
     │                              │  Push KPIs                 │
     │                              │───────────────────────────►│
     │                              │                            │  Store PostgreSQL
     │                              │                            │  Trigger Alert Scan
     │                              │                            │  Update Health Score
     │                              │                            │
Frontend                            │                            │
     │                              │                            │
     │  GET /api/dashboard          │                            │
     │───────────────────────────────────────────────────────────►
     │◄───────────────────────────────────────────────────────────
     │  33 institutions + KPIs + Alerts + Predictions            │
```

---

## 4. Modules et fonctionnalités

### 4.1 Tableau de bord (`/dashboard`)

Le tableau de bord est le point d'entrée de la plateforme. Il offre une vision consolidée du réseau UCAR en temps réel.

**Ce qu'il affiche :**
- **4 cartes KPI principales** avec sparklines animées : institutions actives, étudiants suivis, taux de réussite moyen, alertes actives
- **Bandeau IA** : résumé automatique généré par Claude 3.7 au chargement — tendances, points critiques, recommandations
- **Prévisions prédictives** : 3 cartes ML (taux d'abandon, exécution budgétaire, charge enseignante) avec indicateur de confiance et horizon temporel
- **Liste des institutions** : tableau paginé (5 par page) avec score de santé, alertes critiques, et liens vers les fiches détaillées
- **Panneau What-If** : simulateur de scénarios — modifiez un paramètre (ex: +10% effectifs) et observez l'impact projeté
- **Alertes récentes** : 7 dernières alertes non résolues avec sévérité, domaine, et bouton d'explication IA

**Filtrage par institution** : Le sélecteur en TopBar permet à la Présidence de se concentrer sur un seul établissement. Pour les autres rôles, l'institution est pré-sélectionnée automatiquement selon le profil.

---

### 4.2 Institutions (`/institutions`)

Annuaire des 33 établissements du réseau UCAR avec filtrage temps réel.

**Carte institution :**
- Code et nom officiel de l'établissement
- Gouvernorat et type (université, école d'ingénieurs, ISET…)
- Score de santé global (0–100) avec code couleur : 🟢 ≥75 · 🟡 ≥55 · 🔴 <55
- Compteur d'alertes critiques actives
- Capacité d'accueil étudiante
- Nom du directeur

**Comportement selon le rôle :**
- `presidency` : voit toutes les 33 institutions avec barre de recherche
- `institution_admin` / `viewer` : redirigé automatiquement vers sa propre fiche

---

### 4.3 Fiche institution (`/institutions/:id`)

Page de détail complète pour chaque établissement, organisée en **8 onglets KPI** :

| Onglet | Indicateurs affichés |
|--------|---------------------|
| Académique | Taux de réussite/échec/abandon, note moyenne, assiduité, évolution semestrielle |
| Finance | Budget alloué vs consommé, taux d'exécution, coût/étudiant, répartition par poste |
| RH | Effectifs enseignants/admin, absentéisme, turnover, charge horaire moyenne |
| Recherche | Publications, brevets déposés, doctorants inscrits, financements obtenus |
| ESG | Consommation énergie, empreinte CO₂, score gouvernance, initiatives sociales |
| Infrastructures | Taux d'occupation salles, état maintenance, connectivité numérique |
| Partenariats | Accords Erasmus+, conventions entreprises, mobilités sortantes/entrantes |
| Insertion Pro. | Taux d'employabilité, délai moyen d'insertion, salaire médian à 6 mois |

Chaque onglet inclut un graphique de tendance sur les derniers semestres.

---

### 4.4 Carte interactive (`/map`)

Visualisation géographique des 33 établissements positionnés sur la carte de la Tunisie.

- Marqueurs colorés selon le score de santé
- Popup au survol : nom, code, score, alertes actives
- Vue d'ensemble ou zoom par gouvernorat

---

### 4.5 Alertes (`/alerts`)

Système de surveillance automatique et continu.

**Déclenchement :** Le moteur d'alertes s'exécute à chaque démarrage du backend et scanne l'ensemble des KPIs contre des seuils prédéfinis. Il peut aussi être déclenché manuellement via l'API.

**Cycle de vie d'une alerte :**
```
Détection KPI hors seuil
        │
        ▼
Création alerte (severity: critical | warning | info)
        │
        ▼
Notification dans le tableau de bord
        │
        ▼
Explication IA (Claude 3.7 analyse le contexte)
        │
        ▼
Résolution manuelle (avec horodatage)
        │
        ▼
Auto-résolution si le KPI repasse dans les seuils
```

**Filtres disponibles :** par sévérité, par domaine (académique, finance, RH…), par institution, par statut (ouverte/résolue)

**Explication IA :** Pour chaque alerte, Claude 3.7 génère une analyse contextuelle : cause probable, données comparatives avec le réseau, recommandations d'action.

---

### 4.6 Rapports (`/reports`)

Génération de rapports institutionnels structurés en PDF ou Excel.

**Types de rapports :**
- **Mensuel** : synthèse rapide, alertes du mois, évolution des KPIs clés
- **Semestriel** : rapport complet sur tous les domaines, comparaison N-1, classement réseau
- **Annuel** : bilan de l'année académique, tendances pluriannuelles, objectifs vs réalisations

**Formats supportés :**
- `PDF` : rapport mis en page, prêt à imprimer et signer
- `Excel` : données brutes structurées, exploitables dans un tableur

**Bilingue :** le paramètre `lang` (`fr` ou `ar`) permet de générer le rapport dans la langue souhaitée.

---

### 4.7 Graphe causal (`/causal`) — Présidence uniquement

Visualisation des **relations de causalité** entre indicateurs KPI à l'échelle du réseau.

Le graphe est construit à partir de l'analyse statistique des corrélations entre variables sur l'ensemble des 33 institutions. Il répond à la question : **"Quels facteurs influencent le taux de réussite ?"**

**Lecture du graphe :**
- Chaque nœud = un KPI (ex: taux d'assiduité, absentéisme enseignant, budget/étudiant)
- Chaque arête = une relation causale avec un poids (positif ou négatif)
- Les clusters révèlent des groupes d'indicateurs interdépendants

**Implémentation :** D3 force-directed simulation, 300 ticks synchrones pré-calculés, snapshot des positions, rendu SVG. Les nœuds sont déplaçables et les connexions affichent le coefficient de corrélation au survol.

---

### 4.8 Analytiques prédictives (`/analytics`) — Présidence uniquement

Tableau de bord des prévisions ML pour l'ensemble du réseau.

**Modèles disponibles :**

| Modèle | Méthode | Horizon |
|--------|---------|---------|
| Taux d'abandon | Régression polynomiale sur séries temporelles | 2 semestres |
| Exécution budgétaire | Régression linéaire avec trend saisonnier | 2 semestres |
| Charge enseignante | Régression sur effectifs et ratio | 2 semestres |

**Matrice de risque :** visualisation 2D (probabilité × impact) positionnant chaque institution selon son profil de risque.

**Comparateur A/B/C :** sélection de 3 institutions pour comparer leurs trajectoires prédictives côte à côte.

**ForecastChart :** graphique combiné valeurs historiques + prévisions avec intervalle de confiance.

---

### 4.9 Ingestion de données (`/ingestion`) — Présidence & Admins

Interface de téléversement et de traitement des données institutionnelles.

**Formats acceptés :**
- `.csv` : données structurées directement importées
- `.pdf` (texte natif) : extraction via pdfplumber
- `.pdf` (scanné / arabe) : OCR via Groq Llama 4 Vision
- `.png` / `.jpg` : OCR vision avec structuration automatique

**Graphe réseau des ingestions :**
Chaque fichier ingéré apparaît dans un graphe D3 force-directed. Les nœuds institutions (bleus, grands) sont connectés à leurs fichiers (colorés par domaine). Au survol : nom du fichier, domaine, statut, nombre de lignes, horodatage. Les nouveaux fichiers ont une aura lumineuse (glow).

**Statuts d'un job ETL :**
```
pending → processing → completed
                    └─► failed (avec message d'erreur)
```

---

### 4.10 Chatbot IA

Accessible depuis n'importe quelle page via le bouton **"IA"** en TopBar.

Le chatbot est alimenté par Claude 3.7 Sonnet avec accès à :
- Les données en temps réel de la plateforme (KPIs, alertes, institutions)
- La base de connaissances RAG (10 documents officiels UCAR)
- Le contexte de la page courante et de l'institution sélectionnée

**Capacités :**
- Répondre à des questions sur les performances d'un établissement
- Expliquer une alerte ou un indicateur
- Générer un résumé comparatif entre institutions
- Naviguer vers une page spécifique sur instruction ("montre-moi les alertes critiques de l'IHEC")
- Citer les textes réglementaires UCAR pertinents

**Guardrails :** Le chatbot refuse les requêtes hors périmètre (données personnelles, sujets non universitaires) avec un message explicite.

---

## 5. Moteur d'IA — architecture détaillée

### 5.1 Système multi-agents

Le backend implémente un système d'agents spécialisés orchestrés par un agent principal.

```
                    ┌──────────────────────┐
    Requête         │                      │
    utilisateur ───►│   ORCHESTRATEUR      │
                    │   (orchestrator.py)  │
                    │                      │
                    └──────────┬───────────┘
                               │ Route selon le type de requête
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   FORECAST   │  │   ALERT      │  │  STRATEGIC   │
    │   AGENT      │  │   INVESTIG.  │  │   AGENT      │
    │              │  │              │  │              │
    │ Analyse les  │  │ Explique les │  │ Recommanda-  │
    │ tendances,   │  │ anomalies,   │  │ tions de     │
    │ prédit les   │  │ identifie    │  │ haut niveau, │
    │ risques      │  │ les causes   │  │ benchmarking │
    └──────────────┘  └──────────────┘  └──────────────┘
              │
              ▼
    ┌──────────────┐
    │  BENCHMARK   │
    │  AGENT       │
    │              │
    │ Compare avec │
    │ les pairs,   │
    │ classements  │
    └──────────────┘
```

Chaque agent reçoit un contexte enrichi (données PostgreSQL + chunks RAG pertinents) et produit une réponse structurée.

---

### 5.2 RAG — Base de connaissances UCAR

Le système RAG (Retrieval-Augmented Generation) permet au chatbot de citer les textes officiels de l'Université de Carthage.

**Documents indexés :**

| # | Document | Contenu |
|---|----------|---------|
| 01 | Règlement des examens UCAR | Modalités d'évaluation, règles de rattrapage, fraudes |
| 02 | Statut du personnel enseignant | Grilles salariales, obligations de service, congés |
| 03 | Guide de gestion budgétaire | Procédures d'engagement, marchés publics, contrôles |
| 04 | Procédures d'inscription | Conditions d'admission, transferts, équivalences |
| 05 | Charte qualité et accréditation | Standards LMD, auto-évaluation, audit externe |
| 06 | Politique de recherche et innovation | Projets ANPR, brevets, valorisation |
| 07 | Cadre partenariats Erasmus+ | Conventions inter-universitaires, mobilité |
| 08 | Plan stratégique RSE | Engagements ESG, développement durable |
| 09 | Référentiel compétences employabilité | Stages obligatoires, insertion professionnelle |
| 10 | Manuel de gouvernance | Organigramme, délégations de pouvoir, processus décision |

**Pipeline RAG :**
```
Question utilisateur
        │
        ▼
Génération embedding (sentence-transformers)
        │
        ▼
Recherche vectorielle ChromaDB (top-k chunks)
        │
        ▼
Injection dans le contexte Claude 3.7
        │
        ▼
Réponse citant les sources
```

---

### 5.3 Prévisions ML

Les prévisions sont calculées par `forecast_service.py` avec la librairie scikit-learn.

**Algorithme :**
1. Récupération des données historiques par institution et par domaine
2. Conversion des semestres en valeurs numériques ordonnées
3. Ajustement d'un polynôme de degré 2 (ou régression linéaire si données insuffisantes)
4. Projection sur 2 périodes futures
5. Calcul d'un indicateur de confiance basé sur le R² du modèle
6. Classement automatique : `critical` si la valeur prédite dépasse le seuil d'alerte

**Indicateur de confiance :**
- 85–100% : modèle fiable, historique riche (≥6 points)
- 65–84% : modèle acceptable, 3–5 points de données
- <65% : prévision indicative, peu de données

---

### 5.4 Simulation What-If

Le panneau What-If permet de simuler l'impact d'une décision avant de l'appliquer.

**Scénarios disponibles :**

| Scénario | Variable modifiée | Impact simulé |
|----------|-----------------|---------------|
| `dropout` | Taux d'abandon actuel | Effet sur le taux de réussite et les effectifs |
| `budget` | Budget alloué | Variation du coût/étudiant et de la qualité de service |
| `load` | Charge enseignante (h/semaine) | Impact sur l'absentéisme et les performances académiques |

L'utilisateur déplace un curseur, et les projections se recalculent en temps réel côté frontend.

---

## 6. Données et KPIs couverts

### Modèle de données

La base PostgreSQL contient **11 tables principales** :

```sql
institutions          -- 33 établissements UCAR
academic_kpis         -- Indicateurs pédagogiques par semestre
finance_kpis          -- Données financières par année fiscale
hr_kpis               -- Ressources humaines par semestre
research_kpis         -- Production scientifique
esg_kpis              -- Indicateurs environnementaux et sociaux
infrastructure_kpis   -- État du parc immobilier et numérique
partnership_kpis      -- Accords et mobilités internationales
employment_kpis       -- Insertion professionnelle des diplômés
alerts                -- Anomalies détectées avec historique
users                 -- Comptes avec rôles et périmètres
```

### Catalogue des KPIs

#### Domaine Académique
| Champ | Description | Unité |
|-------|-------------|-------|
| `total_enrolled` | Étudiants inscrits | Nombre |
| `total_passed` | Étudiants ayant réussi | Nombre |
| `total_failed` | Étudiants ayant échoué | Nombre |
| `total_dropped` | Abandons en cours de semestre | Nombre |
| `success_rate` | Taux de réussite | % |
| `dropout_rate` | Taux d'abandon | % |
| `attendance_rate` | Taux d'assiduité moyen | % |
| `repetition_rate` | Taux de redoublement | % |
| `avg_grade` | Note moyenne générale | /20 |

#### Domaine Finance
| Champ | Description | Unité |
|-------|-------------|-------|
| `allocated_budget` | Budget alloué | TND |
| `consumed_budget` | Budget consommé | TND |
| `budget_execution_rate` | Taux d'exécution | % |
| `cost_per_student` | Coût moyen par étudiant | TND |
| `staff_budget_pct` | Part masse salariale | % |
| `infrastructure_budget_pct` | Part infrastructures | % |
| `research_budget_pct` | Part recherche | % |

#### Domaine RH
| Champ | Description | Unité |
|-------|-------------|-------|
| `total_teaching_staff` | Enseignants permanents | Nombre |
| `total_admin_staff` | Personnel administratif | Nombre |
| `absenteeism_rate` | Taux d'absentéisme | % |
| `avg_teaching_load_hours` | Charge horaire moyenne | h/semaine |
| `staff_turnover_rate` | Taux de rotation | % |
| `training_completion_rate` | Formation continue | % |
| `permanent_staff_pct` | Part CDI/CDIESS | % |

---

## 7. Contrôle d'accès (RBAC)

La plateforme implémente un système RBAC (Role-Based Access Control) à trois niveaux, appliqué à la fois côté frontend (React Context) et côté backend (JWT claims).

### Matrice des permissions

| Permission | `presidency` | `institution_admin` | `viewer` |
|-----------|:---:|:---:|:---:|
| Voir toutes les institutions | ✅ | ❌ | ❌ |
| Voir sa propre institution | ✅ | ✅ | ✅ |
| Graphe causal | ✅ | ❌ | ❌ |
| Analytiques prédictives | ✅ | ❌ | ❌ |
| Ingestion de données (ETL) | ✅ | ✅ | ❌ |
| Générer des rapports | ✅ | ✅ | ❌ |
| Résoudre des alertes | ✅ | ✅ | ❌ |
| Voir la carte | ✅ | ✅ | ✅ |
| Chatbot IA | ✅ | ✅ | ✅ |
| Sélecteur d'institution (TopBar) | ✅ | ❌ | ❌ |

### Implémentation technique

**Backend (JWT) :** Le token JWT contient `role` et `institution_id`. Les endpoints sensibles vérifient ces claims via les dépendances FastAPI `get_current_user` et `get_optional_user`.

**Frontend (React Context) :**
```
AuthContext
├── user           → données du profil (full_name, role, institution_id)
├── role           → 'presidency' | 'institution_admin' | 'viewer'
├── institutionId  → null (présidence) | integer (autres)
├── isPresidency   → boolean
└── can(permission) → boolean — consulte la matrice PERMISSIONS
```

`AuthProvider` écoute l'événement `ucar_user_change` pour se mettre à jour réactivement lors du login/logout, sans rechargement de page.

**Scoping automatique :** Quand un utilisateur non-presidency se connecte, son institution est automatiquement sélectionnée comme filtre actif, et toutes les données du dashboard sont scopées à son établissement.

---

## 8. Pipeline ETL

### Vue d'ensemble

```
Fichier uploadé
      │
      ▼
┌─────────────────────────────────────────────────────┐
│                  ETL Service (:8001)                 │
│                                                     │
│  ┌─────────────┐    ┌──────────────┐               │
│  │   Upload    │───►│  Detection   │               │
│  │   Handler   │    │  du format   │               │
│  └─────────────┘    └──────┬───────┘               │
│                             │                       │
│                 ┌───────────┼───────────┐           │
│                 ▼           ▼           ▼           │
│           ┌──────────┐ ┌────────┐ ┌─────────┐      │
│           │   CSV    │ │  PDF   │ │  Image  │      │
│           │ Parsing  │ │ Native │ │  OCR    │      │
│           └────┬─────┘ └───┬────┘ └────┬────┘      │
│                │           │           │            │
│                │      pdfplumber   Groq Vision      │
│                │           │       (Llama 4)        │
│                └───────────┴───────────┘            │
│                            │                        │
│                   ┌────────▼────────┐               │
│                   │  Structuration  │               │
│                   │  Groq LLM →    │               │
│                   │  JSON normalisé │               │
│                   └────────┬────────┘               │
│                            │                        │
│                   ┌────────▼────────┐               │
│                   │   Validation    │               │
│                   │   du schéma     │               │
│                   └────────┬────────┘               │
│                            │                        │
│                   ┌────────▼────────┐               │
│                   │  Push vers      │               │
│                   │  Backend API    │               │
│                   │  (/api/kpis/...) │               │
│                   └─────────────────┘               │
└─────────────────────────────────────────────────────┘
```

### Traitement par format

**CSV :**
- Lecture directe avec pandas/csv
- Mapping des colonnes vers le schéma UCAR (heuristique sur les noms de colonnes)
- Validation des types et des plages de valeurs

**PDF texte natif :**
- Extraction avec `pdfplumber` (préserve la structure)
- Structuration via Groq Llama 4 : le texte brut est converti en JSON structuré
- Fallback heuristique si la réponse LLM n'est pas parseable

**PDF scanné / Image :**
- Conversion en base64
- Envoi à Groq Llama 4 Vision (`meta-llama/llama-4-scout-17b-16e-instruct`)
- Le modèle transcrit et structure directement le contenu visuel
- Supporte l'arabe, le français, et les tableaux mixtes

### Nommage des fichiers

Le pipeline détecte automatiquement le domaine et l'institution à partir du nom de fichier :

```
{CODE_INSTITUTION}_{DOMAIN}_{PERIOD}.{ext}

Exemples :
  IHEC_hr_S1_2025.csv          → IHEC, domaine RH, semestre 1 2025
  SUPCOM_finance_S1_2025.pdf   → SUPCOM, finance, S1 2025
  EPT_academic_S1_2025.csv     → EPT, académique, S1 2025
```

**Domaines reconnus :** `academic`, `finance`, `hr`, `research`, `esg`, `infrastructure`, `partnership`, `employment`

---

## 9. Stack technique complète

### Frontend

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 19 | Framework UI avec concurrent features |
| Vite | 6 | Build tool, HMR ultra-rapide |
| React Router | 7 | SPA routing, routes protégées par rôle |
| D3-force | 3 | Simulation physique pour graphes réseau |
| Recharts | 2 | Sparklines et graphiques KPI |
| Lucide React | Latest | Iconographie cohérente |
| Axios | 1 | Client HTTP avec intercepteurs JWT |

**Patterns :**
- `AuthContext` : RBAC réactif via événements custom (`ucar_user_change`)
- `LangContext` : i18n fr/ar avec support RTL (`isRTL`, `dateLocale`)
- `institutionFilter.js` : filtre institution persisté en sessionStorage

### Backend principal

| Technologie | Version | Rôle |
|-------------|---------|------|
| FastAPI | 0.115 | Framework API asynchrone |
| SQLAlchemy | 2.0 | ORM avec sessions contextuelles |
| PostgreSQL | 17 | Base de données relationnelle |
| Pydantic | v2 | Validation et sérialisation des schémas |
| Python-JOSE | 3.3 | Création et vérification JWT |
| bcrypt | 4 | Hachage sécurisé des mots de passe |
| scikit-learn | 1.5 | Régression polynomiale pour prévisions |
| ChromaDB | 0.5 | Vector store pour RAG |
| sentence-transformers | 3 | Génération d'embeddings |
| ReportLab | 4 | Génération PDF |
| openpyxl | 3 | Génération Excel |
| anthropic | Latest | SDK Claude 3.7 |

### ETL Service

| Technologie | Version | Rôle |
|-------------|---------|------|
| FastAPI | 0.115 | API d'ingestion indépendante |
| pdfplumber | 0.11 | Extraction texte PDF structuré |
| Groq | Latest | SDK pour Llama 4 Vision |
| SQLite | Built-in | Stockage des jobs ETL |
| httpx | 0.27 | Client HTTP async pour push vers backend |

### Infrastructure IA

| Service | Modèle | Usage |
|---------|--------|-------|
| Anthropic API | `claude-sonnet-4-6` | Chatbot, explications, rapports, agents |
| Groq API | `meta-llama/llama-4-scout-17b-16e-instruct` | OCR vision, structuration documents |
| ChromaDB | Local | Vector store pour 10 documents RAG |
| sentence-transformers | `all-MiniLM-L6-v2` | Embeddings des chunks de documents |

---

## 10. Structure du projet

```
Ucar_Tayara/
│
├── README.md                        ← Ce fichier
├── .gitignore
│
├── 01_create_tables.sql             ← Schéma de la base de données
├── 02_institutions.sql              ← Seed : 33 établissements UCAR
├── 03_academic_kpis.sql             ← Données académiques de démo
├── 04_finance_kpis.sql              ← Données financières de démo
├── 05_hr_kpis.sql                   ← Données RH de démo
├── 06_alerts_users.sql              ← Alertes initiales + 6 comptes démo
├── 07_esg_kpis.sql                  ← Données ESG de démo
├── 08_research_kpis.sql             ← Données recherche de démo
├── 09_infrastructure_kpis.sql       ← Données infrastructures de démo
├── 10_partnership_kpis.sql          ← Données partenariats de démo
├── 11_employment_kpis.sql           ← Données insertion pro de démo
│
├── hack4ucar-frontend/              ← Application React 19 (SPA)
│   ├── public/
│   │   ├── ucar-logo.jpg            ← Logo officiel Université de Carthage
│   │   └── favicon.svg
│   ├── src/
│   │   ├── App.jsx                  ← Routes + ProtectedRoute + RoleRoute
│   │   ├── main.jsx
│   │   ├── index.css
│   │   ├── api/
│   │   │   └── client.js            ← Axios + tous les appels API
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx      ← RBAC réactif (3 rôles)
│   │   │   └── LangContext.jsx      ← i18n fr/ar + RTL
│   │   ├── components/
│   │   │   ├── Layout.jsx           ← Shell (Sidebar + TopBar + Outlet)
│   │   │   ├── Sidebar.jsx          ← Nav filtrée par rôle + profil utilisateur
│   │   │   ├── TopBar.jsx           ← Sélecteur institution + langue + chat
│   │   │   ├── ChatPanel.jsx        ← Interface chatbot IA
│   │   │   ├── WhatIfPanel.jsx      ← Simulateur de scénarios
│   │   │   ├── ForecastChart.jsx    ← Graphique prévisions + historique
│   │   │   └── RiskMatrix.jsx       ← Matrice risque 2D
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        ← Auth + comptes démo
│   │   │   ├── DashboardPage.jsx    ← Vue consolidée réseau
│   │   │   ├── InstitutionsPage.jsx ← Liste 33 établissements
│   │   │   ├── InstitutionDetailPage.jsx ← Fiche KPI complète
│   │   │   ├── AlertsPage.jsx       ← Gestion des alertes
│   │   │   ├── ReportsPage.jsx      ← Génération PDF/Excel
│   │   │   ├── MapPage.jsx          ← Carte géographique
│   │   │   ├── CausalGraphPage.jsx  ← Graphe causal D3
│   │   │   ├── PredictiveAnalyticsPage.jsx ← Analytics ML
│   │   │   └── DataIngestionPage.jsx ← ETL + graphe réseau
│   │   └── utils/
│   │       └── institutionFilter.js ← Filtre institution (sessionStorage)
│   ├── package.json
│   └── vite.config.js
│
├── hack4ucar-backend/               ← API FastAPI principale
│   ├── main.py                      ← App FastAPI, CORS, lifespan
│   ├── database.py                  ← SQLAlchemy engine + sessions
│   ├── models/
│   │   ├── models.py                ← 11 modèles SQLAlchemy
│   │   └── schemas.py               ← 20+ schémas Pydantic
│   ├── routes/
│   │   ├── api.py                   ← 25 endpoints REST
│   │   └── ingest.py                ← Scan alertes + ingestion RAG
│   ├── agents/
│   │   ├── orchestrator.py          ← Agent principal, routing
│   │   ├── forecast.py              ← Agent prévisions
│   │   ├── alert_investigator.py    ← Agent analyse alertes
│   │   ├── strategic.py             ← Agent recommandations
│   │   ├── benchmark.py             ← Agent comparaisons
│   │   ├── _model.py                ← Configuration LLM partagée
│   │   └── _guardrails.py           ← Filtres de sécurité
│   └── services/
│       ├── auth_service.py          ← JWT + bcrypt
│       ├── claude_service.py        ← Intégration Claude 3.7
│       ├── agent_service.py         ← Dispatch vers agents
│       ├── rag_service.py           ← ChromaDB + embeddings
│       ├── forecast_service.py      ← Modèles ML scikit-learn
│       └── report_service.py        ← Génération PDF/Excel
│
├── etl-main/                        ← Service ETL indépendant
│   ├── docker-compose.yml
│   └── backend/
│       ├── requirements.txt
│       └── app/
│           ├── main.py              ← App FastAPI ETL
│           ├── api/
│           │   └── routes_ingestion.py ← Endpoints upload/jobs
│           ├── services/
│           │   ├── ocr_service.py   ← Groq Vision OCR
│           │   ├── parsing_service.py ← CSV/PDF parsing
│           │   ├── validation_service.py ← Validation schéma
│           │   └── push_service.py  ← Push vers backend API
│           ├── schemas/
│           │   └── ingestion.py     ← Modèles Pydantic ETL
│           └── models/
│               └── models.py        ← SQLAlchemy jobs ETL
│
├── rag_dataset/                     ← Base de connaissances UCAR
│   ├── 01_Reglement_Examens_UCAR.md
│   ├── 02_Statut_Personnel_Enseignant.md
│   ├── 03_Guide_Gestion_Budgetaire.md
│   ├── 04_Procedures_Inscription.md
│   ├── 05_Charte_Qualite_Accreditation.md
│   ├── 06_Politique_Recherche_Innovation.md
│   ├── 07_Cadre_Partenariats_Erasmus.md
│   ├── 08_Plan_Strategique_RSE.md
│   ├── 09_Referentiel_Competences_Employabilite.md
│   └── 10_Manuel_Procedures_Gouvernance.md
│
└── test-data/                       ← Fichiers de test ETL
    ├── EPT_academic_S1_2025.csv
    ├── FSB_hr_S1_2025.csv
    ├── INAT_research_S1_2025.csv
    ├── INSAT_finance_S1_2025.csv
    ├── ISEP_employment_S1_2025.csv
    ├── ISPT_esg_S1_2025.csv
    ├── ISSBC_infrastructure_S1_2025.csv
    ├── IHEC.png                     ← Test OCR image
    ├── IHEC_hr_S1_2025_arabic.pdf   ← Test OCR arabe
    ├── SUPCOM_finance_S1_2025.pdf   ← Test PDF scanné
    └── generate_test_files.py
```

---

## 11. Installation et démarrage

### Prérequis

| Outil | Version minimale | Vérification |
|-------|-----------------|--------------|
| Node.js | 20 LTS | `node --version` |
| Python | 3.12 | `python --version` |
| PostgreSQL | 15+ | `psql --version` |
| npm | 10+ | `npm --version` |

**Clés API nécessaires :**
- [Anthropic API Key](https://console.anthropic.com) — pour Claude 3.7
- [Groq API Key](https://console.groq.com) — pour Llama 4 Vision (OCR)

---

### Étape 1 — Base de données PostgreSQL

```bash
# Créer la base
psql -U postgres -c "CREATE DATABASE ucar_db;"

# Appliquer les migrations et les données de démo (dans l'ordre)
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

> Le fichier `06_alerts_users.sql` crée les 6 comptes de démonstration avec des mots de passe bcrypt pré-hashés (`demo1234`).

---

### Étape 2 — Backend principal (Port 8000)

```bash
cd hack4ucar-backend

# Environnement virtuel
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Dépendances
pip install -r requirements.txt

# Configuration (voir section Variables d'environnement)
nano .env

# Lancement
uvicorn main:app --reload --port 8000
```

**Au démarrage, le backend :**
1. Synchronise les séquences PostgreSQL
2. Scanne tous les KPIs et génère/résout les alertes automatiquement
3. Ingère la base de connaissances RAG (idempotent)

Vérification : `http://localhost:8000/docs` → Swagger UI

---

### Étape 3 — Service ETL (Port 8001)

```bash
cd etl-main/backend

# Utilise le même venv que le backend ou en crée un nouveau
source ../../hack4ucar-backend/venv/bin/activate
pip install -r requirements.txt

# Configuration
nano .env

# Lancement
uvicorn app.main:app --reload --port 8001
```

Vérification : `http://localhost:8001/docs`

---

### Étape 4 — Frontend (Port 5173)

```bash
cd hack4ucar-frontend

npm install
npm run dev
```

Ouvrir `http://localhost:5173` dans le navigateur.

---

## 12. Variables d'environnement

### Backend (`hack4ucar-backend/.env`)

| Variable | Exemple | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/ucar_db` | URL de connexion PostgreSQL |
| `SECRET_KEY` | `your-secret-key-min-32-chars` | Clé de signature JWT (≥32 caractères) |
| `ALGORITHM` | `HS256` | Algorithme JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Durée de validité du token (8h) |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | Clé API Anthropic (Claude) |

### ETL Service (`etl-main/.env`)

| Variable | Exemple | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | `gsk_...` | Clé API Groq (Llama 4 Vision) |
| `PLATFORM_BASE_URL` | `http://localhost:8000/api` | URL du backend principal |
| `PLATFORM_API_KEY` | `internal-key` | Clé d'authentification inter-services |
| `ETL_DB_URL` | `sqlite:///./ucar_etl.db` | Base SQLite des jobs ETL |

---

## 13. API Reference

La documentation interactive est disponible sur :
- **Swagger UI** : `http://localhost:8000/docs`
- **ReDoc** : `http://localhost:8000/redoc`

### Authentification

Tous les endpoints (sauf `/api/auth/login`) requièrent un header `Authorization: Bearer <token>`.

```bash
# Obtenir un token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "president@ucar.rnu.tn", "password": "demo1234"}'

# Réponse
{
  "access_token": "eyJhbGci...",
  "token_type": "bearer",
  "role": "presidency",
  "full_name": "Mohamed Salah Ben Aissa",
  "institution_id": null
}
```

### Endpoints principaux

#### Auth & Profil

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Authentification, retourne JWT + profil |

#### Dashboard & Institutions

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/dashboard` | ✅ | Stats agrégées : institutions, alertes, KPIs moyens |
| `GET` | `/api/institutions` | ✅ | Liste complète des 33 institutions |
| `GET` | `/api/institutions/scores` | ✅ | Scores de santé et alertes critiques par institution |
| `GET` | `/api/institutions/{id}` | ✅ | Détail complet d'une institution |

#### KPIs

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/kpis/{id}/academic` | ✅ | KPIs académiques historiques |
| `GET` | `/api/kpis/{id}/finance` | ✅ | KPIs financiers historiques |
| `GET` | `/api/kpis/{id}/hr` | ✅ | KPIs RH historiques |
| `GET` | `/api/kpis/{id}/all` | ✅ | Tous les KPIs (8 domaines) en une requête |

#### Prévisions & IA

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/predictions` | ✅ | Prévisions ML pour l'ensemble du réseau |
| `GET` | `/api/forecast/{id}/academic/{kpi}` | ✅ | Prévision détaillée d'un KPI académique |
| `GET` | `/api/forecast/{id}/finance/{kpi}` | ✅ | Prévision détaillée d'un KPI finance |
| `GET` | `/api/forecast/{id}/hr/{kpi}` | ✅ | Prévision détaillée d'un KPI RH |
| `GET` | `/api/forecast/risk-matrix` | ✅ | Matrice de risque réseau |
| `GET` | `/api/causal/graph/all` | ✅ | Graphe causal complet (nœuds + arêtes) |
| `GET` | `/api/causal/{kpi_name}` | ✅ | Relations causales d'un KPI spécifique |

#### Alertes

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `GET` | `/api/alerts` | ✅ | Alertes actives (filtres: institution, sévérité, domaine) |
| `PATCH` | `/api/alerts/{id}/resolve` | ✅ | Marquer une alerte comme résolue |
| `GET` | `/api/alerts/{id}/explain` | ✅ | Explication IA de l'alerte |

#### IA & Chat

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/api/ai/chat` | ✅ | Chat avec l'agent IA (historique + contexte) |
| `GET` | `/api/ai/agent-status` | ✅ | Statut du système multi-agents |
| `GET` | `/api/ai/rag-stats` | ✅ | Statistiques de la base vectorielle |

#### Rapports

| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| `POST` | `/api/reports/generate` | ✅ | Génère un rapport PDF ou Excel |

### Endpoints ETL (Port 8001)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/upload` | Upload et traitement d'un fichier |
| `GET` | `/api/jobs` | Liste des jobs avec statut et métadonnées |
| `GET` | `/api/jobs/{id}` | Détail d'un job ETL |

---

## 14. Comptes de démonstration

> Mot de passe universel : **`demo1234`**

| Email | Rôle | Périmètre | Accès spéciaux |
|-------|------|-----------|----------------|
| `president@ucar.rnu.tn` | 👑 Présidence UCAR | 33 institutions | Causal, Analytics, ETL, Rapports, Résolution alertes |
| `admin.fsegn@ucar.rnu.tn` | 🏛 Directeur FSEGN | FSEGN uniquement | ETL, Rapports, Résolution alertes |
| `admin.enstab@ucar.rnu.tn` | 🏛 Directeur ENSTAB | ENSTAB uniquement | ETL, Rapports, Résolution alertes |
| `admin.essths@ucar.rnu.tn` | 🏛 Directeur ESSTHS | ESSTHS uniquement | ETL, Rapports, Résolution alertes |
| `viewer.ihec@ucar.rnu.tn` | 👁 Observateur IHEC | IHEC (lecture seule) | Dashboard, Alertes (lecture) |
| `viewer.supcom@ucar.rnu.tn` | 👁 Observateur SUPCOM | SUPCOM (lecture seule) | Dashboard, Alertes (lecture) |

---

## 15. Données de test

Le dossier `test-data/` contient des jeux de données réalistes pour tester le pipeline ETL :

| Fichier | Format | Institution | Domaine |
|---------|--------|-------------|---------|
| `EPT_academic_S1_2025.csv` | CSV | EPT | Académique |
| `FSB_hr_S1_2025.csv` | CSV | FSB | Ressources Humaines |
| `INAT_research_S1_2025.csv` | CSV | INAT | Recherche |
| `INSAT_finance_S1_2025.csv` | CSV | INSAT | Finance |
| `ISEP_employment_S1_2025.csv` | CSV | ISEP | Insertion Pro. |
| `ISPT_esg_S1_2025.csv` | CSV | ISPT | ESG |
| `ISSBC_infrastructure_S1_2025.csv` | CSV | ISSBC | Infrastructures |
| `IHEC.png` | Image PNG | IHEC | Test OCR visuel |
| `IHEC_hr_S1_2025_arabic.pdf` | PDF arabe | IHEC | Test OCR bilingue |
| `SUPCOM_finance_S1_2025.pdf` | PDF scanné | SUPCOM | Test OCR PDF |

---

## 16. Dépannage

### Le backend ne démarre pas

```
sqlalchemy.exc.OperationalError: could not connect to server
```
→ Vérifiez que PostgreSQL tourne et que `DATABASE_URL` dans `.env` est correcte.

---

### L'ETL échoue sur les PDF/images

```
Error: GROQ_API_KEY not set
```
→ Vérifiez que `etl-main/.env` contient bien votre `GROQ_API_KEY`.

---

### Erreur de mot de passe au login

```
401 - Email ou mot de passe incorrect
```
→ Assurez-vous d'avoir exécuté `06_alerts_users.sql` qui crée les comptes avec les hashes bcrypt corrects.

---

### Le graphe causal est vide

→ Le graphe nécessite des données dans au moins 3 domaines KPI sur plusieurs semestres. Vérifiez que les scripts SQL `03` à `11` ont bien été exécutés.

---

### Les prévisions retournent une confiance faible (<65%)

→ Normal si peu de données historiques. Les modèles ML s'améliorent avec l'accumulation de données semestrielles.

---

### Erreur `non-monotonic index` dans git

→ Ces messages proviennent des fichiers de métadonnées macOS (`._*`) dans le répertoire `.git/`. Ils sont purement cosmétiques et n'affectent pas le fonctionnement de git.

---

<div align="center">

---

**UCAR Intelligence** · HACK4UCAR 2025  
Université de Carthage — Tunisie

*Développé avec React 19, FastAPI, Claude 3.7, et beaucoup de café.*

</div>
