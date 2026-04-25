"""
Agent service: tool-use agentic loop for RAG + DB queries + navigation guidance.
Delegates to ai_provider for automatic Anthropic → Groq fallback.
"""
import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from services.ai_provider import run_agentic_loop

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es UCAR Intelligence, un assistant IA expert et agent actif pour l'Université de Carthage (réseau de 33 institutions).

Tu as accès à :
- La base de données complète (KPIs académiques, financiers, RH de toutes les institutions)
- Une base de connaissances documentaire (réglementations, procédures, textes officiels)
- Des outils pour interroger les données et guider l'utilisateur

Règles de comportement :
- Réponds TOUJOURS en français, de manière concise et professionnelle
- Utilise tes outils pour obtenir des données précises AVANT de répondre — ne jamais inventer de chiffres
- Quand une question concerne des réglementations, commence par search_knowledge_base
- Quand l'utilisateur doit effectuer une action dans l'interface, utilise navigate_to_page
- Cite les sources documentaires quand tu les utilises
- Formate les listes et données de façon lisible (utilise des tirets et retours à la ligne)
"""

# ── Page routes mapping ──────────────────────────────────────────────────────
PAGE_ROUTES = {
    "dashboard": "/dashboard",
    "institutions": "/institutions",
    "institution_detail": "/institutions/{id}",
    "alerts": "/alerts",
    "reports": "/reports",
    "analytics": "/analytics",
}

# ── Tool definitions (Claude tool_use schema) ────────────────────────────────
TOOLS = [
    {
        "name": "search_knowledge_base",
        "description": (
            "Cherche dans la base documentaire (réglementations universitaires tunisiennes, procédures administratives, "
            "textes officiels, rapports). Utilise cet outil pour toute question sur des règles, lois, ou procédures."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Requête de recherche sémantique en français"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_institutions_list",
        "description": (
            "Récupère la liste de toutes les institutions actives du réseau UCAR avec leurs statistiques de base "
            "(code, nom, gouvernorat, capacité étudiante, nombre d'alertes actives)."
        ),
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_institution_kpis",
        "description": (
            "Récupère les KPIs détaillés d'une institution spécifique. "
            "Utilise get_institutions_list d'abord si tu ne connais pas l'ID."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "institution_id": {"type": "integer", "description": "ID numérique de l'institution"},
                "domain": {
                    "type": "string",
                    "enum": ["academic", "finance", "hr", "all"],
                    "description": "Domaine à récupérer (défaut: all)",
                },
            },
            "required": ["institution_id"],
        },
    },
    {
        "name": "get_alerts",
        "description": "Récupère les alertes actives non résolues, avec filtres optionnels.",
        "input_schema": {
            "type": "object",
            "properties": {
                "institution_id": {"type": "integer", "description": "Filtrer par institution (optionnel)"},
                "severity": {
                    "type": "string",
                    "enum": ["critical", "warning", "info"],
                    "description": "Filtrer par sévérité (optionnel)",
                },
            },
        },
    },
    {
        "name": "get_network_stats",
        "description": "Récupère les statistiques globales du réseau UCAR (moyennes, totaux, vue d'ensemble).",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "navigate_to_page",
        "description": (
            "Guide l'utilisateur vers une page spécifique de l'application pour effectuer une action. "
            "Utilise cet outil dès que l'utilisateur doit consulter une page ou faire quelque chose dans l'interface."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "page": {
                    "type": "string",
                    "enum": ["dashboard", "institutions", "institution_detail", "alerts", "reports", "analytics"],
                    "description": "Page cible",
                },
                "institution_id": {
                    "type": "integer",
                    "description": "ID institution — requis pour institution_detail",
                },
                "reason": {"type": "string", "description": "Pourquoi l'utilisateur doit aller là"},
            },
            "required": ["page", "reason"],
        },
    },
]


# ── Main agent entry point ────────────────────────────────────────────────────

def run_agent(message: str, history: list[dict], db: Session) -> dict:
    """
    Run the agent with tool use (Anthropic primary, Groq fallback).

    Args:
        message: latest user message
        history: previous turns [{role: 'user'|'assistant', content: str}]
        db: SQLAlchemy session

    Returns:
        {response: str, navigation: dict|None, actions: list[str]}
    """
    from services.rag_service import search as rag_search

    # Build messages array (cap at 12 turns to avoid token overflow)
    messages = [
        {"role": h["role"], "content": h["content"]}
        for h in history[-12:]
    ]
    messages.append({"role": "user", "content": message})

    def tool_executor(name: str, inputs: dict) -> dict:
        return _execute_tool(name, inputs, db, rag_search)

    return run_agentic_loop(SYSTEM_PROMPT, messages, TOOLS, tool_executor)


# ── Tool executors ────────────────────────────────────────────────────────────

def _execute_tool(name: str, inputs: dict, db: Session, rag_search) -> dict:
    from models.models import Institution, AcademicKPI, FinanceKPI, HRKPI, Alert

    if name == "search_knowledge_base":
        results = rag_search(inputs.get("query", ""), n_results=5)
        if not results:
            return {"results": [], "note": "Base documentaire vide ou requête sans résultat. Les PDFs doivent être ingérés via /api/ai/ingest-pdfs."}
        return {
            "results": [
                {"content": r["content"], "source": r["source"], "relevance": r["relevance"]}
                for r in results
            ]
        }

    if name == "get_institutions_list":
        insts = db.query(Institution).filter(Institution.is_active == True).all()
        return {
            "institutions": [
                {
                    "id": i.id,
                    "code": i.code,
                    "name_fr": i.name_fr,
                    "type": i.type,
                    "governorate": i.governorate,
                    "student_capacity": i.student_capacity,
                    "active_alerts": db.query(Alert).filter(
                        Alert.institution_id == i.id, Alert.is_resolved == False
                    ).count(),
                }
                for i in insts
            ]
        }

    if name == "get_institution_kpis":
        inst_id = inputs["institution_id"]
        domain = inputs.get("domain", "all")
        inst = db.query(Institution).filter(Institution.id == inst_id).first()
        if not inst:
            return {"error": f"Institution {inst_id} introuvable"}

        result: dict = {"institution": {"id": inst.id, "code": inst.code, "name_fr": inst.name_fr}}

        if domain in ("academic", "all"):
            rows = (
                db.query(AcademicKPI)
                .filter(AcademicKPI.institution_id == inst_id)
                .order_by(AcademicKPI.semester.desc())
                .limit(4)
                .all()
            )
            result["academic"] = [_row_dict(r) for r in rows]

        if domain in ("finance", "all"):
            rows = (
                db.query(FinanceKPI)
                .filter(FinanceKPI.institution_id == inst_id)
                .order_by(FinanceKPI.fiscal_year.desc())
                .limit(3)
                .all()
            )
            result["finance"] = [_row_dict(r) for r in rows]

        if domain in ("hr", "all"):
            rows = (
                db.query(HRKPI)
                .filter(HRKPI.institution_id == inst_id)
                .order_by(HRKPI.semester.desc())
                .limit(4)
                .all()
            )
            result["hr"] = [_row_dict(r) for r in rows]

        return result

    if name == "get_alerts":
        q = (
            db.query(Alert, Institution.name_fr)
            .join(Institution, Alert.institution_id == Institution.id)
            .filter(Alert.is_resolved == False)
        )
        if inputs.get("institution_id"):
            q = q.filter(Alert.institution_id == inputs["institution_id"])
        if inputs.get("severity"):
            q = q.filter(Alert.severity == inputs["severity"])
        rows = q.order_by(Alert.created_at.desc()).limit(20).all()
        return {
            "alerts": [
                {
                    "id": a.id,
                    "institution": name_fr,
                    "severity": a.severity,
                    "domain": a.domain,
                    "title": a.title,
                    "kpi_name": a.kpi_name,
                    "kpi_value": float(a.kpi_value or 0),
                }
                for a, name_fr in rows
            ]
        }

    if name == "get_network_stats":
        avg_success = db.query(func.avg(AcademicKPI.success_rate)).scalar()
        avg_dropout = db.query(func.avg(AcademicKPI.dropout_rate)).scalar()
        avg_budget = db.query(func.avg(FinanceKPI.budget_execution_rate)).scalar()
        total_students = db.query(func.sum(Institution.student_capacity)).scalar()
        active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
        critical = db.query(Alert).filter(
            Alert.is_resolved == False, Alert.severity == "critical"
        ).count()
        return {
            "total_institutions": db.query(Institution).filter(Institution.is_active == True).count(),
            "total_students": int(total_students or 0),
            "active_alerts": active_alerts,
            "critical_alerts": critical,
            "avg_success_rate": round(float(avg_success), 2) if avg_success else None,
            "avg_dropout_rate": round(float(avg_dropout), 2) if avg_dropout else None,
            "avg_budget_execution": round(float(avg_budget), 2) if avg_budget else None,
        }

    if name == "navigate_to_page":
        page = inputs["page"]
        inst_id = inputs.get("institution_id")
        reason = inputs.get("reason", "")
        route = PAGE_ROUTES.get(page, "/dashboard")
        if inst_id and "{id}" in route:
            route = route.replace("{id}", str(inst_id))
        return {
            "_navigation": {
                "page": page,
                "route": route,
                "institution_id": inst_id,
                "reason": reason,
            },
            "message": f"Navigation vers {page} suggérée : {reason}",
        }

    return {"error": f"Outil inconnu : {name}"}


def _row_dict(row) -> dict:
    result = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if hasattr(val, "__float__"):
            val = float(val)
        result[col.name] = val
    return result


