Voici la version finale et optimisée de votre Cahier des Charges pour le Track 1 : Data Ingestion, Validation et Stockage, conçue pour être précise, technique et actionnable avec Cursor ou tout autre outil de développement. Ce document est structuré pour couvrir uniquement les besoins de votre équipe, avec une focalisation sur l’ingestion automatisée, la validation intelligente, et le stockage sécurisé des données.


📌 Cahier des Charges Final : UCAR Data Hub (Track 1)
Projet : Plateforme d’ingestion, validation et stockage des données universitaires (PDFs, Excel, images) pour l’UCAR.

Objectif : Automatiser 90% du processus manuel actuel en remplaçant la saisie et la validation par des pipelines ETL intelligents avec IA.

Stack Technique :

Backend : FastAPI (Python)
Frontend : React + Vite
Base de Données : SQLite (données structurées) + FAISS (données vectorielles)
OCR : PaddleOCR + Tesseract
LLM : Mistral (pour la normalisation et la validation contextuelle)
ETL : Apache Airflow (orchestration)
Sécurité : JWT + RBAC + Chiffrement AES-256
Validation : Great Expectations + PyOD (détection d’anomalies)
CI/CD : Docker + GitHub Actions


🎯 Résumé Exécutif
Problème Résolu

Avant : Les 30+ établissements de l’UCAR utilisent des systèmes fragmentés (Excel, PDFs, papier), avec des processus manuels lents et source d’erreurs.
Après : Une plateforme centralisée qui :

Ingère automatiquement les données (PDFs, Excel, images) via OCR.
Valide les données extraites (anomalies, doublons, cohérence).
Stocke les données validées dans une base structurée (SQLite) et vectorielle (FAISS) pour une réutilisation future (ex: Track 2, 3, 4).
Garantit la qualité et la sécurité des données (OWASP, RGPD).

Valeur Ajoutée


  
    
      Critère
      Avant (Manuel)
      Après (IA/ETL)
    
  
  
    
      Temps de traitement
      2 semaines pour 1000 PDFs
      2 heures pour 1000 PDFs
    
    
      Taux d’erreur
      15%
      < 2%
    
    
      Coût humain
      5 FTE (saisie)
      1 FTE (relecture uniquement)
    
    
      Scalabilité
      Impossible pour 30+ établissements
      Scalable à 100+ établissements
    
    
      Qualité des données
      Manuelle, source d’erreurs
      Validation automatisée + IA
    
  




🏗️ Architecture Technique Détaillée
📊 Schéma Global
mermaid
Copier

graph TD
    A[Établissements: Upload Fichiers] -->|PDF/Excel/Image| B[Frontend React/Vite]
    B -->|HTTP Requests| C[FastAPI Backend]
    C --> D[PaddleOCR/Tesseract: Extraction Texte]
    D --> E[Mistral LLM: Normalisation & Validation]
    E --> F[Great Expectations: Règles Métiers]
    F --> G[PyOD: Détection Anomalies]
    G --> H[Apache Airflow: Orchestration ETL]
    H --> I[SQLite: Stockage Données Structurées]
    H --> J[FAISS: Stockage Données Vectorielles]
    I --> K[Dashboard Admin: Vue KPIs]
    J --> L[RAG: Recherche Sémantique]
    C --> M[JWT + RBAC: Sécurité]




🔧 Stack par Composant




Stack Technique par Composant

  
    
      Composant
      Technologie
      Rôle
      Exemple d’Utilisation
    
  
  
    
      Frontend
      React + Vite + Material UI
      Interface utilisateur (upload, relecture, dashboard).
      Page d’upload avec drag & drop, interface de relecture pour les anomalies.
    
    
      Backend
      FastAPI (Python)
      APIs, logique métier, intégration OCR/LLM.
      Endpoint /upload pour recevoir les fichiers, /validate pour valider les données.
    
    
      OCR
      PaddleOCR + Tesseract
      Extraction de texte des PDFs/images.
      Convertir Grades_2026.pdf en données structurées.
    
    
      LLM
      Mistral (API)
      Normalisation des données (ex: "ID_Étudiant" → "Student_ID"), validation contextuelle.
      Corriger les noms de colonnes ("Note" → "Grade").
    
    
      Validation
      Great Expectations + PyOD
      Détection des anomalies (notes > 20, doublons, incohérences).
      Rejeter un fichier si une note est hors plage.
    
    
      ETL
      Apache Airflow
      Orchestration des pipelines (upload → OCR → validation → stockage).
      Automatiser le traitement de 1000 fichiers en parallèle.
    
    
      Base SQL
      SQLite
      Stockage des données structurées (étudiants, notes, budgets).
      Table grades : (student_id, subject, grade, semester, year).
    
    
      Base Vectorielle
      FAISS
      Indexation pour la recherche sémantique (futur Track 3).
      Stocker les extraits de PDFs pour le chatbot RAG.
    
    
      Sécurité
      JWT + RBAC + AES-256
      Authentification, contrôle d’accès, chiffrement.
      Un doyen ne voit que les données de son établissement.
    
    
      CI/CD
      Docker + GitHub Actions
      Déploiement et mise à jour continue.
      Conteneuriser l’app pour un déploiement sur serveur UCAR.
    
  




👥 Users et Rôles (Track 1 uniquement)
Fonctionnalités par Étape

  
    
      Rôle
      Description
      Besoins Spécifiques
      Interfaces/Outils
    
  
  
    
      🏛️ Doyen d’Établissement
      Responsable de l’ingestion des données pour son établissement (ex: ISITCOM).
      - Upload de fichiers (PDF/Excel). 


- Validation manuelle des extractions incertaines. 


- Alertes pour anomalies.
      Page d’Upload, Interface de Relecture, Notifications.
    
    
      📚 Chargé de Données
      Employé dédié à la digitalisation des archives (ex: feuilles de présence papier).
      - Upload de batchs de documents. 


- Suivi de la progression. 


- Relecture des données incertaines.
      Page d’Upload Batch, Dashboard de Suivi, Interface de Relecture.
    
    
      👨‍🏫 Professeur
      Enseignant qui génère ou vérifie des données (ex: notes, présences).
      - Upload de fichiers locaux. 


- Correction des erreurs d’OCR.
      Page d’Upload, Interface de Relecture.
    
    
      🔧 Administrateur UCAR
      Supervise l’ingestion pour tous les établissements.
      - Vue d’ensemble des uploads. 


- Gestion des alertes. 


- Configuration des templates standards.
      Dashboard Admin, Interface de Configuration, Logs d’Audit.
    
    
      🤖 Système Automatisé
      Intégrations avec d’autres systèmes (ex: Moodle, ERP).
      - Upload automatique de données. 


- Notifications en cas d’échec.
      APIs REST, Webhooks.
    
  




📋 Fonctionnalités Détaillées




Roadmap Détaillée

  
    
      Étape
      Fonctionnalité
      Description
      Technos
      Exemple d’Entrée/Sortie
    
  
  
    
      1. Upload
      Upload Multi-Format
      Accepte PDF, Excel, images (JPEG, PNG) avec drag & drop ou API.
      React Dropzone + FastAPI
      Entrée : Grades_Semester1_2026.pdf. Sortie : Fichier stocké temporairement + déclenchement du pipeline.
    
    
      2. Extraction
      OCR Avancé
      Extraction de texte des images/PDFs avec PaddleOCR + LayoutLM pour détecter les tables/champs.
      PaddleOCR, LayoutLM, Unstructured.io
      Entrée : Grades_Semester1_2026.pdf. Sortie : Texte structuré (JSON/CSV).
    
    
      3. Parsing Intelligent
      Détection des Tables/Champs
      Identification des colonnes (ex: "Étudiant", "Math", "Note") et normalisation des noms.
      Mistral LLM + Regex
      Entrée : Texte extrait. Sortie : {student_id: "UCAR001", mathematics: 15, physics: 14}.
    
    
      4. Normalisation
      Uniformisation des Champs
      Correction des noms de champs ("ID_Étudiant" → "Student_ID") et formatage des données.
      Mistral LLM
      Entrée : {"ID_Étudiant": "UCAR001", "Note": "15"}. Sortie : {"Student_ID": "UCAR001", "Grade": 15}.
    
    
      5. Validation
      Règles Métiers
      Validation des données (ex: 0 ≤ Grade ≤ 20, Student_ID existe dans la base).
      Great Expectations
      Entrée : {Student_ID: "UCAR999", Grade: 25}. Sortie : Anomalie détectée (Grade hors plage).
    
    
      6. Détection Anomalies
      Analyse Statistique
      Détection des valeurs aberrantes (ex: notes > 20, budgets négatifs) via PyOD.
      PyOD
      Entrée : {Student_ID: "UCAR001", Grade: 25}. Sortie : Anomalie détectée (Grade = 25/20).
    
    
      7. Human-in-the-Loop
      Relecture Manuelle
      Interface pour corriger les extractions incertaines (OCR < 90%).
      React + Label Studio
      Entrée : Fichier avec 5 anomalies. Sortie : Données corrigées par l’utilisateur.
    
    
      8. Stockage
      Base SQL + Vectorielle
      Stockage des données validées dans SQLite (structuré) et FAISS (vectoriel pour RAG futur).
      SQLite, FAISS
      Entrée : Données normalisées et validées. Sortie : Données dans SQLite.grades et indexées dans FAISS.
    
    
      9. Audit & Traçabilité
      Logs Complète
      Traçabilité de toutes les actions (qui, quand, quoi) pour la conformité RGPD.
      ELK Stack
      Sortie : Log {user: "doyen_ISITCOM", action: "upload", file: "Grades.pdf", timestamp: "2026-04-25T12:00:00"}.
    
  




🔌 APIs Backend (FastAPI)
1. POST /upload

Description : Reçoit les fichiers et déclenche le pipeline ETL.
Paramètres :

file: Fichier (PDF, Excel, image) – obligatoire.
institution: Nom de l’établissement (ex: "ISITCOM") – obligatoire.
document_type: Type de document (ex: "grades", "budget") – optionnel.

Exemple de Requête :
bash
Copier

curl -X POST "http://ucar-data-hub/api/upload" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -F "file=@Grades_Semester1_2026.pdf" \
     -F "institution=ISITCOM" \
     -F "document_type=grades"




Réponse :
json
Copier

{
  "status": "success",
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "extraction_quality": 95,
  "anomalies_detected": 2,
  "validation_status": "pending"
}





2. GET /upload/{file_id}/status

Description : Retourne l’état du traitement d’un fichier.
Paramètres :

file_id: ID du fichier (UUID).

Exemple de Requête :
bash
Copier

curl -X GET "http://ucar-data-hub/api/upload/123e4567-e89b-12d3-a456-426614174000/status" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"




Réponse :
json
Copier

{
  "status": "completed",
  "extraction_quality": 98,
  "anomalies_detected": 0,
  "validation_status": "validated",
  "storage_status": "stored_in_sqlite_and_faiss"
}





3. GET /anomalies

Description : Liste les anomalies détectées pour un établissement ou un utilisateur.
Paramètres :

institution: Nom de l’établissement (ex: "ISITCOM") – optionnel.
user_id: ID de l’utilisateur – optionnel.

Exemple de Requête :
bash
Copier

curl -X GET "http://ucar-data-hub/api/anomalies?institution=ISITCOM" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"




Réponse :
json
Copier

{
  "anomalies": [
    {
      "file_id": "123e4567-e89b-12d3-a456-426614174000",
      "field": "grade",
      "value": 25,
      "expected": "0-20",
      "correction_suggestion": "20"
    }
  ]
}






🗃️ Modèle de Données (SQLite)
sql
Copier

-- Table Étudiants (référentiel)
CREATE TABLE students (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    enrollment_date DATE
);

-- Table Notes (exemple de données structurées)
CREATE TABLE grades (
    grade_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade REAL CHECK (grade >= 0 AND grade <= 20),
    semester INTEGER,
    year INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Table Budgets (exemple pour Track 2)
CREATE TABLE budgets (
    budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
    institution TEXT NOT NULL,
    allocated REAL NOT NULL,
    spent REAL NOT NULL CHECK (spent <= allocated),
    year INTEGER,
    month INTEGER
);

-- Table Logs (audit)
CREATE TABLE audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    file_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);





🔐 Sécurité et Conformité
1. Authentification

JWT : Tokens valides pour 24h.
RBAC : Table des rôles dans SQLite :
sql
Copier

CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL,  -- "admin", "dean", "professor", "data_manager"
    email TEXT NOT NULL,
    institution TEXT,     -- NULL pour l'admin
    password_hash TEXT NOT NULL
);




Exemple de Permissions :

Un doyen ne voit que les données de son établissement.
Un administrateur voit toutes les données.

2. Chiffrement

AES-256 : Chiffrement des données sensibles (notes, salaires) avant stockage.
Exemple :
python
Copier

from cryptography.fernet import Fernet
key = Fernet.generate_key()
cipher_suite = Fernet(key)
encrypted_data = cipher_suite.encrypt(b"Sensitive data")




3. Protection contre les Cyberattaques

OWASP Top 10 :

Injection : Validation stricte des entrées (SQLi, XSS).
Broken Access Control : RBAC strict.
Sensitive Data Exposure : Chiffrement + anonymisation des logs.

Prompt Injection (LLM) : Filtrage des inputs utilisateur pour le chatbot.
4. Conformité RGPD

Droit à l’oubli : Suppression des données sur demande.
Anonymisation : Masquage des noms dans les rapports publics.
Audit : Traçabilité complète des accès.


📈 Exemples de User Flows
1. Workflow : Upload et Validation des Notes
mermaid
Copier

flowchart TD
    A[Doyen ISITCOM] -->|1. Upload| B[Page Upload React]
    B -->|2. Déclenche Pipeline| C[FastAPI /upload]
    C -->|3. OCR + Parsing| D[PaddleOCR + LayoutLM]
    D -->|4. Normalisation| E[Mistral LLM]
    E -->|5. Validation| F[Great Expectations + PyOD]
    F -->|6. Anomalies?| G[Oui: 2 anomalies]
    G -->|7. Relecture Humaine| H[Interface de Relecture]
    H -->|8. Correction| I[Données Validées]
    I -->|9. Stockage| J[SQLite.grades + FAISS]
    J -->|10. Notification| K[Doyen: "100% validé"]




2. Workflow : Batch Upload (1000 Feuilles de Présence)
mermaid
Copier

flowchart TD
    A[Chargé de Données] -->|1. Sélection 1000 Fichiers| B[Page Upload Batch]
    B -->|2. Parallélisation| C[Apache Airflow]
    C -->|3. OCR Batch| D[PaddleOCR]
    D -->|4. Validation Batch| E[Great Expectations]
    E -->|5. Anomalies?| F[120 fichiers en attente]
    F -->|6. Relecture Prioritaire| G[Interface de Relecture]
    G -->|7. Stockage| H[SQLite.attendance]
    H -->|8. Dashboard| I[Progression: 9500/10000]





🎨 User Experience (UX)
1. Page d’Upload (React)


Éléments :

Bouton "Upload Fichier" (ou drag & drop).
Feedback visuel : "Traitement en cours (60%)...".
Aperçu des anomalies détectées (ex: "Note 25/20 → Corriger ?").
Bouton "Valider les Corrections" pour l’interface de relecture.


Maquette :

Upload Page

Couleurs UCAR : Fond #003E6B, boutons #7FB2E5, texte #FFFFFF.


2. Interface de Relecture (Human-in-the-Loop)


Éléments :

Liste des extractions incertaines (OCR < 90%).
Champ de correction manuelle.
Bouton "Valider" pour confirmer les modifications.
Barre de progression : "2/10 anomalies corrigées".


Maquette :

Relecture Interface


3. Dashboard Admin


Éléments :

Vue d’ensemble des uploads en temps réel.
Tableau des anomalies par établissement.
Boutons pour générer des rapports PDF.
Interface de configuration des templates standards.


Maquette :

Dashboard Admin


4. Notifications

Types :

Email : "2 anomalies détectées dans le fichier Grades.pdf (ISITCOM)."
In-App : Badge rouge sur l’icône "Alertes".
Webhook : Notification pour les intégrations (ex: Moodle).



📊 Métriques de Succès


  
    
      Métrique
      Objectif
    
  
  
    
      Temps de traitement
      Réduire de 90% (ex: 2 semaines → 2 heures pour 1000 PDFs).
    
    
      Taux d’erreur
      < 2% (contre 15% en manuel).
    
    
      Adoption par les établissements
      80% utilisent la plateforme d’ici 6 mois.
    
    
      Satisfaction utilisateur
      Note moyenne > 4.5/5 sur l’ergonomie et l’efficacité.
    
    
      Scalabilité
      Capacité à gérer 100+ établissements sans dégradation.
    
  




🚀 Roadmap de Développement (6 Semaines)






  
    
      Semaine
      Livrable
      Détails
      Équipe
    
  
  
    
      1
      POC Backend
      Endpoints /upload, /validate, intégration OCR (PaddleOCR).
      Backend Dev
    
    
      2
      POC Frontend
      Page d’upload React avec drag & drop, feedback visuel.
      Frontend Dev
    
    
      3
      Validation IA
      Intégration Mistral (normalisation) + Great Expectations (règles métiers).
      Data Engineer
    
    
      4
      Détection Anomalies
      PyOD pour détecter les valeurs aberrantes (notes > 20, etc.).
      Data Engineer
    
    
      5
      Stockage + Audit
      SQLite (données structurées) + FAISS (vectoriel) + logs d’audit.
      Backend Dev + DevOps
    
    
      6
      Tests + Déploiement
      Tests unitaires/integration, sécurité (OWASP), déploiement sur serveur UCAR.
      QA Engineer + DevOps
    
  




📁 Structure du Code (Pour Cursor)
text
Copier

ucar-data-hub/
├── backend/
│   ├── main.py                # FastAPI + endpoints
│   ├── models.py              # SQLite models
│   ├── ocr_parser.py          # PaddleOCR + LayoutLM
│   ├── llm_integration.py     # Mistral LLM
│   ├── validation.py          # Great Expectations + PyOD
│   ├── etl_pipeline.py        # Apache Airflow
│   ├── auth.py                # JWT + RBAC
│   ├── security.py            # Chiffrement, OWASP
│   └── requirements.txt       # Dépendances Python
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Upload.jsx      # Page d'upload
│   │   │   ├── Relecture.jsx   # Interface de relecture
│   │   │   ├── Dashboard.jsx   # Dashboard admin
│   │   │   └── Notification.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── docker-compose.yml         # Docker + services (FastAPI, Airflow)
├── .github/
│   └── workflows/
│       └── ci-cd.yml          # GitHub Actions
│
└── README.md                  # Documentation utilisateur





💬 Comment Utiliser avec Cursor
1. Générer le Code
Prompt pour Cursor :
plaintext
Copier

"Basé sur le cahier des charges ci-dessus, génère :
1. Le backend FastAPI avec les endpoints /upload, /validate, et /anomalies.
2. Le modèle SQLite (tables students, grades, budgets, audit_logs).
3. Le code pour intégrer PaddleOCR (extraction) et Mistral LLM (normalisation).
4. Les composants React pour la page d'upload et l'interface de relecture.
5. La configuration RBAC et JWT pour la sécurité.
Utilise les couleurs UCAR (#003E6B pour le bleu principal, #7FB2E5 pour l'accent)."




2. Exemple de Commandes Cursor


  
    
      Tâche
      Prompt Cursor
    
  
  
    
      Générer l’endpoint /upload
      "Crée un endpoint FastAPI POST /upload qui : 1) Reçoit un fichier PDF/Excel/Image, 2) Stocke le fichier temporairement, 3) Retourne un file_id et un status 'pending'."
    
    
      Créer la table SQLite grades
      "Génère le code SQL pour créer une table SQLite 'grades' avec les colonnes : grade_id (PK), student_id (FK), subject, grade (0-20), semester, year. Ajoute les contraintes CHECK."
    
    
      Développer l’interface de relecture
      "Crée un composant React 'Relecture.jsx' qui : 1) Affiche une liste d'anomalies, 2) Permet de corriger les champs, 3) Valide les changements, 4) Utilise les couleurs UCAR."
    
    
      Configurer JWT + RBAC
      "Génère le code pour implémenter l'authentification JWT avec RBAC dans FastAPI. Les rôles sont : admin, dean, professor, data_manager."
    
  



3. Priorités pour Cursor


Commencez par le backend :

Générez main.py (FastAPI) avec les endpoints /upload et /validate.
Intégrez PaddleOCR pour l’extraction.


Développez le frontend en parallèle :

Créez Upload.jsx avec drag & drop.
Développez Relecture.jsx pour l’interface de relecture.


Ajoutez la sécurité :

Implémentez JWT + RBAC dans auth.py.


Testez et optimisez :

Utilisez Cursor pour déboguer les pipelines ETL.



📌 Checklist Finale pour le Hackathon


 Backend :

 Endpoints /upload, /validate, /anomalies fonctionnels.
 Intégration PaddleOCR + Mistral LLM.
 Stockage dans SQLite + FAISS.
 Sécurité (JWT, RBAC, chiffrement AES-256).


 Frontend :

 Page d’upload avec drag & drop.
 Interface de relecture pour les anomalies.
 Dashboard admin (vue des uploads).


 Validation :

 Great Expectations pour les règles métiers.
 PyOD pour la détection d’anomalies.


 Tests :

 Tester l’OCR sur 50 PDFs d’exemple.
 Valider la détection d’anomalies avec des jeux de données réels.
 Vérifier les permissions RBAC.


 Documentation :

 README.md avec instructions d’utilisation.
 Schéma d’architecture (Mermaid).
 Exemples de requêtes API (Postman).



🎉 Résumé : Pourquoi Ce Cahier des Charges ?

Précis : Détaille chaque étape du pipeline ETL.
Actionnable : Spécifie le code à générer avec Cursor.
Professionnel : Couvre sécurité, scalabilité et UX.
Focus Track 1 : Exclusivement sur l’ingestion, la validation et le stockage.

🚀 Prochaine Étape

Copiez ce cahier des charges dans Cursor comme document de référence.
Commencez par générer le POC backend (/upload + OCR).
Développez le frontend en parallèle (page d’upload + relecture).
Préparez une démo live pour le hackathon :

Montrez l’upload d’un fichier → extraction → validation → stockage.
Démonstration de la détection d’une anomalie et sa correction.


💡 Besoin d’aide supplémentaire ?

Si vous voulez :

Un exemple de code complet pour un endpoint spécifique.
Une maquette Figma pour les interfaces.
Une intégration avec des outils UCAR existants (ex: Moodle).
Dites-le-moi, et je vous fournirai les ressources immédiatement ! 🚀




19:04


















