import anthropic
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """Tu es UCAR Intelligence, un assistant analytique expert pour l'Université de Carthage (UCAR) en Tunisie.
Tu analyses les données académiques, financières et RH de 33 institutions universitaires.

Ton rôle:
- Répondre aux questions des présidents d'université et directeurs d'institutions
- Analyser les KPIs et identifier des tendances
- Expliquer les anomalies détectées dans les données
- Générer des insights actionnables en français

Règles:
- Réponds TOUJOURS en français
- Sois précis, concis et professionnel
- Cite les chiffres exacts quand ils sont disponibles dans le contexte
- Si tu ne sais pas, dis-le clairement
- Ne jamais inventer des données qui ne sont pas dans le contexte fourni
"""


def ask_claude(user_message: str, data_context: str = "") -> str:
    """Send a message to Claude with optional data context."""
    
    full_message = user_message
    if data_context:
        full_message = f"""Contexte des données actuelles:
{data_context}

Question: {user_message}"""

    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": full_message}
        ]
    )
    
    return message.content[0].text


def explain_anomaly(
    institution_name: str,
    domain: str,
    kpi_name: str,
    kpi_value: float,
    threshold_value: float,
    historical_context: str = ""
) -> str:
    """Generate an AI explanation for a detected anomaly."""
    
    prompt = f"""Une anomalie critique a été détectée dans les données de {institution_name}.

Domaine: {domain}
Indicateur: {kpi_name}
Valeur actuelle: {kpi_value}
Seuil normal: {threshold_value}
Écart: {abs(kpi_value - threshold_value):.2f} points

{f"Contexte historique: {historical_context}" if historical_context else ""}

En 3 phrases maximum:
1. Explique l'anomalie détectée
2. Identifie les causes probables
3. Recommande une action immédiate pour le directeur
"""
    
    return ask_claude(prompt)


def generate_report_summary(
    institution_name: str,
    period: str,
    academic_data: dict,
    finance_data: dict,
    hr_data: dict,
    alerts: list
) -> str:
    """Generate an AI narrative summary for a report."""
    
    prompt = f"""Génère un résumé exécutif professionnel pour le rapport de {institution_name} - Période: {period}

DONNÉES ACADÉMIQUES:
- Taux de réussite: {academic_data.get('success_rate', 'N/A')}%
- Taux d'abandon: {academic_data.get('dropout_rate', 'N/A')}%
- Taux de présence: {academic_data.get('attendance_rate', 'N/A')}%
- Étudiants inscrits: {academic_data.get('total_enrolled', 'N/A')}
- Note moyenne: {academic_data.get('avg_grade', 'N/A')}/20

DONNÉES FINANCIÈRES:
- Budget alloué: {finance_data.get('allocated_budget', 'N/A')} TND
- Budget consommé: {finance_data.get('consumed_budget', 'N/A')} TND
- Taux d'exécution: {finance_data.get('budget_execution_rate', 'N/A')}%
- Coût par étudiant: {finance_data.get('cost_per_student', 'N/A')} TND

DONNÉES RH:
- Personnel enseignant: {hr_data.get('total_teaching_staff', 'N/A')}
- Personnel administratif: {hr_data.get('total_admin_staff', 'N/A')}
- Taux d'absentéisme: {hr_data.get('absenteeism_rate', 'N/A')}%
- Charge d'enseignement moyenne: {hr_data.get('avg_teaching_load_hours', 'N/A')}h/semaine

ALERTES ACTIVES: {len(alerts)}
{chr(10).join([f"- [{a.get('severity','').upper()}] {a.get('title','')}" for a in alerts[:3]])}

Rédige un résumé exécutif de 150 mots maximum, structuré en: 
1. Points forts
2. Points d'attention  
3. Recommandations prioritaires
"""
    
    return ask_claude(prompt)


def answer_data_question(question: str, context_data: dict) -> str:
    """Answer a natural language question about institutional data."""
    
    context_str = f"""
Données disponibles pour cette requête:

INSTITUTIONS ({len(context_data.get('institutions', []))} au total):
{_format_institutions(context_data.get('institutions', []))}

ALERTES ACTIVES ({len(context_data.get('alerts', []))}):
{_format_alerts(context_data.get('alerts', []))}

STATISTIQUES GLOBALES:
- Taux de réussite moyen: {context_data.get('avg_success_rate', 'N/A')}%
- Taux d'exécution budgétaire moyen: {context_data.get('avg_budget_execution', 'N/A')}%
- Total étudiants: {context_data.get('total_students', 'N/A')}
"""
    
    return ask_claude(question, context_str)


def _format_institutions(institutions: list) -> str:
    if not institutions:
        return "Aucune donnée disponible"
    lines = []
    for inst in institutions[:10]:  # limit context size
        lines.append(
            f"  - {inst.get('name_fr', '')} ({inst.get('code', '')}): "
            f"score santé {inst.get('health_score', 'N/A')}, "
            f"alertes actives: {inst.get('active_alerts', 0)}"
        )
    if len(institutions) > 10:
        lines.append(f"  ... et {len(institutions) - 10} autres institutions")
    return "\n".join(lines)


def _format_alerts(alerts: list) -> str:
    if not alerts:
        return "Aucune alerte active"
    lines = []
    for alert in alerts[:5]:
        lines.append(
            f"  - [{alert.get('severity','').upper()}] {alert.get('institution_name', '')} - "
            f"{alert.get('title', '')} (KPI: {alert.get('kpi_value', 'N/A')})"
        )
    return "\n".join(lines)