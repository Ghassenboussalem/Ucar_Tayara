"""
Claude service: AI-powered explanations and summaries.
Uses ai_provider for automatic Anthropic → Groq fallback.
"""
from services.ai_provider import simple_complete

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


def explain_anomaly(
    institution_name: str,
    domain: str,
    kpi_name: str,
    kpi_value: float,
    threshold_value: float,
    historical_context: str = "",
) -> str:
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
    return simple_complete(SYSTEM_PROMPT, prompt, max_tokens=500)


def generate_report_summary(
    institution_name: str,
    period: str,
    academic_data: dict,
    finance_data: dict,
    hr_data: dict,
    alerts: list,
    infrastructure_data: dict = None,
    partnership_data: dict = None,
    employment_data: dict = None,
    esg_data: dict = None,
    research_data: dict = None,
) -> str:
    extra_sections = ""

    if infrastructure_data:
        extra_sections += f"""
INFRASTRUCTURE:
- Occupation des salles: {infrastructure_data.get('classroom_occupancy_rate', 'N/A')}%
- Équipements IT opérationnels: {infrastructure_data.get('it_equipment_status_pct', 'N/A')}%
- Disponibilité laboratoires: {infrastructure_data.get('lab_availability_rate', 'N/A')}%
"""

    if partnership_data:
        extra_sections += f"""
PARTENARIATS & MOBILITÉ:
- Accords internationaux actifs: {partnership_data.get('active_international_agreements', 'N/A')}
- Étudiants en mobilité (entrants/sortants): {partnership_data.get('incoming_students', 'N/A')} / {partnership_data.get('outgoing_students', 'N/A')}
- Partenariats industrie: {partnership_data.get('industry_partnerships', 'N/A')}
"""

    if employment_data:
        extra_sections += f"""
EMPLOYABILITÉ:
- Taux d'employabilité à 6 mois: {employment_data.get('employability_rate_6m', 'N/A')}%
- Taux d'employabilité à 12 mois: {employment_data.get('employability_rate_12m', 'N/A')}%
- Délai moyen d'insertion: {employment_data.get('avg_months_to_employment', 'N/A')} mois
"""

    if esg_data:
        extra_sections += f"""
ESG / DÉVELOPPEMENT DURABLE:
- Empreinte carbone: {esg_data.get('carbon_footprint_tons', 'N/A')} tonnes CO₂
- Taux de recyclage: {esg_data.get('recycling_rate', 'N/A')}%
- Score accessibilité: {esg_data.get('accessibility_score', 'N/A')}/100
"""

    if research_data:
        extra_sections += f"""
RECHERCHE SCIENTIFIQUE:
- Publications: {research_data.get('publications_count', 'N/A')}
- Projets actifs: {research_data.get('active_projects', 'N/A')}
- Financements obtenus: {research_data.get('funding_secured_tnd', 'N/A')} TND
- Doctorants inscrits: {research_data.get('phd_students', 'N/A')}
"""

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
{extra_sections}
ALERTES ACTIVES: {len(alerts)}
{chr(10).join([f"- [{a.get('severity','').upper()}] {a.get('title','')}" for a in alerts[:3]])}

Rédige un résumé exécutif de 200 mots maximum, structuré en:
1. Points forts
2. Points d'attention
3. Recommandations prioritaires
"""
    return simple_complete(SYSTEM_PROMPT, prompt, max_tokens=800)


def answer_data_question(question: str, context_data: dict) -> str:
    """Legacy single-turn Q&A (used outside the agent context)."""
    context_str = f"""
Données disponibles:

INSTITUTIONS ({len(context_data.get('institutions', []))} au total):
{_format_institutions(context_data.get('institutions', []))}

ALERTES ACTIVES ({len(context_data.get('alerts', []))}):
{_format_alerts(context_data.get('alerts', []))}

STATISTIQUES GLOBALES:
- Taux de réussite moyen: {context_data.get('avg_success_rate', 'N/A')}%
- Taux d'exécution budgétaire moyen: {context_data.get('avg_budget_execution', 'N/A')}%
- Total étudiants: {context_data.get('total_students', 'N/A')}
"""
    return simple_complete(SYSTEM_PROMPT, f"{context_str}\n\nQuestion: {question}", max_tokens=800)


def _format_institutions(institutions: list) -> str:
    if not institutions:
        return "Aucune donnée disponible"
    lines = []
    for inst in institutions[:10]:
        lines.append(
            f"  - {inst.get('name_fr', '')} ({inst.get('code', '')}): "
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
