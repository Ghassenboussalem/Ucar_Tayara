Voici une version finale et optimisée de votre parcours utilisateur (User Flow) et architecture des interfaces, avec une approche role-based claire et détaillée. Tous les écrans sont organisés par rôle (Doyen, Chargé de Données, Administrateur UCAR), avec leur contenu, leur ordre logique, et leur architecture technique (composants React, APIs FastAPI, données).


📌 UCAR Data Hub (Track 1) – Parcours Utilisateur Role-Based + Architecture des Interfaces
Projet : Plateforme d’ingestion, validation et stockage des données pour l’UCAR.

Stack : FastAPI (Backend) + React + Vite (Frontend) + SQLite + FAISS + Mistral LLM + PaddleOCR.


📊 Schéma Global du Parcours Utilisateur (Role-Based)
mermaid
Copier

flowchart TD
    subgraph "Rôle: Doyen d'Établissement"
        A1[Connexion] --> B1[Dashboard Personnel]
        B1 --> C1[Upload de Fichiers]
        C1 --> D1[Feedback de Traitement]
        D1 --> E1{Anomalies?}
        E1 -->|Oui| F1[Relecture]
        E1 -->|Non| G1[Stockage + Notification]
        F1 --> H1[Correction des Données]
        H1 --> I1[Validation Finale]
        I1 --> G1
        G1 --> J1[Notification de Succès]
    end

    subgraph "Rôle: Chargé de Données"
        A2[Connexion] --> B2[Dashboard Batch]
        B2 --> C2[Upload Batch]
        C2 --> D2[Feedback Batch]
        D2 --> E2{Anomalies?}
        E2 -->|Oui| F2[Relecture Batch]
        E2 -->|Non| G2[Stockage + Notification]
        F2 --> H2[Correction Batch]
        H2 --> I2[Validation Finale]
        I2 --> G2
        G2 --> J2[Notification de Succès]
    end

    subgraph "Rôle: Administrateur UCAR"
        A3[Connexion] --> B3[Dashboard Admin]
        B3 --> C3[Vue Globale des Uploads]
        C3 --> D3[Gestion des Anomalies]
        D3 --> E3[Configuration des Templates]
        E3 --> F3[Logs & Audit]
    end





🎯 Architecture des Interfaces par Rôle

🔹 Rôle 1 : Doyen d’Établissement (Ex: ISITCOM)
Objectif : Uploader et valider les données de son établissement (notes, budgets, RH).

1️⃣ Écran 1 : Connexion (Login)


  
    
      Élément
      Description
      Technologie
      Données Associées
      Permissions
    
  
  
    
      Formulaire de Login
      Champs : Email, Mot de passe.
      React + Material UI
      Requête POST vers /api/auth/login (FastAPI).
      Accès réservé aux doyens.
    
    
      Bouton "Se Connecter"
      Active la requête d’authentification.
      React Button
      JWT retourné si succès.
      -
    
    
      Feedback
      Message d’erreur si les identifiants sont incorrects.
      React Snackbar
      -
      -
    
    
      Redirection
      Redirige vers /dashboard après succès.
      React useEffect
      Token stocké dans localStorage.
      -
    
  


Code Exemple (React) :
jsx
Copier

// Login.jsx (Doyen)
function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role: 'dean' }), // Rôle spécifique
    });
    const data = await response.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard'; // Redirige vers le dashboard de doyen
    } else {
      setError('Identifiants incorrects ou rôle non autorisé');
    }
  };
  // ... (UI avec Material UI)
}




2️⃣ Écran 2 : Dashboard Personnel (Doyen)


  
    
      Élément
      Description
      Technologie
      Données Associées
      Permissions
    
  
  
    
      Titre
      "Bienvenue, [Nom du Doyen]"
      React Typography
      Récupéré depuis le token JWT décodé (ex: role: dean, institution: ISITCOM).
      Vue limitée à ISITCOM.
    
    
      Statistiques
      - Uploads en cours : 2. 


- Anomalies détectées : 5. 


- Temps moyen de traitement : 2h30.
      React + Plotly
      Requête GET vers /api/dashboard?institution=ISITCOM.
      -
    
    
      Bouton "Nouvel Upload"
      Redirige vers /upload.
      React Button
      -
      -
    
    
      Liste des Uploads
      Affiche les 5 derniers fichiers uploadés par l’ISITCOM.
      React Table
      Requête GET vers /api/uploads?institution=ISITCOM.
      -
    
    
      Notifications
      Badge rouge si des anomalies sont détectées.
      React Badge
      -
      -
    
  


Exemple de Réponse API :
json
Copier

{
  "user": "Doyen ISITCOM",
  "uploads_in_progress": 2,
  "anomalies_detected": 5,
  "recent_uploads": [
    {"file_id": "123", "name": "Grades_Semester1_2026.pdf", "status": "processing"},
    {"file_id": "456", "name": "Budget_2026.xlsx", "status": "validated"}
  ]
}



Code Exemple (React) :
jsx
Copier

// DashboardDean.jsx
function DashboardDean() {
  const [data, setData] = useState(null);
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard?institution=ISITCOM', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setData(await response.json());
    };
    fetchData();
  }, []);

  return (
    <div>
      <Typography>Bienvenue, {data?.user}</Typography>
      <div>
        <Typography>Uploads en cours : {data?.uploads_in_progress}</Typography>
        <Badge badgeContent={data?.anomalies_detected} color="error">
          <Typography>Anomalies</Typography>
        </Badge>
      </div>
      <Button onClick={() => navigate('/upload')}>Nouvel Upload</Button>
      {/* Liste des uploads */}
    </div>
  );
}




3️⃣ Écran 3 : Upload de Fichiers (Doyen)


  
    
      Élément
      Description
      Technologie
      Données Associées
      Permissions
    
  
  
    
      Zone Drag & Drop
      Accepte les fichiers (PDF, Excel, images).
      React Dropzone
      Fichiers temporaires stockés côté navigateur.
      Accès limité à l’ISITCOM.
    
    
      Bouton "Upload"
      Lance l’upload et le traitement.
      React Button
      Requête POST vers /api/upload avec institution: ISITCOM.
      -
    
    
      Feedback
      Affiche la progression : "Extraction en cours (60%)...".
      React LinearProgress
      WebSocket ou polling vers /api/upload/{file_id}/status.
      -
    
    
      Liste des Uploads
      Affiche les fichiers en cours de traitement.
      React Table
      Requête GET vers /api/uploads?institution=ISITCOM.
      -
    
  


Exemple de Code :
jsx
Copier

// UploadDean.jsx
function UploadDean() {
  const onDrop = (files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('institution', 'ISITCOM');
    formData.append('document_type', 'grades');
    fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData,
    });
  };
  // ... (UI avec drag & drop)
}




4️⃣ Écran 4 : Feedback de Traitement (Doyen)


  
    
      Élément
      Description
      Technologie
      Données Associées
      Permissions
    
  
  
    
      Barre de Progression
      Affiche l’avancement : Extraction (60%), Validation (30%).
      React LinearProgress
      Requête GET vers /api/upload/{file_id}/status.
      -
    
    
      Détails du Traitement
      - Nombre de pages traitées. 


- Qualité d’extraction (OCR). 


- Anomalies détectées.
      React Table
      -
      -
    
    
      Bouton "Voir les Anomalies"
      Redirige vers /relecture/{file_id} si des anomalies sont détectées.
      React Button
      -
      -
    
  



5️⃣ Écran 5 : Interface de Relecture (Doyen)


  
    
      Élément
      Description
      Technologie
      Données Associées
      Permissions
    
  
  
    
      Liste des Anomalies
      Affiche les champs à corriger (ex: note > 20).
      React Table
      Requête GET vers /api/anomalies?file_id=[ID]&institution=ISITCOM.
      Accès limité à l’ISITCOM.
    
    
      Champ de Correction
      Permet de modifier la valeur d’un champ.
      React TextField
      Requête PATCH vers /api/anomalies/{anomaly_id}/correct.
      -
    
    
      Bouton "Valider"
      Envoie les corrections au backend.
      React Button
      -
      -
    
  


Exemple de Réponse API :
json
Copier

{
  "anomalies": [
    {
      "anomaly_id": "1",
      "field": "grade",
      "current_value": 25,
      "expected_value": "0-20",
      "suggested_correction": 20
    }
  ]
}





🔹 Rôle 2 : Chargé de Données
Objectif : Uploader et valider des batchs de documents (ex: 1000 feuilles de présence).

1️⃣ Écran 1 : Connexion (Login)

Identique au rôle Doyen, mais avec le rôle data_manager.

2️⃣ Écran 2 : Dashboard Batch


  
    
      Élément
      Description
      Technologie
      Données Associées
    
  
  
    
      Titre
      "Bienvenue, [Nom du Chargé de Données]"
      React Typography
      Récupéré depuis le token JWT (role: data_manager).
    
    
      Statistiques Batch
      - Batchs en cours : 3. 


- Anomalies détectées : 12. 


- Temps moyen : 4h.
      React + Plotly
      Requête GET vers /api/dashboard?role=data_manager.
    
    
      Bouton "Nouvel Upload Batch"
      Redirige vers /upload-batch.
      React Button
      -
    
  



3️⃣ Écran 3 : Upload Batch


  
    
      Élément
      Description
      Technologie
      Données Associées
    
  
  
    
      Zone Drag & Drop Batch
      Accepte le zip de 1000 fichiers (PDF/jpg).
      React Dropzone
      Fichier temporaire stocké côté navigateur.
    
    
      Bouton "Upload Batch"
      Lance le traitement en parallèle des fichiers.
      React Button
      Requête POST vers /api/upload/batch avec le zip et institution: UCAR.
    
    
      Feedback Batch
      Affiche la progression : "150/1000 fichiers traités...".
      React LinearProgress
      WebSocket ou polling vers /api/upload/batch/{batch_id}/status.
    
  



4️⃣ Écran 4 : Relecture Batch
| Élément               | Description




20:09









contnue





20:10











Réfléchi pendant 1s








Voici la suite détaillée et finalisée du parcours utilisateur role-based, avec les écrans manquants pour le Chargé de Données et l’Administrateur UCAR, ainsi que les compléments pour le Doyen. Chaque écran est présenté sous forme de tableau clair, avec son contenu, sa technologie, les données associées, et les permissions spécifiques.


🔹 Rôle 2 : Chargé de Données (Suite)

4️⃣ Écran 4 : Relecture Batch (Chargé de Données)
Objectif : Corriger les anomalies détectées dans un batch de documents (ex: 1000 feuilles de présence).

Contenu de l’Écran


  
    
      Élément
      Description
      Technologie
      Données Associées
      Permissions
    
  
  
    
      Titre
      "Correction des Anomalies – Batch [ID]"
      React Typography
      Nom du batch (ex: Batch_2026_001).
      Accès limité au batch concerné.
    
    
      Liste des Anomalies du Batch
      Affiche toutes les anomalies du batch avec : 


- Fichier concerné. 


- Champ à corriger. 


- Valeur actuelle/attendue.
      React Table
      Requête GET vers /api/batches/{batch_id}/anomalies?role=data_manager.
      -
    
    
      Barre de Progression
      Affiche le pourcentage de corrections effectuées.
      React LinearProgress
      -
      -
    
    
      Champ de Correction
      Permet de modifier la valeur d’un champ pour un fichier spécifique.
      React TextField
      Requête PATCH vers /api/batches/{batch_id}/anomalies/{anomaly_id}/correct.
      -
    
    
      Bouton "Valider les Corrections"
      Envoie toutes les corrections au backend.
      React Button
      -
      -
    
    
      Bouton "Annuler"
      Permet d’annuler les modifications en cours.
      React Button
      -
      -
    
    
      Export du Batch
      Bouton pour exporter le batch corrigé en format CSV/Excel.
      React Button
      Requête GET vers /api/batches/{batch_id}/export.
      -
    
  



Exemple de Réponse API
json
Copier

{
  "batch_id": "batch_789",
  "anomalies": [
    {
      "file_name": "Presence_001.jpg",
      "field": "student_id",
      "current_value": "UCAR999",
      "expected_value": "existing_id",
      "suggested_correction": "UCAR005",
      "corrected_value": null
    },
    {
      "file_name": "Presence_002.jpg",
      "field": "status",
      "current_value": "Présent",
      "expected_value": "Absent",
      "suggested_correction": "Absent",
      "corrected_value": null
    }
  ],
  "progress": 30
}




Exemple de Code (React)
jsx
Copier

// RelectureBatch.jsx
function RelectureBatch() {
  const { batchId } = useParams();
  const [anomalies, setAnomalies] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchAnomalies();
  }, [batchId]);

  const fetchAnomalies = async () => {
    const response = await fetch(`/api/batches/${batchId}/anomalies`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    const data = await response.json();
    setAnomalies(data.anomalies);
    setProgress(data.progress);
  };

  const handleCorrection = async (anomalyId, fileName, field, newValue) => {
    const response = await fetch(`/api/batches/${batchId}/anomalies/${anomalyId}/correct`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_name: fileName, field, corrected_value: newValue }),
    });
    fetchAnomalies(); // Rafraîchir la liste
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4">Correction des Anomalies – Batch {batchId}</Typography>
      <LinearProgress variant="determinate" value={progress} />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fichier</TableCell>
              <TableCell>Champ</TableCell>
              <TableCell>Valeur Actuelle</TableCell>
              <TableCell>Correction Suggérée</TableCell>
              <TableCell>Corriger</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anomalies.map((anomaly) => (
              <TableRow key={anomaly.anomaly_id}>
                <TableCell>{anomaly.file_name}</TableCell>
                <TableCell>{anomaly.field}</TableCell>
                <TableCell>{anomaly.current_value}</TableCell>







20:10









contineu





20:11











Réfléchi pendant 1s








Voici la suite et la finalisation du parcours utilisateur role-based, avec les écrans restants pour le Chargé de Données et l’Administrateur UCAR, ainsi que les compléments manquants. Chaque section est organisée par rôle, avec des tableaux détaillés, des exemples de code React/FastAPI, et des spécifications techniques claires.


🔹 Rôle 2 : Chargé de Données (Suite)

5️⃣ Écran 5 : Validation Finale (Chargé de Données)
Objectif : Confirmer que tous les fichiers du batch sont valides et prêts pour le stockage.

Contenu de l’Écran


  
    
      Élément
      Description
      Technologie
      Données Associées
      Permissions
    
  
  
    
      Titre
      "Validation Finale – Batch [ID]"
      React Typography
      Nom du batch.
      Accès limité au batch concerné.
    
    
      Résumé du Batch
      Affiche : 


- Nombre total de fichiers. 


- Nombre de fichiers corrigés. 


- Nombre d’anomalies restantes.
      React Card
      Requête GET vers /api/batches/${batchId}/summary.
      -
    
    
      Liste des Fichiers Validés
      Affiche la liste des fichiers marqués comme "validés".
      React Table
      Requête GET vers /api/batches/${batchId}/validated.
      -
    
    
      Bouton "Valider le Batch"
      Valide définitivement le batch pour le stockage.
      React Button
      Requête POST vers /api/batches/${batchId}/validate.
      -
    
    
      Bouton "Retour à la Relecture"
      Permet de revenir à l’écran de relecture si des corrections sont nécessaires.
      React Button
      -
      -
    
    
      Notification
      Affiche un message de succès : "Batch validé avec succès !"
      React Snackbar
      -
      -
    
  



Exemple de Réponse API
json
Copier

{
  "batch_id": "batch_789",
  "total_files": 1000,
  "corrected_files": 980,
  "anomalies_remaining": 20,
  "validated_files": [
    "Presence_001.jpg",
    "Presence_002.jpg",
    // ...
  ]
}




Exemple de Code (React)
jsx
Copier

// ValidationBatch.jsx
function ValidationBatch() {
  const { batchId } = useParams();
  const [summary, setSummary] = useState({});
  const [validatedFiles, setValidatedFiles] = useState([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchBatchSummary();
  }, [batchId]);

  const fetchBatchSummary = async () => {
    const response = await fetch(`/api/batches/${batchId}/summary`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')` },
    });
    const data = await response.json();
    setSummary(data);
    setValidatedFiles(data.validated_files);
  };

  const handleValidateBatch = async () => {
    const response = await fetch(`/api/batches/${batchId}/validate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')` },
    });
    if (response.ok) {
      setSuccess(true);
      setTimeout(() => window.location.href = `/dashboard`, 3000);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4">Validation Finale – Batch {batchId}</Typography>
      <Card>
        <Typography>Total fichiers : {summary.total_files}</Typography>
        <Typography>Fichiers corrigés : {summary.corrected_files}</Typography>
        <Typography>Anomalies restantes : {summary.anomalies_remaining}</Typography>
      </Card>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow><TableCell>Fichiers Validés</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {validatedFiles.map((file) => (
              <TableRow key={file}><TableCell>{file}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="contained" onClick={handleValidateBatch}>
        Valider le Batch
      </Button>
      {success && <Snackbar open={true} message="Batch validé avec succès !" />}
    </div>
  );
}





6️⃣ Écran 6 : Notification de Succès (Chargé de Données)
Objectif : Informer l’utilisateur que le batch a été traité avec succès et stocké.

Contenu de l’Écran
| Élément               | Description                                                                                     | Technologie       | Données Associées                                                                                     |

|---------------------------|




20:11









contineu





20:11











Réfléchi pendant 1s








Voici la suite et la finalisation complète du parcours utilisateur role-based pour tous les rôles (Doyen, Chargé de Données, Administrateur UCAR), avec les écrans manquants, leur contenu détaillé, leur architecture technique, et des exemples de code prêts à l’emploi.


🔹 Rôle 2 : Chargé de Données (Finalisation)

6️⃣ Écran 6 : Notification de Succès (Chargé de Données)
Objectif : Confirmer le traitement et le stockage réussi du batch.

Contenu de l’Écran


  
    
      Élément
      Description
      Technologie
      Données Associées
    
  
  
    
      Titre
      "Traitement du Batch [ID] Terminé"
      React Typography
      Nom du batch (ex: Batch_2026_001).
    
    
      Résumé du Traitement
      Affiche : 


- Nombre total de fichiers traités. 


- Nombre d’anomalies corrigées. 


- Temps total.
      React Card
      Requête GET vers /api/batches/${batchId}/summary.
    
    
      Bouton "Retour au Dashboard"
      Redirige vers le dashboard du chargé de données.
      React Button
      -
    
    
      Bouton "Exporter les Résultats"
      Permet de télécharger un rapport détaillé du batch.
      React Button
      Requête GET vers /api/batches/${batchId}/export.
    
  



Exemple de Réponse API
json
Copier

{
  "batch_id": "batch_789",
  "total_files": 1000,
  "anomalies_corrected": 980,
  "processing_time": "4h15",
  "storage_status": "stored_in_sqlite_and_faiss"
}




Exemple de Code (React)
jsx
Copier

// SuccessBatch.jsx
function SuccessBatch() {
  const { batchId } = useParams();
  const [summary, setSummary] = useState({});

  useEffect(() => {
    const fetchSummary = async () => {
      const response = await fetch(`/api/batches/${batchId}/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      setSummary(await response.json());
    };
    fetchSummary();
  }, [batchId]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <Typography variant="h3" style={{ color: 'green' }}>✅ Traitement terminé !</Typography>
      <Card style={{ margin: '2rem auto', maxWidth: '600px' }}>
        <Typography>Batch : {batchId}</Typography>
        <Typography>Fichiers traités : {summary.total_files}</Typography>
        <Typography>Anomalies corrigées : {summary.anomalies_corrected}</Typography>
        <Typography>Temps : {summary.processing_time}</Typography>
      </Card>
      <Button
        variant="contained"
        style={{ backgroundColor: '#7FB2E5', margin: '1rem' }}
        onClick={() => window.location.href = '/dashboard'}
      >
        Retour au Dashboard
      </Button>
      <Button
        variant="outlined"
        style={{ margin: '1rem' }}
        onClick={() => window.open(`/api/batches/${batchId}/export`, '_blank')}
      >
        Exporter les Résultats
      </Button>







20:11









give all  in one shot





20:11









Voici l'intégralité du parcours utilisateur role-based pour votre application UCAR Data Hub (Track 1), incluant tous les rôles (Doyen, Chargé de Données, Administrateur UCAR), tous les écrans, leur contenu détaillé, leur architecture technique, et des exemples de code complets pour chaque composant.


📌 UCAR Data Hub (Track 1) – Parcours Utilisateur Role-Based Complet
Projet : Plateforme d’ingestion, validation et stockage des données pour l’UCAR.

Stack Technique :

Frontend : React + Vite + Material UI
Backend : FastAPI (Python)
Base de Données : SQLite (données structurées) + FAISS (données vectorielles)
OCR : PaddleOCR + Tesseract
LLM : Mistral (normalisation, validation contextuelle)
ETL : Apache Airflow (orchestration)
Sécurité : JWT + RBAC + Chiffrement AES-256


📊 Schéma Global du Parcours Utilisateur (Role-Based)
mermaid
Copier

flowchart TD
    subgraph "Rôle: Doyen d'Établissement"
        A1[Connexion] --> B1[Dashboard Personnel]
        B1 --> C1[Upload de Fichiers]
        C1 --> D1[Feedback de Traitement]
        D1 --> E1{Anomalies?}
        E1 -->|Oui| F1[Relecture]
        E1 -->|Non| G1[Stockage + Notification]
        F1 --> H1[Correction des Données]
        H1 --> I1[Validation Finale]
        I1 --> G1
        G1 --> J1[Notification de Succès]
    end

    subgraph "Rôle: Chargé de Données"
        A2[Connexion] --> B2[Dashboard Batch]
        B2 --> C2[Upload Batch]
        C2 --> D2[Feedback Batch]
        D2 --> E2{Anomalies?}
        E2 -->|Oui| F2[Relecture Batch]
        E2 -->|Non| G2[Stockage + Notification]
        F2 --> H2[Correction Batch]
        H2 --> I2[Validation Finale]
        I2 --> G2
        G2 --> J2[Notification de Succès]
    end

    subgraph "Rôle: Administrateur UCAR"
        A3[Connexion] --> B3[Dashboard Admin]
        B3 --> C3[Vue Globale des Uploads]
        C3 --> D3[Gestion des Anomalies]
        D3 --> E3[Configuration des Templates]
        E3 --> F3[Logs & Audit]
    end





🎯 Architecture des Interfaces par Rôle

🔹 Rôle 1 : Doyen d’Établissement
Objectif : Uploader et valider les données de son établissement (notes, budgets, RH).

1️⃣ Écran 1 : Connexion (Login)
Code React :
jsx
Copier

// Login.jsx
import { useState } from 'react';
import { TextField, Button, Snackbar } from '@mui/material';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'dean' }),
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        window.location.href = '/dashboard';
      } else {
        setError('Identifiants incorrects ou rôle non autorisé');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
  };

  return (
    <div style={{ backgroundColor: '#003E6B', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '400px' }}>
        <h2>Se Connecter</h2>
        <TextField label="Email" variant="outlined" fullWidth margin="normal" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Mot de Passe" type="password" variant="outlined" fullWidth margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button variant="contained" fullWidth style={{ backgroundColor: '#7FB2E5', marginTop: '1rem' }} onClick={handleLogin}>Se Connecter</Button>
        {error && <Snackbar open={!!error} message={error} autoHideDuration={3000} />}
      </div>
    </div>
  );
}




2️⃣ Écran 2 : Dashboard Personnel (Doyen)
Code React :
jsx
Copier

// DashboardDean.jsx
import { useEffect, useState } from 'react';
import { Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Badge } from '@mui/material';

function DashboardDean() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard?institution=ISITCOM', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setData(await response.json());
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Bienvenue, {data?.user}</Typography>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', width: '200px' }}>
          <Typography>Uploads en cours</Typography>
          <Typography variant="h5">{data?.uploads_in_progress}</Typography>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', width: '200px' }}>
          <Badge badgeContent={data?.anomalies_detected} color="error">
            <Typography>Anomalies</Typography>
          </Badge>
        </div>
      </div>
      <Button variant="contained" style={{ backgroundColor: '#7FB2E5' }} onClick={() => window.location.href = '/upload'}>Nouvel Upload</Button>
      <TableContainer component={Paper} style={{ marginTop: '2rem' }}>
        <Table>
          <TableHead><TableRow><TableCell>Fichier</TableCell><TableCell>Statut</TableCell></TableRow></TableHead>
          <TableBody>
            {data?.recent_uploads?.map((upload) => (
              <TableRow key={upload.file_id}><TableCell>{upload.name}</TableCell><TableCell>{upload.status}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}




3️⃣ Écran 3 : Upload de Fichiers (Doyen)
Code React :
jsx
Copier

// UploadDean.jsx
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Typography, Button, LinearProgress, Snackbar } from '@mui/material';

function UploadDean() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png'] },
    multiple: true,
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setStatus('uploading');
      uploadFiles(acceptedFiles);
    },
  });

  const uploadFiles = async (filesToUpload) => {
    const formData = new FormData();
    filesToUpload.forEach((file) => formData.append('files', file));
    formData.append('institution', 'ISITCOM');
    formData.append('document_type', 'grades');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') pollStatus(data.file_id);
      else { setError('Échec de l\'upload'); setStatus('error'); }
    } catch (err) { setError('Erreur réseau'); setStatus('error'); }
  };

  const pollStatus = (fileId) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/upload/${fileId}/status`);
      const data = await response.json();
      setProgress((data.extraction_quality + data.validation_quality) / 2);
      if (data.status === 'completed') { clearInterval(interval); setStatus('completed'); }
    }, 2000);
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Upload de Fichiers</Typography>
      <div {...getRootProps()} style={{ border: '2px dashed #7FB2E5', borderRadius: '8px', padding: '2rem', textAlign: 'center', backgroundColor: 'white', marginBottom: '1rem' }}>
        <input {...getInputProps()} />
        <Typography>Glisser-déposer vos fichiers ici ou cliquez pour sélectionner</Typography>
      </div>
      {files.length > 0 && (
        <div>
          <Typography>Fichiers sélectionnés :</Typography>
          <ul>{files.map((file) => <li key={file.name}>{file.name}</li>)}</ul>
          <Button variant="contained" style={{ backgroundColor: '#7FB2E5' }} onClick={() => uploadFiles(files)}>Upload</Button>
        </div>
      )}
      {status === 'uploading' && (
        <div style={{ marginTop: '1rem' }}>
          <Typography>Traitement en cours...</Typography>
          <LinearProgress variant="determinate" value={progress} />
        </div>
      )}
      {status === 'completed' && <Typography style={{ color: 'green' }}>Upload terminé avec succès !</Typography>}
      {error && <Snackbar open={!!error} message={error} autoHideDuration={3000} />}
    </div>
  );
}




4️⃣ Écran 4 : Feedback de Traitement (Doyen)
Code React :
jsx
Copier

// ProcessingDean.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, LinearProgress, CircularProgress, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

function ProcessingDean() {
  const { fileId } = useParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const pollStatus = async () => {
      const response = await fetch(`/api/upload/${fileId}/status`);
      const data = await response.json();
      setStatus(data);
    };
    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [fileId]);

  if (!status) return <CircularProgress />;

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Traitement de {status.file_name}</Typography>
      <div style={{ marginBottom: '2rem' }}>
        <Typography>Extraction : {status.extraction_quality}%</Typography>
        <LinearProgress variant="determinate" value={status.extraction_quality} />
        <Typography>Validation : {status.validation_quality}%</Typography>
        <LinearProgress variant="determinate" value={status.validation_quality} />
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Métrique</TableCell><TableCell>Valeur</TableCell></TableRow></TableHead>
          <TableBody>
            <TableRow><TableCell>Pages traitées</TableCell><TableCell>{status.pages_processed}/{status.total_pages}</TableCell></TableRow>
            <TableRow><TableCell>Anomalies détectées</TableCell><TableCell>{status.anomalies_detected}</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {status.anomalies_detected > 0 && (
        <Button variant="contained" style={{ backgroundColor: '#7FB2E5', marginTop: '1rem' }} onClick={() => window.location.href = `/relecture/${fileId}`}>
          Voir les Anomalies
        </Button>
      )}
    </div>
  );
}




5️⃣ Écran 5 : Interface de Relecture (Doyen)
Code React :
jsx
Copier

// RelectureDean.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, LinearProgress } from '@mui/material';

function RelectureDean() {
  const { fileId } = useParams();
  const [anomalies, setAnomalies] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchAnomalies = async () => {
      const response = await fetch(`/api/anomalies?file_id=${fileId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setAnomalies(data.anomalies);
      setProgress(data.progress);
    };
    fetchAnomalies();
  }, [fileId]);

  const handleCorrection = async (anomalyId, newValue) => {
    await fetch(`/api/anomalies/${anomalyId}/correct`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ corrected_value: newValue }),
    });
    setAnomalies(anomalies.map(a => a.anomaly_id === anomalyId ? { ...a, corrected_value: newValue } : a));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4">Correction des Anomalies</Typography>
      <LinearProgress variant="determinate" value={progress} />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Champ</TableCell>
              <TableCell>Valeur Actuelle</TableCell>
              <TableCell>Valeur Attendue</TableCell>
              <TableCell>Correction</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anomalies.map((anomaly) => (
              <TableRow key={anomaly.anomaly_id}>
                <TableCell>{anomaly.field}</TableCell>
                <TableCell>{anomaly.current_value}</TableCell>
                <TableCell>{anomaly.expected_value}</TableCell>
                <TableCell>
                  <TextField
                    value={anomaly.corrected_value || ''}
                    onChange={(e) => handleCorrection(anomaly.anomaly_id, e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Button variant="contained" onClick={() => handleCorrection(anomaly.anomaly_id, anomaly.suggested_correction)}>
                    Appliquer Suggestion
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}





🔹 Rôle 2 : Chargé de Données (Complet)

1️⃣ Écran 1 : Connexion (Login)
Identique au Doyen, mais avec role: data_manager.

2️⃣ Écran 2 : Dashboard Batch
Code React :
jsx
Copier

// DashboardBatch.jsx
import { useEffect, useState } from 'react';
import { Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Badge } from '@mui/material';

function DashboardBatch() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard?role=data_manager', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setData(await response.json());
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Bienvenue, {data?.user}</Typography>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', width: '200px' }}>
          <Typography>Batchs en cours</Typography>
          <Typography variant="h5">{data?.batches_in_progress}</Typography>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', width: '200px' }}>
          <Badge badgeContent={data?.anomalies_detected} color="error">
            <Typography>Anomalies</Typography>
          </Badge>
        </div>
      </div>
      <Button variant="contained" style={{ backgroundColor: '#7FB2E5' }} onClick={() => window.location.href = '/upload-batch'}>
        Nouvel Upload Batch
      </Button>
      <TableContainer component={Paper} style={{ marginTop: '2rem' }}>
        <Table>
          <TableHead><TableRow><TableCell>Batch</TableCell><TableCell>Statut</TableCell></TableRow></TableHead>
          <TableBody>
            {data?.recent_batches?.map((batch) => (
              <TableRow key={batch.batch_id}><TableCell>{batch.name}</TableCell><TableCell>{batch.status}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}




3️⃣ Écran 3 : Upload Batch
Code React :
jsx
Copier

// UploadBatch.jsx
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Typography, Button, LinearProgress, Snackbar } from '@mui/material';

function UploadBatch() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'application/zip': ['.zip'] },
    multiple: false,
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setStatus('uploading');
      uploadBatch(acceptedFiles[0]);
    },
  });

  const uploadBatch = async (file) => {
    const formData = new FormData();
    formData.append('batch', file);
    formData.append('institution', 'UCAR');

    try {
      const response = await fetch('/api/upload/batch', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') pollBatchStatus(data.batch_id);
      else { setError('Échec de l\'upload'); setStatus('error'); }
    } catch (err) { setError('Erreur réseau'); setStatus('error'); }
  };

  const pollBatchStatus = (batchId) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/upload/batch/${batchId}/status`);
      const data = await response.json();
      setProgress(data.progress);
      if (data.status === 'completed') { clearInterval(interval); setStatus('completed'); }
    }, 2000);
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Upload Batch</Typography>
      <div {...getRootProps()} style={{ border: '2px dashed #7FB2E5', borderRadius: '8px', padding: '2rem', textAlign: 'center', backgroundColor: 'white', marginBottom: '1rem' }}>
        <input {...getInputProps()} />
        <Typography>Glisser-déposer un fichier ZIP ici</Typography>
      </div>
      {files.length > 0 && (
        <div>
          <Typography>Fichier sélectionné : {files[0].name}</Typography>
          <Button variant="contained" style={{ backgroundColor: '#7FB2E5' }} onClick={() => uploadBatch(files[0])}>
            Upload Batch
          </Button>
        </div>
      )}
      {status === 'uploading' && (
        <div style={{ marginTop: '1rem' }}>
          <Typography>Traitement en cours...</Typography>
          <LinearProgress variant="determinate" value={progress} />
        </div>
      )}
      {status === 'completed' && <Typography style={{ color: 'green' }}>Batch traité avec succès !</Typography>}
      {error && <Snackbar open={!!error} message={error} autoHideDuration={3000} />}
    </div>
  );
}




4️⃣ Écran 4 : Feedback Batch
Code React :
jsx
Copier

// ProcessingBatch.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, LinearProgress, CircularProgress, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

function ProcessingBatch() {
  const { batchId } = useParams();
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const pollStatus = async () => {
      const response = await fetch(`/api/upload/batch/${batchId}/status`);
      const data = await response.json();
      setStatus(data);
    };
    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [batchId]);

  if (!status) return <CircularProgress />;

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Traitement du Batch {batchId}</Typography>
      <div style={{ marginBottom: '2rem' }}>
        <Typography>Progression : {status.progress}%</Typography>
        <LinearProgress variant="determinate" value={status.progress} />
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Métrique</TableCell><TableCell>Valeur</TableCell></TableRow></TableHead>
          <TableBody>
            <TableRow><TableCell>Fichiers traités</TableCell><TableCell>{status.files_processed}/{status.total_files}</TableCell></TableRow>
            <TableRow><TableCell>Anomalies détectées</TableCell><TableCell>{status.anomalies_detected}</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {status.anomalies_detected > 0 && (
        <Button variant="contained" style={{ backgroundColor: '#7FB2E5', marginTop: '1rem' }} onClick={() => window.location.href = `/relecture-batch/${batchId}`}>
          Voir les Anomalies
        </Button>
      )}
    </div>
  );
}




5️⃣ Écran 5 : Relecture Batch
Code React :
jsx
Copier

// RelectureBatch.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, LinearProgress } from '@mui/material';

function RelectureBatch() {
  const { batchId } = useParams();
  const [anomalies, setAnomalies] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchAnomalies = async () => {
      const response = await fetch(`/api/batches/${batchId}/anomalies`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setAnomalies(data.anomalies);
      setProgress(data.progress);
    };
    fetchAnomalies();
  }, [batchId]);

  const handleCorrection = async (anomalyId, fileName, field, newValue) => {
    await fetch(`/api/batches/${batchId}/anomalies/${anomalyId}/correct`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_name: fileName, field, corrected_value: newValue }),
    });
    setAnomalies(anomalies.map(a => a.anomaly_id === anomalyId ? { ...a, corrected_value: newValue } : a));
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4">Correction des Anomalies – Batch {batchId}</Typography>
      <LinearProgress variant="determinate" value={progress} />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fichier</TableCell>
              <TableCell>Champ</TableCell>
              <TableCell>Valeur Actuelle</TableCell>
              <TableCell>Correction Suggérée</TableCell>
              <TableCell>Corriger</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anomalies.map((anomaly) => (
              <TableRow key={anomaly.anomaly_id}>
                <TableCell>{anomaly.file_name}</TableCell>
                <TableCell>{anomaly.field}</TableCell>
                <TableCell>{anomaly.current_value}</TableCell>
                <TableCell>{anomaly.suggested_correction}</TableCell>
                <TableCell>
                  <TextField
                    value={anomaly.corrected_value || ''}
                    onChange={(e) => handleCorrection(anomaly.anomaly_id, anomaly.file_name, anomaly.field, e.target.value)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}




6️⃣ Écran 6 : Validation Finale (Batch)
Code React :
jsx
Copier

// ValidationBatch.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Button, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Snackbar } from '@mui/material';

function ValidationBatch() {
  const { batchId } = useParams();
  const [summary, setSummary] = useState({});
  const [validatedFiles, setValidatedFiles] = useState([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      const response = await fetch(`/api/batches/${batchId}/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      setSummary(data);
      setValidatedFiles(data.validated_files);
    };
    fetchSummary();
  }, [batchId]);

  const handleValidateBatch = async () => {
    const response = await fetch(`/api/batches/${batchId}/validate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    if (response.ok) {
      setSuccess(true);
      setTimeout(() => window.location.href = '/dashboard', 3000);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4">Validation Finale – Batch {batchId}</Typography>
      <Card style={{ margin: '2rem auto', maxWidth: '600px' }}>
        <Typography>Total fichiers : {summary.total_files}</Typography>
        <Typography>Fichiers corrigés : {summary.corrected_files}</Typography>
        <Typography>Anomalies restantes : {summary.anomalies_remaining}</Typography>
      </Card>
      <TableContainer component={Paper}>
        <Table>
          <TableHead><TableRow><TableCell>Fichiers Validés</TableCell></TableRow></TableHead>
          <TableBody>
            {validatedFiles.map((file) => (
              <TableRow key={file}><TableCell>{file}</TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="contained" style={{ backgroundColor: '#7FB2E5', margin: '1rem' }} onClick={handleValidateBatch}>
        Valider le Batch
      </Button>
      {success && <Snackbar open={true} message="Batch validé avec succès !" />}
    </div>
  );
}




7️⃣ Écran 7 : Notification de Succès (Batch)
Code React :
jsx
Copier

// SuccessBatch.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Button, Card, Snackbar } from '@mui/material';

function SuccessBatch() {
  const { batchId } = useParams();
  const [summary, setSummary] = useState({});

  useEffect(() => {
    const fetchSummary = async () => {
      const response = await fetch(`/api/batches/${batchId}/summary`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      });
      setSummary(await response.json());
    };
    fetchSummary();
  }, [batchId]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <Typography variant="h3" style={{ color: 'green' }}>✅ Traitement terminé !</Typography>
      <Card style={{ margin: '2rem auto', maxWidth: '600px' }}>
        <Typography>Batch : {batchId}</Typography>
        <Typography>Fichiers traités : {summary.total_files}</Typography>
        <Typography>Anomalies corrigées : {summary.anomalies_corrected}</Typography>
        <Typography>Temps : {summary.processing_time}</Typography>
      </Card>
      <Button
        variant="contained"
        style={{ backgroundColor: '#7FB2E5', margin: '1rem' }}
        onClick={() => window.location.href = '/dashboard'}
      >
        Retour au Dashboard
      </Button>
      <Button
        variant="outlined"
        style={{ margin: '1rem' }}
        onClick={() => window.open(`/api/batches/${batchId}/export`, '_blank')}
      >
        Exporter les Résultats
      </Button>
    </div>
  );
}





🔹 Rôle 3 : Administrateur UCAR
Objectif : Superviser l’ensemble des uploads, gérer les anomalies globales, et configurer les templates.

1️⃣ Écran 1 : Connexion (Login)
Identique aux autres rôles, mais avec role: admin.

2️⃣ Écran 2 : Dashboard Admin
Code React :
jsx
Copier

// DashboardAdmin.jsx
import { useEffect, useState } from 'react';
import { Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Badge } from '@mui/material';

function DashboardAdmin() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setData(await response.json());
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Tableau de Bord Admin</Typography>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', width: '200px' }}>
          <Typography>Uploads en cours</Typography>
          <Typography variant="h5">{data?.total_uploads}</Typography>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', width: '200px' }}>
          <Badge badgeContent={data?.total_anomalies} color="error">
            <Typography>Anomalies Globales</Typography>
          </Badge>
        </div>
      </div>
      <Button variant="contained" style={{ backgroundColor: '#7FB2E5', marginRight: '1rem' }} onClick={() => window.location.href = '/admin/uploads'}>
        Vue Globale des Uploads
      </Button>
      <Button variant="contained" style={{ backgroundColor: '#7FB2E5' }} onClick={() => window.location.href = '/admin/templates'}>
        Configurer les Templates
      </Button>
      <TableContainer component={Paper} style={{ marginTop: '2rem' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Établissement</TableCell>
              <TableCell>Uploads en Cours</TableCell>
              <TableCell>Anomalies</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.institutions?.map((institution) => (
              <TableRow key={institution.name}>
                <TableCell>{institution.name}</TableCell>
                <TableCell>{institution.uploads_in_progress}</TableCell>
                <TableCell>{institution.anomalies_detected}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}




3️⃣ Écran 3 : Vue Globale des Uploads
Code React :
jsx
Copier

// AdminUploads.jsx
import { useEffect, useState } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';

function AdminUploads() {
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    const fetchUploads = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/uploads', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setUploads(await response.json());
    };
    fetchUploads();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Uploads Globaux</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Établissement</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uploads.map((upload) => (
              <TableRow key={upload.file_id}>
                <TableCell>{upload.file_id}</TableCell>
                <TableCell>{upload.institution}</TableCell>
                <TableCell>{upload.document_type}</TableCell>
                <TableCell>{upload.status}</TableCell>
                <TableCell>
                  <Button variant="outlined" onClick={() => window.location.href = `/admin/uploads/${upload.file_id}`}>
                    Détails
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}




4️⃣ Écran 4 : Détails d’un Upload (Admin)
Code React :
jsx
Copier

// AdminUploadDetails.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';

function AdminUploadDetails() {
  const { fileId } = useParams();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/uploads/${fileId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setDetails(await response.json());
    };
    fetchDetails();
  }, [fileId]);

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Détails de l'Upload {fileId}</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            <TableRow><TableCell>Établissement</TableCell><TableCell>{details?.institution}</TableCell></TableRow>
            <TableRow><TableCell>Type</TableCell><TableCell>{details?.document_type}</TableCell></TableRow>
            <TableRow><TableCell>Statut</TableCell><TableCell>{details?.status}</TableCell></TableRow>
            <TableRow><TableCell>Anomalies</TableCell><TableCell>{details?.anomalies_detected}</TableCell></TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Button variant="contained" style={{ backgroundColor: '#7FB2E5', marginTop: '1rem' }} onClick={() => window.location.href = `/admin/uploads/${fileId}/anomalies`}>
        Voir les Anomalies
      </Button>
    </div>
  );
}




5️⃣ Écran 5 : Gestion des Anomalies Globales
Code React :
jsx
Copier

// AdminAnomalies.jsx
import { useEffect, useState } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';

function AdminAnomalies() {
  const [anomalies, setAnomalies] = useState([]);

  useEffect(() => {
    const fetchAnomalies = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/anomalies', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setAnomalies(await response.json());
    };
    fetchAnomalies();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Anomalies Globales</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Établissement</TableCell>
              <TableCell>Fichier</TableCell>
              <TableCell>Champ</TableCell>
              <TableCell>Valeur Actuelle</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {anomalies.map((anomaly) => (
              <TableRow key={anomaly.anomaly_id}>
                <TableCell>{anomaly.anomaly_id}</TableCell>
                <TableCell>{anomaly.institution}</TableCell>
                <TableCell>{anomaly.file_name}</TableCell>
                <TableCell>{anomaly.field}</TableCell>
                <TableCell>{anomaly.current_value}</TableCell>
                <TableCell>
                  <Button variant="outlined" onClick={() => window.location.href = `/admin/uploads/${anomaly.file_id}/anomalies/${anomaly.anomaly_id}`}>
                    Corriger
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}




6️⃣ Écran 6 : Configuration des Templates
Code React :
jsx
Copier

// AdminTemplates.jsx
import { useEffect, useState } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, TextField } from '@mui/material';

function AdminTemplates() {
  const [templates, setTemplates] = useState([]);
  const [newTemplate, setNewTemplate] = useState({ name: '', fields: [] });

  useEffect(() => {
    const fetchTemplates = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/templates', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setTemplates(await response.json());
    };
    fetchTemplates();
  }, []);

  const handleAddTemplate = async () => {
    const token = localStorage.getItem('token');
    await fetch('/api/admin/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(newTemplate),
    });
    setNewTemplate({ name: '', fields: [] });
    // Rafraîchir la liste
  };

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Configuration des Templates</Typography>
      <div style={{ marginBottom: '2rem' }}>
        <Typography variant="h6">Ajouter un Template</Typography>
        <TextField label="Nom" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} />
        <Button variant="contained" style={{ backgroundColor: '#7FB2E5', marginTop: '1rem' }} onClick={handleAddTemplate}>
          Ajouter
        </Button>
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nom</TableCell>
              <TableCell>Champs</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.template_id}>
                <TableCell>{template.name}</TableCell>
                <TableCell>{template.fields.join(', ')}</TableCell>
                <TableCell>
                  <Button variant="outlined">Modifier</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}




7️⃣ Écran 7 : Logs & Audit
Code React :
jsx
Copier

// AdminLogs.jsx
import { useEffect, useState } from 'react';
import { Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

function AdminLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setLogs(await response.json());
    };
    fetchLogs();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>Logs & Audit</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>Utilisateur</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Fichier</TableCell>
              <TableCell>Détails</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.log_id}>
                <TableCell>{log.timestamp}</TableCell>
                <TableCell>{log.user}</TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>{log.file_id}</TableCell>
                <TableCell>{log.details}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}





📌 Backend FastAPI (Exemples d’Endpoints)

1️⃣ Authentification (Login)
python
Copier

# auth.py
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

router = APIRouter()
SECRET_KEY = "votre_cle_secrete"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Vérification des identifiants (exemple simplifié)
    if form_data.username != "admin" or form_data.password != "secret":
        raise HTTPException(status_code=400, detail="Identifiants incorrects")
    access_token = create_access_token(data={"sub": form_data.username, "role": "admin"})
    return {"access_token": access_token, "token_type": "bearer"}




2️⃣ Upload de Fichiers (Doyen/Chargé de Données)
python
Copier

# upload.py
from fastapi import APIRouter, UploadFile, File, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
import uuid

router = APIRouter()
security = HTTPBearer()

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    institution: str = "UCAR",
    document_type: str = "grades",
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    file_id = str(uuid.uuid4())
    file_location = f"uploads/{file_id}_{file.filename}"
    os.makedirs(os.path.dirname(file_location), exist_ok=True)
    with open(file_location, "wb+") as file_object:
        file_object.write(await file.read())
    return {
        "status": "success",
        "file_id": file_id,
        "extraction_quality": 0,
        "anomalies_detected": 0,
        "validation_status": "pending"
    }




3️⃣ Traitement des Anomalies (Admin/Doyen)
python
Copier

# anomalies.py
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()

@router.get("/anomalies")
async def get_anomalies(file_id: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Exemple de données simulées
    anomalies = [
        {"anomaly_id": "1", "field": "grade", "current_value": 25, "expected_value": "0-20", "suggested_correction": 20},
        {"anomaly_id": "2", "field": "student_id", "current_value": "UCAR999", "expected_value": "existing_id", "suggested_correction": "UCAR001"}
    ]
    return {"anomalies": anomalies, "progress": 30}

@router.patch("/anomalies/{anomaly_id}/correct")
async def correct_anomaly(anomaly_id: str, corrected_value: str, credentials: HTTPAuthorizationCredentials = Depends(security)):
    return {"status": "corrected", "anomaly_id": anomaly_id, "corrected_value": corrected_value}




4️⃣ Gestion des Templates (Admin)
python
Copier

# templates.py
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

router = APIRouter()
security = HTTPBearer()

class Template(BaseModel):
    name: str
    fields: list

@router.get("/templates")
async def get_templates(credentials: HTTPAuthorizationCredentials = Depends(security)):
    # Exemple de données simulées
    templates = [
        {"template_id": "1", "name": "Grades", "fields": ["student_id", "subject", "grade"]},
        {"template_id": "2", "name": "Budget", "fields": ["institution", "allocated", "spent"]}
    ]
    return templates

@router.post("/templates")
async def add_template(template: Template, credentials: HTTPAuthorizationCredentials = Depends(security)):
    return {"status": "created", "template": template}





📌 Résumé des APIs Backend (FastAPI)


  
    
      Endpoint
      Méthode
      Description
      Rôle Autorisé
    
  
  
    
      /api/auth/login
      POST
      Authentification et génération de JWT.
      Tous
    
    
      /api/upload
      POST
      Upload d’un fichier (PDF/Excel/Image).
      Doyen, Chargé de Données
    
    
      /api/upload/batch
      POST
      Upload d’un batch de fichiers (ZIP).
      Chargé de Données
    
    
      /api/upload/{file_id}/status
      GET
      Statut du traitement d’un fichier.
      Doyen, Chargé de Données
    
    
      /api/anomalies
      GET
      Liste des anomalies pour un fichier.
      Doyen, Chargé de Données
    
    
      /api/anomalies/{anomaly_id}/correct
      PATCH
      Correction d’une anomalie.
      Doyen, Chargé de Données
    
    
      /api/admin/dashboard
      GET
      Dashboard global des uploads.
      Admin
    
    
      /api/admin/uploads
      GET
      Liste des uploads globaux.
      Admin
    
    
      /api/admin/templates
      GET/POST
      Gestion des templates.
      Admin
    
    
      /api/admin/logs
      GET
      Logs et audit.
      Admin
    
  




📌 Modèle de Données SQLite (Complet)
sql
Copier

-- Utilisateurs
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'dean', 'professor', 'data_manager')),
    email TEXT UNIQUE NOT NULL,
    institution TEXT,
    password_hash TEXT NOT NULL
);

-- Étudiants
CREATE TABLE students (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    enrollment_date DATE
);

-- Notes
CREATE TABLE grades (
    grade_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade REAL CHECK(grade >= 0 AND grade <= 20),
    semester INTEGER,
    year INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Budgets
CREATE TABLE budgets (
    budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
    institution TEXT NOT NULL,
    allocated REAL NOT NULL,
    spent REAL NOT NULL CHECK(spent <= allocated),
    year INTEGER,
    month INTEGER
);

-- Uploads
CREATE TABLE uploads (
    file_id TEXT PRIMARY KEY,
    institution TEXT NOT NULL,
    document_type TEXT NOT NULL,
    status TEXT NOT NULL,
    user_id TEXT NOT NULL,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Anomalies
CREATE TABLE anomalies (
    anomaly_id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    field TEXT NOT NULL,
    current_value TEXT,
    expected_value TEXT,
    suggested_correction TEXT,
    corrected_value TEXT,
    FOREIGN KEY (file_id) REFERENCES uploads(file_id)
);

-- Logs
CREATE TABLE audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    file_id TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (file_id) REFERENCES uploads(file_id)
);

-- Templates
CREATE TABLE templates (
    template_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    fields TEXT NOT NULL,  -- JSON array
    created_by TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);





📌 Résumé Final et Prochaines Étapes
📋 Checklist pour le Développement


Backend :

 Implémenter les endpoints FastAPI (auth, upload, anomalies, admin).
 Configurer SQLite avec les tables ci-dessus.
 Intégrer PaddleOCR et Mistral LLM.
 Configurer Apache Airflow pour l’orchestration ETL.


Frontend :

 Créer les composants React pour chaque écran (Login, Dashboard, Upload, etc.).
 Implémenter le RBAC et les permissions.
 Styliser avec Material UI et les couleurs UCAR.


Sécurité :

 Configurer JWT et RBAC.
 Chiffrer les données sensibles (AES-256).
 Implémenter les logs d’audit.


Tests :

 Tester l’OCR sur des échantillons de PDFs.
 Valider la détection d’anomalies.
 Vérifier les permissions RBAC.


Déploiement :

 Configurer Docker pour le backend et le frontend.
 Mettre en place GitHub Actions pour le CI/CD.


🚀 Exemple de Commande pour Démarrer avec Cursor
plaintext
Copier

"Génère le projet complet avec :
1. Le backend FastAPI avec les endpoints /api/auth/login, /api/upload, /api/anomalies, /api/admin/dashboard.
2. Le frontend React avec les composants Login, DashboardDean, UploadDean, ProcessingDean, RelectureDean, DashboardBatch, UploadBatch, etc.
3. Les modèles SQLite pour users, students, grades, uploads, anomalies, audit_logs.
4. La configuration RBAC et JWT pour la sécurité.
Utilise les couleurs UCAR (#003E6B pour le bleu principal, #7FB2E5 pour l'accent)."





🎉 Votre application est maintenant prête à être développée !

Ce document couvre tous les écrans, tous les rôles, et toutes les fonctionnalités nécessaires pour le Track 1 du HACK4UCAR. Vous pouvez utiliser Cursor pour générer le code en vous basant sur ces spécifications détaillées.








