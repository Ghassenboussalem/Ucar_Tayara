# No-Code Workflow Builder — UX Design

## Who Uses This

- **Deans & Directors** — create alert rules for their institution
- **Administrative staff** — automate repetitive tasks they do every week
- **Institution admins** — configure platform-wide automation policies
- **No developer needed. Ever.**

---

## Mental Model: "If This, Then That" — University Edition

The entire builder is built around one simple concept:

```
WHEN [something happens]
AND  [optional conditions]
THEN [do these actions]
```

Every workflow a university administrator needs can be expressed this way.
The UI makes it visual, guided, and mistake-proof.

---

## Screen 1: Workflow Library (Home)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Automatisations                          [+ Nouvelle règle] │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Rechercher...          Filtrer: [Tous ▼] [Module ▼]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📦 MODÈLES SUGGÉRÉS                                            │
│  ┌──────────────────┐ ┌──────────────────┐ ┌────────────────┐  │
│  │ 🔴 Alerte budget │ │ 📋 Rapport auto  │ │ 🎓 Risque      │  │
│  │ dépassement      │ │ mensuel KPI      │ │ abandon        │  │
│  │ [Utiliser]       │ │ [Utiliser]       │ │ [Utiliser]     │  │
│  └──────────────────┘ └──────────────────┘ └────────────────┘  │
│                                                                  │
│  ✅ MES AUTOMATISATIONS ACTIVES (7)                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🟢 Alerte taux d'abandon > 8%          Finance · Actif  │   │
│  │    Déclenché 3 fois ce mois  [Modifier] [Pause] [...]   │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 🟢 Rapport hebdo — lundi 7h            Tous · Actif     │   │
│  │    Dernier envoi: lundi 07:02          [Modifier] [...]  │   │
│  ├─────────────────────────────────────────────────────────┤   │
│  │ 🟡 Rappel renouvellement convention    Partenariats      │   │
│  │    Prochaine exécution: 15 mai 2026    [Modifier] [...]  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Screen 2: Workflow Builder Canvas

Three-panel layout:

```
┌──────────────┬──────────────────────────────┬──────────────────┐
│   TRIGGERS   │        CANVAS                │   ACTIONS        │
│   (left)     │        (center)              │   (right)        │
└──────────────┴──────────────────────────────┴──────────────────┘
```

### Left Panel — Trigger Picker

```
┌─────────────────────┐
│  DÉCLENCHEURS       │
│                     │
│  📊 KPI             │
│  ├ Seuil dépassé    │
│  ├ Tendance détectée│
│  └ Anomalie IA      │
│                     │
│  📅 Planification   │
│  ├ Quotidien        │
│  ├ Hebdomadaire     │
│  ├ Mensuel          │
│  └ Date spécifique  │
│                     │
│  📝 Événement       │
│  ├ Formulaire soumis│
│  ├ Document uploadé │
│  ├ Alerte créée     │
│  └ Rapport généré   │
│                     │
│  👤 Action utilisat.│
│  ├ Connexion        │
│  ├ Approbation      │
│  └ Modification     │
└─────────────────────┘
```

### Center Panel — Canvas (drag & drop)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   ┌─────────────────────────────────┐                   │
│   │  🔵 DÉCLENCHEUR                 │                   │
│   │  KPI: Taux d'abandon            │                   │
│   │  Établissement: EPT             │                   │
│   │  Condition: > 8%                │                   │
│   └──────────────┬──────────────────┘                   │
│                  │                                       │
│          ┌───────▼────────┐                             │
│          │  + Condition   │  ← optional filter          │
│          │  Période: S1   │                             │
│          └───────┬────────┘                             │
│                  │                                       │
│        ┌─────────▼──────────────┐                       │
│        │  🟠 ACTION 1           │                       │
│        │  Envoyer notification  │                       │
│        │  À: Directeur EPT      │                       │
│        │  Canal: Email + App    │                       │
│        └─────────┬──────────────┘                       │
│                  │                                       │
│        ┌─────────▼──────────────┐                       │
│        │  🟠 ACTION 2           │                       │
│        │  Générer rapport       │                       │
│        │  Module: Académique    │                       │
│        │  Format: PDF           │                       │
│        └─────────┬──────────────┘                       │
│                  │                                       │
│        ┌─────────▼──────────────┐                       │
│        │  🟠 ACTION 3           │                       │
│        │  Planifier réunion     │                       │
│        │  Avec: Directeur, VP   │                       │
│        │  Délai: Dans 48h       │                       │
│        └────────────────────────┘                       │
│                                                          │
│   [+ Ajouter une action]                                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Right Panel — Action Picker

```
┌─────────────────────┐
│  ACTIONS            │
│                     │
│  🔔 Notifications   │
│  ├ Email            │
│  ├ SMS              │
│  ├ In-app           │
│  └ WhatsApp         │
│                     │
│  📄 Rapports        │
│  ├ Générer PDF      │
│  ├ Générer Excel    │
│  └ Envoyer rapport  │
│                     │
│  📅 Agenda          │
│  ├ Créer réunion    │
│  ├ Rappel           │
│  └ Bloquer créneau  │
│                     │
│  ✅ Tâches          │
│  ├ Créer tâche      │
│  ├ Assigner tâche   │
│  └ Escalader        │
│                     │
│  🤖 IA              │
│  ├ Analyse causale  │
│  ├ Prévision        │
│  └ Résumé narratif  │
│                     │
│  🔗 Intégrations    │
│  ├ Webhook          │
│  └ Email entrant    │
└─────────────────────┘
```

---

## Screen 3: Trigger Configuration (modal)

When user clicks on a trigger block:

```
┌──────────────────────────────────────────────────┐
│  Configurer le déclencheur                    ✕  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Type: KPI — Seuil dépassé                      │
│                                                  │
│  Indicateur                                      │
│  [Taux d'abandon académique          ▼]          │
│                                                  │
│  Établissement                                   │
│  [Tous les établissements            ▼]          │
│  ☑ EPT   ☑ INSAT   ☑ Sup'Com   ☐ Sélect. tout  │
│                                                  │
│  Condition                                       │
│  Valeur  [>  ▼]  [8]  [%]                       │
│                                                  │
│  Période de référence                            │
│  [Semestre en cours                  ▼]          │
│                                                  │
│  Fréquence de vérification                       │
│  [Toutes les heures                  ▼]          │
│                                                  │
│  ⚠️ Délai de grâce: ne pas re-déclencher avant  │
│  [24] heures après la dernière alerte            │
│                                                  │
│              [Annuler]  [Confirmer ✓]            │
└──────────────────────────────────────────────────┘
```

---

## Screen 4: Action Configuration (modal)

When user clicks on an action block:

### Notification action:
```
┌──────────────────────────────────────────────────┐
│  Configurer: Envoyer notification             ✕  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Destinataires                                   │
│  [+ Ajouter]                                     │
│  👤 Directeur de l'établissement concerné        │
│  👤 VP Académique                                │
│                                                  │
│  Canaux                                          │
│  ☑ Email   ☑ Notification app   ☐ SMS           │
│                                                  │
│  Objet (email)                                   │
│  [⚠️ Alerte: {{kpi_name}} à {{kpi_value}}%]     │
│                                                  │
│  Message                                         │
│  ┌────────────────────────────────────────────┐  │
│  │ L'indicateur {{kpi_name}} de              │  │
│  │ {{institution_name}} a atteint            │  │
│  │ {{kpi_value}}%, dépassant le seuil de     │  │
│  │ {{threshold}}%.                           │  │
│  │                                           │  │
│  │ [Insérer variable ▼]  [Générer avec IA]  │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Priorité: [Haute ▼]                            │
│                                                  │
│              [Annuler]  [Confirmer ✓]            │
└──────────────────────────────────────────────────┘
```

---

## Screen 5: AI-Assisted Workflow Creation

The killer feature — describe what you want in plain French or Arabic, AI builds the workflow:

```
┌──────────────────────────────────────────────────────────────┐
│  ✨ Créer avec l'IA                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Décrivez ce que vous voulez automatiser:                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ "Je veux être alerté quand le taux d'abandon         │   │
│  │  dépasse 8% dans n'importe quel établissement,       │   │
│  │  et qu'un rapport soit automatiquement généré        │   │
│  │  et envoyé au directeur concerné."                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  [🎤 Dicter]                          [Générer le workflow]  │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  ✅ Workflow généré — vérifiez et ajustez si nécessaire:     │
│                                                              │
│  DÉCLENCHEUR: KPI Taux d'abandon > 8% (tous établissements) │
│  ACTION 1: Notification email → Directeur établissement      │
│  ACTION 2: Générer rapport PDF → Module Académique           │
│  ACTION 3: Envoyer rapport → Directeur établissement         │
│                                                              │
│  [Modifier]                    [Activer ce workflow ✓]       │
└──────────────────────────────────────────────────────────────┘
```

---

## Screen 6: Workflow Test & Simulation

Before activating, test with real or simulated data:

```
┌──────────────────────────────────────────────────────────────┐
│  🧪 Tester le workflow                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Simuler avec:                                               │
│  ○ Données réelles (dernières valeurs connues)               │
│  ● Données simulées                                          │
│                                                              │
│  Valeur simulée du KPI: [9.2] %                             │
│  Établissement: [EPT ▼]                                      │
│                                                              │
│  [▶ Lancer la simulation]                                    │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  RÉSULTAT DE SIMULATION                                      │
│                                                              │
│  ✅ Déclencheur activé (9.2% > 8%)                          │
│  ✅ Action 1: Email simulé envoyé à directeur.ept@ucar.tn   │
│     Aperçu: "⚠️ Alerte: Taux d'abandon à 9.2%..."          │
│  ✅ Action 2: Rapport PDF généré (aperçu disponible)         │
│     [👁 Voir l'aperçu du rapport]                           │
│  ✅ Action 3: Rapport envoyé (simulation)                    │
│                                                              │
│  Durée d'exécution simulée: 4.2 secondes                    │
│                                                              │
│  [Modifier]              [✓ Activer le workflow]            │
└──────────────────────────────────────────────────────────────┘
```

---

## Screen 7: Workflow Execution History

```
┌──────────────────────────────────────────────────────────────┐
│  📋 Historique — Alerte taux d'abandon > 8%                  │
├──────────────────────────────────────────────────────────────┤
│  Filtre: [Tous ▼]  [Ce mois ▼]                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ✅ 23 avril 2026, 14:32 — EPT                              │
│     Taux d'abandon: 9.8% → 3 actions exécutées              │
│     [Voir détails]                                           │
│                                                              │
│  ✅ 15 avril 2026, 09:17 — INSAT                            │
│     Taux d'abandon: 8.3% → 3 actions exécutées              │
│     [Voir détails]                                           │
│                                                              │
│  ❌ 10 avril 2026, 11:45 — Sup'Com                          │
│     Erreur: destinataire email invalide                      │
│     [Voir erreur]  [Réessayer]                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Pre-Built Template Library

Ready-to-use templates for UCAR's most common needs:

| Template | Trigger | Actions |
|---|---|---|
| 🔴 Alerte budget critique | Budget consommé > 85% | Notif directeur + rapport finance |
| 🎓 Risque abandon | Taux abandon > seuil | Notif + rapport + réunion |
| 📋 Rapport hebdo automatique | Chaque lundi 7h | Générer + envoyer rapport KPI |
| 🤝 Convention expirante | Convention < 30 jours | Notif partenariats + draft renouvellement |
| 👥 Charge enseignante critique | Charge > 95% plafond | Notif RH + recommandation recrutement |
| 🏗 Maintenance urgente | Score maintenance < 50% | Notif infrastructure + ticket maintenance |
| 🎓 Résultats examens publiés | Résultats uploadés | Notif étudiants + mise à jour KPI |
| 📊 Rapport mensuel ministère | 1er du mois | Compiler + générer rapport officiel |
| ⚡ Anomalie IA détectée | AlertInvestigatorAgent fire | Notif + rapport causal + réunion |
| 🌱 Seuil ESG dépassé | Consommation énergie > cible | Notif + rapport ESG + plan action |

---

## Key UX Principles Applied

- **Progressive disclosure** — simple IF/THEN first, advanced options hidden behind "+"
- **Variables with autocomplete** — `{{institution_name}}`, `{{kpi_value}}` suggested as you type
- **AI-first creation** — describe in French/Arabic, AI builds the workflow, human adjusts
- **Test before activate** — simulation mode prevents broken workflows going live
- **Templates** — 80% of users never need to build from scratch
- **Undo everything** — every workflow change is versioned, one-click rollback
- **Mobile-friendly** — directors approve/pause workflows from their phone
