📌 Parcours Utilisateur (User Flow) + Architecture des Interfaces
Projet : UCAR Data Hub (Track 1) – Plateforme d’ingestion, validation et stockage des données.

Utilisateur Type : Doyen d’établissement (ex: ISITCOM) ou Chargé de Données.


📊 Schéma Global du Parcours Utilisateur
mermaid
Copier

flowchart TD
    A[Connexion à l'App] --> B{Écran d'Accueil}
    B --> C[Upload de Fichier]
    C --> D[Feedback de Traitement]
    D --> E{Anomalies Détectées?}
    E -->|Oui| F[Interface de Relecture]
    E -->|Non| G[Stockage et Notification]
    F --> H[Correction des Données]
    H --> I[Validation Finale]
    I --> G
    G --> J[Notification de Succès]
    J --> K[Dashboard Admin]





🎨 Architecture des Interfaces et Contenu
Voici une liste exhaustive des écrans, leur contenu, leur ordre logique, et leur architecture technique (composants React, APIs FastAPI, données).


1️⃣ Écran 1 : Connexion (Login)
Objectif : Authentifier l’utilisateur et lui attribuer un rôle (doyen, professeur, chargé de données, admin).
Contenu de l’Écran


  
    
      Élément
      Description
      Technologie
      Données Associées
    
  
  
    
      Formulaire de Login
      Champs : Email, Mot de passe.
      React + Material UI
      Requête POST vers /api/auth/login (FastAPI).
    
    
      Bouton "Se Connecter"
      Active la requête d’authentification.
      React Button
      JWT retourné si succès.
    
    
      Lien "Mot de passe oublié"
      Redirige vers une page de récupération (hors scope Track 1).
      React Link
      -
    
    
      Feedback
      Message d’erreur si les identifiants sont incorrects.
      React Snackbar
      -
    
  


Exemple de Code (React)
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
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        window.location.href = '/upload'; // Redirige vers la page d'upload
      } else {
        setError('Identifiants incorrects');
      }
    } catch (err) {
      setError('Erreur réseau');
    }
  };

  return (
    <div style={{ backgroundColor: '#003E6B', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', width: '400px' }}>
        <h2>Se Connecter</h2>
        <TextField
          label="Email"
          variant="outlined"
          fullWidth
          margin="normal"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Mot de Passe"
          type="password"
          variant="outlined"
          fullWidth
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button
          variant="contained"
          fullWidth
          style={{ backgroundColor: '#7FB2E5', marginTop: '1rem' }}
          onClick={handleLogin}
        >
          Se Connecter
        </Button>
        {error && <Snackbar open={!!error} message={error} autoHideDuration={3000} />}
      </div>
    </div>
  );
}





2️⃣ Écran 2 : Accueil (Dashboard Utilisateur)
Objectif : Donner un aperçu rapide de l’état des uploads et des anomalies.
Contenu de l’Écran


  
    
      Élément
      Description
      Technologie
      Données Associées
    
  
  
    
      Titre
      "Bienvenue, [Nom de l’utilisateur]"
      React Typography
      Récupéré depuis le token JWT décodé.
    
    
      Statistiques
      - Nombre d’upload en cours. 


- Nombre d’anomalies détectées. 


- Temps moyen de traitement.
      React + Plotly
      Requête GET vers /api/dashboard?user_id=[ID] (FastAPI).
    
    
      Bouton "Nouvel Upload"
      Redirige vers la page d’upload.
      React Button
      -
    
    
      Liste des Derniers Uploads
      Affiche les 5 derniers fichiers uploadés avec leur statut.
      React Table
      Requête GET vers /api/uploads/recent (FastAPI).
    
    
      Notifications
      Badge rouge si des anomalies sont détectées.
      React Badge
      -
    
  


Exemple de Réponse API (/api/dashboard)
json
Copier

{
  "user": "Doyen ISITCOM",
  "uploads_in_progress": 2,
  "anomalies_detected": 5,
  "average_processing_time": "2h30",
  "recent_uploads": [
    {"file_id": "123", "name": "Grades_Semester1_2026.pdf", "status": "processing"},
    {"file_id": "456", "name": "Budget_2026.xlsx", "status": "validated"}
  ]
}



Exemple de Code (React)
jsx
Copier

// Dashboard.jsx
import { useEffect, useState } from 'react';
import { Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Badge } from '@mui/material';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState({});
  const [uploads, setUploads] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setDashboardData(data);
      setUploads(data.recent_uploads);
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>
        Bienvenue, {dashboardData.user}
      </Typography>
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', width: '200px' }}>
          <Typography>Uploads en cours</Typography>
          <Typography variant="h5">{dashboardData.uploads_in_progress}</Typography>
        </div>
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', width: '200px' }}>
          <Badge badgeContent={dashboardData.anomalies_detected} color="error">
            <Typography>Anomalies</Typography>
          </Badge>
        </div>
      </div>
      <Button
        variant="contained"
        style={{ backgroundColor: '#7FB2E5' }}
        onClick={() => window.location.href = '/upload'}
      >
        Nouvel Upload
      </Button>
      <TableContainer component={Paper} style={{ marginTop: '2rem' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fichier</TableCell>
              <TableCell>Statut</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uploads.map((upload) => (
              <TableRow key={upload.file_id}>
                <TableCell>{upload.name}</TableCell>
                <TableCell>{upload.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}





3️⃣ Écran 3 : Upload de Fichiers
Objectif : Permettre à l’utilisateur d’uploader des fichiers (PDF, Excel, images) et de suivre leur traitement.
Contenu de l’Écran


  
    
      Élément
      Description
      Technologie
      Données Associées
    
  
  
    
      Zone de Drag & Drop
      Accepte les fichiers par glisser-déposer.
      React Dropzone
      Fichiers temporaires stockés dans le navigateur.
    
    
      Bouton "Sélectionner un Fichier"
      Alternative au drag & drop.
      React Button
      -
    
    
      Bouton "Upload"
      Lance l’upload et le traitement.
      React Button
      Requête POST vers /api/upload (FastAPI) avec le fichier.
    
    
      Feedback de Traitement
      Affiche la progression : "Extraction en cours (40%)...", "Validation en cours (20%)...".
      React Progress Bar
      WebSocket ou polling vers /api/upload/{file_id}/status.
    
    
      Liste des Fichiers Uploadés
      Affiche les fichiers en cours de traitement.
      React Table
      Requête GET vers /api/uploads/in_progress.
    
    
      Bouton "Annuler"
      Permet d’annuler un upload en cours.
      React Button
      Requête DELETE vers /api/upload/{file_id}.
    
  


Exemple de Réponse API (/api/upload)
json
Copier

{
  "status": "success",
  "file_id": "123e4567-e89b-12d3-a456-426614174000",
  "extraction_quality": 95,
  "anomalies_detected": 2,
  "validation_status": "pending"
}



Exemple de Code (React)
jsx
Copier

// Upload.jsx
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Typography, Button, LinearProgress, Snackbar } from '@mui/material';

function Upload() {
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
    },
    multiple: true,
    onDrop: (acceptedFiles) => {
      setFiles(acceptedFiles);
      setStatus('uploading');
      uploadFiles(acceptedFiles);
    },
  });

  const uploadFiles = async (filesToUpload) => {
    const formData = new FormData();
    filesToUpload.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('institution', 'ISITCOM');
    formData.append('document_type', 'grades');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        pollStatus(data.file_id);
      } else {
        setError('Échec de l\'upload');
        setStatus('error');
      }
    } catch (err) {
      setError('Erreur réseau');
      setStatus('error');
    }
  };

  const pollStatus = (fileId) => {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/upload/${fileId}/status`);
      const data = await response.json();
      setProgress((data.extraction_quality + data.validation_quality) / 2);
      if (data.status === 'completed') {
        clearInterval(interval);
        setStatus('completed');
      }
    }, 2000);
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>
        Upload de Fichiers
      </Typography>
      <div
        {...getRootProps()}
        style={{
          border: '2px dashed #7FB2E5',
          borderRadius: '8px',
          padding: '2rem',
          textAlign: 'center',
          backgroundColor: 'white',
          marginBottom: '1rem',
        }}
      >
        <input {...getInputProps()} />
        <Typography>Glisser-déposer vos fichiers ici ou cliquez pour sélectionner</Typography>
      </div>
      {files.length > 0 && (
        <div>
          <Typography>Fichiers sélectionnés :</Typography>
          <ul>
            {files.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
          <Button
            variant="contained"
            style={{ backgroundColor: '#7FB2E5' }}
            onClick={() => uploadFiles(files)}
          >
            Upload
          </Button>
        </div>
      )}
      {status === 'uploading' && (
        <div style={{ marginTop: '1rem' }}>
          <Typography>Traitement en cours...</Typography>
          <LinearProgress variant="determinate" value={progress} />
        </div>
      )}
      {status === 'completed' && (
        <Typography style={{ color: 'green' }}>Upload terminé avec succès !</Typography>
      )}
      {error && <Snackbar open={!!error} message={error} autoHideDuration={3000} />}
    </div>
  );
}





4️⃣ Écran 4 : Feedback de Traitement (Traitement en Cours)
Objectif : Afficher l’état du traitement en temps réel.
Contenu de l’Écran


  
    
      Élément
      Description
      Technologie
      Données Associées
    
  
  
    
      Titre
      "Traitement du fichier [Nom du Fichier]"
      React Typography
      Nom du fichier uploadé.
    
    
      Barre de Progression
      Affiche l’avancement : Extraction (60%), Validation (30%), Stockage (10%).
      React LinearProgress
      WebSocket ou polling vers /api/upload/{file_id}/status.
    
    
      Détails du Traitement
      - Nombre de pages/entrées traitées. 


- Qualité d’extraction (OCR). 


- Anomalies détectées.
      React Table
      Requête GET vers /api/upload/{file_id}/details.
    
    
      Bouton "Voir les Anomalies"
      Si des anomalies sont détectées, redirige vers l’interface de relecture.
      React Button
      -
    
  


Exemple de Réponse API (/api/upload/123/status)
json
Copier

{
  "status": "processing",
  "extraction_quality": 60,
  "validation_quality": 30,
  "anomalies_detected": 2,
  "pages_processed": 45,
  "total_pages": 50
}



Exemple de Code (React)
jsx
Copier

// Processing.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, LinearProgress, CircularProgress, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

function Processing() {
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

  if (!status) {
    return <CircularProgress />;
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5' }}>
      <Typography variant="h4" style={{ color: '#003E6B', marginBottom: '1rem' }}>
        Traitement de {status.file_name}
      </Typography>
      <div style={{ marginBottom: '2rem' }}>
        <Typography>Extraction : {status.extraction_quality}%</Typography>
        <LinearProgress variant="determinate" value={status.extraction_quality} />
        <Typography>Validation : {status.validation_quality}%</Typography>
        <LinearProgress variant="determinate" value={status.validation_quality} />
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Métrique</TableCell>
              <TableCell>Valeur</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Pages traitées</TableCell>
              <TableCell>{status.pages_processed}/{status.total_pages}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Anomalies détectées</TableCell>
              <TableCell>{status.anomalies_detected}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      {status.anomalies_detected > 0 && (
        <Button
          variant="contained"
          style={{ backgroundColor: '#7FB2E5', marginTop: '1rem' }}
          onClick={() => window.location.href = `/relecture/${fileId}`}
        >
          Voir les Anomalies
        </Button>
      )}
    </div>
  );
}





5️⃣ Écran 5 : Interface de Relecture (Human-in-the-Loop)
Objectif : Permettre à l’utilisateur de corriger les anomalies détectées par l’IA.
Contenu de l’Écran


  
    
      Élément
      Description
      Technologie
      Données Associées
    
  
  
    
      Titre
      "Correction des Anomalies pour [Nom du Fichier]"
      React Typography
      Nom du fichier.
    
    
      Liste des Anomalies
      Affiche les champs à corriger avec : 


- Valeur actuelle. 


- Valeur attendue. 


- Suggestion de correction.
      React Table
      Requête GET vers /api/anomalies?file_id=[ID].
    
    
      Champ de Correction
      Permet de modifier la valeur d’un champ.
      React TextField
      Requête PATCH vers /api/anomalies/{anomaly_id}/correct.
    
    
      Bouton "Valider les Corrections"
      Envoie les corrections au backend.
      React Button
      -
    
    
      Barre de Progression
      Affiche le pourcentage de corrections effectuées.
      React LinearProgress
      -
    
    
      Bouton "Annuler"
      Permet d’annuler les modifications.
      React Button
      -
    
  


Exemple de Réponse API (/api/anomalies?file_id=123)
json
Copier

{
  "anomalies": [
    {
      "anomaly_id": "1",
      "field": "grade",
      "current_value": 25,
      "expected_value": "0-20",
      "suggested_correction": 20,
      "corrected_value": null
    },
    {
      "anomaly_id": "2",
      "field": "student_id",
      "current_value": "UCAR999",
      "expected_value": "existing_id",
      "suggested_correction": "UCAR001",
      "corrected_value": null
    }
  ],
  "progress": 0
}



Exemple de Code (React)
jsx
Copier

// Relecture.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TextField, LinearProgress } from '@mui/material';

function Relecture() {
  const { fileId } = useParams();
  const [anomalies, setAnomalies] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchAnomalies = async () => {
      const response = await fetch(`/api/anomalies?file_id=${fileId}`);
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
    setAnomalies(anomalies.map(a =>
      a.anomaly_id === anomalyId ? { ...a, corrected_value: newValue } : a







20:06




