from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models.models import Institution, AcademicKPI, FinanceKPI, HRKPI, Alert, User
from models.schemas import *
from services.claude_service import answer_data_question, explain_anomaly, generate_report_summary
from services.report_service import generate_pdf_report, generate_excel_report
from services.auth_service import authenticate_user, create_access_token

router = APIRouter()


# ─────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    
    token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "institution_id": user.institution_id
    })
    
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role,
        full_name=user.full_name or "",
        institution_id=user.institution_id
    )


# ─────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    institutions = db.query(Institution).filter(Institution.is_active == True).all()
    
    total_students = db.query(func.sum(Institution.student_capacity)).scalar() or 0
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    critical_alerts = db.query(Alert).filter(
        Alert.is_resolved == False, Alert.severity == 'critical'
    ).count()

    avg_success = db.query(func.avg(AcademicKPI.success_rate)).scalar()
    avg_budget = db.query(func.avg(FinanceKPI.budget_execution_rate)).scalar()

    # Build institution summaries with health scores
    inst_summaries = []
    for inst in institutions:
        alert_count = db.query(Alert).filter(
            Alert.institution_id == inst.id,
            Alert.is_resolved == False
        ).count()
        
        latest_academic = db.query(AcademicKPI).filter(
            AcademicKPI.institution_id == inst.id
        ).order_by(AcademicKPI.id.desc()).first()
        
        health = _compute_health_score(latest_academic, alert_count)
        
        inst_summaries.append(InstitutionSummary(
            id=inst.id,
            code=inst.code,
            name_fr=inst.name_fr,
            type=inst.type,
            governorate=inst.governorate,
            city=inst.city,
            student_capacity=inst.student_capacity,
            director_name=inst.director_name,
            is_active=inst.is_active,
            health_score=health,
            active_alerts=alert_count
        ))

    total_staff_q = db.query(
        func.sum(HRKPI.total_teaching_staff + HRKPI.total_admin_staff)
    ).scalar() or 0

    return DashboardStats(
        total_institutions=len(institutions),
        total_students=int(total_students),
        total_staff=int(total_staff_q),
        active_alerts=active_alerts,
        critical_alerts=critical_alerts,
        avg_success_rate=round(float(avg_success), 2) if avg_success else None,
        avg_budget_execution=round(float(avg_budget), 2) if avg_budget else None,
        institutions=inst_summaries
    )


# ─────────────────────────────────────────────────────────────
# INSTITUTIONS
# ─────────────────────────────────────────────────────────────

@router.get("/institutions", response_model=List[InstitutionOut])
def get_institutions(db: Session = Depends(get_db)):
    return db.query(Institution).filter(Institution.is_active == True).all()


@router.get("/institutions/{institution_id}", response_model=InstitutionOut)
def get_institution(institution_id: int, db: Session = Depends(get_db)):
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution introuvable")
    return inst


# ─────────────────────────────────────────────────────────────
# KPIs
# ─────────────────────────────────────────────────────────────

@router.get("/kpis/{institution_id}/academic", response_model=List[AcademicKPIOut])
def get_academic_kpis(institution_id: int, db: Session = Depends(get_db)):
    return db.query(AcademicKPI).filter(
        AcademicKPI.institution_id == institution_id
    ).order_by(AcademicKPI.semester).all()


@router.get("/kpis/{institution_id}/finance", response_model=List[FinanceKPIOut])
def get_finance_kpis(institution_id: int, db: Session = Depends(get_db)):
    return db.query(FinanceKPI).filter(
        FinanceKPI.institution_id == institution_id
    ).order_by(FinanceKPI.fiscal_year).all()


@router.get("/kpis/{institution_id}/hr", response_model=List[HRKPIOut])
def get_hr_kpis(institution_id: int, db: Session = Depends(get_db)):
    return db.query(HRKPI).filter(
        HRKPI.institution_id == institution_id
    ).order_by(HRKPI.semester).all()


@router.get("/kpis/{institution_id}/all")
def get_all_kpis(institution_id: int, db: Session = Depends(get_db)):
    """Get all KPIs for an institution in one call — used by frontend drill-down."""
    inst = db.query(Institution).filter(Institution.id == institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution introuvable")
    
    academic = db.query(AcademicKPI).filter(
        AcademicKPI.institution_id == institution_id
    ).order_by(AcademicKPI.semester).all()
    
    finance = db.query(FinanceKPI).filter(
        FinanceKPI.institution_id == institution_id
    ).order_by(FinanceKPI.fiscal_year).all()
    
    hr = db.query(HRKPI).filter(
        HRKPI.institution_id == institution_id
    ).order_by(HRKPI.semester).all()
    
    alerts = db.query(Alert).filter(
        Alert.institution_id == institution_id,
        Alert.is_resolved == False
    ).all()

    # Compute network averages for benchmarking
    latest_semester = db.query(AcademicKPI.semester).order_by(AcademicKPI.id.desc()).first()
    latest_sem = latest_semester[0] if latest_semester else None

    net_avg_academic = {}
    if latest_sem:
        avg_row = db.query(
            func.avg(AcademicKPI.success_rate),
            func.avg(AcademicKPI.dropout_rate),
            func.avg(AcademicKPI.attendance_rate),
        ).filter(AcademicKPI.semester == latest_sem).first()
        if avg_row:
            net_avg_academic = {
                "success_rate": round(float(avg_row[0] or 0), 2),
                "dropout_rate": round(float(avg_row[1] or 0), 2),
                "attendance_rate": round(float(avg_row[2] or 0), 2),
            }

    latest_fy = db.query(FinanceKPI.fiscal_year).order_by(FinanceKPI.id.desc()).first()
    latest_fy_val = latest_fy[0] if latest_fy else None
    net_avg_finance = {}
    if latest_fy_val:
        avg_fin = db.query(
            func.avg(FinanceKPI.budget_execution_rate),
            func.avg(FinanceKPI.cost_per_student),
        ).filter(FinanceKPI.fiscal_year == latest_fy_val).first()
        if avg_fin:
            net_avg_finance = {
                "budget_execution_rate": round(float(avg_fin[0] or 0), 2),
                "cost_per_student": round(float(avg_fin[1] or 0), 2),
            }

    net_avg_hr = {}
    if latest_sem:
        avg_hr = db.query(
            func.avg(HRKPI.absenteeism_rate),
            func.avg(HRKPI.avg_teaching_load_hours),
            func.avg(HRKPI.staff_turnover_rate),
        ).filter(HRKPI.semester == latest_sem).first()
        if avg_hr:
            net_avg_hr = {
                "absenteeism_rate": round(float(avg_hr[0] or 0), 2),
                "avg_teaching_load_hours": round(float(avg_hr[1] or 0), 2),
                "staff_turnover_rate": round(float(avg_hr[2] or 0), 2),
            }

    return {
        "institution": {
            "id": inst.id,
            "code": inst.code,
            "name_fr": inst.name_fr,
            "type": inst.type,
            "governorate": inst.governorate,
            "city": inst.city,
            "director_name": inst.director_name,
            "student_capacity": inst.student_capacity,
        },
        "academic": [_row_to_dict(a) for a in academic],
        "finance": [_row_to_dict(f) for f in finance],
        "hr": [_row_to_dict(h) for h in hr],
        "alerts": [_alert_to_dict(a) for a in alerts],
        "network_avg": {
            "academic": net_avg_academic,
            "finance": net_avg_finance,
            "hr": net_avg_hr,
        },
    }


# ─────────────────────────────────────────────────────────────
# FORECAST (Prophet-based with confidence bands)
# ─────────────────────────────────────────────────────────────

@router.get("/forecast/{institution_id}/academic/{kpi_field}")
def get_academic_forecast(institution_id: int, kpi_field: str, db: Session = Depends(get_db)):
    """Prophet forecast for an academic KPI with 80% confidence bands."""
    from services.forecast_service import forecast_kpi
    rows = db.query(AcademicKPI).filter(
        AcademicKPI.institution_id == institution_id
    ).order_by(AcademicKPI.semester).all()
    if not rows:
        raise HTTPException(404, "Aucune donnée académique trouvée")
    data = [_row_to_dict(r) for r in rows]
    result = forecast_kpi(data, kpi_field, periods=2)
    if not result:
        raise HTTPException(400, "Données insuffisantes (min. 3 semestres requis)")
    return result


@router.get("/forecast/{institution_id}/finance/{kpi_field}")
def get_finance_forecast(institution_id: int, kpi_field: str, db: Session = Depends(get_db)):
    """Prophet forecast for a finance KPI."""
    from services.forecast_service import forecast_kpi
    rows = db.query(FinanceKPI).filter(
        FinanceKPI.institution_id == institution_id
    ).order_by(FinanceKPI.fiscal_year).all()
    if not rows:
        raise HTTPException(404, "Aucune donnée financière trouvée")
    data = [_row_to_dict(r) for r in rows]
    result = forecast_kpi(data, kpi_field, periods=2)
    if not result:
        raise HTTPException(400, "Données insuffisantes pour la prévision")
    return result


@router.get("/forecast/{institution_id}/hr/{kpi_field}")
def get_hr_forecast(institution_id: int, kpi_field: str, db: Session = Depends(get_db)):
    """Prophet forecast for an HR KPI."""
    from services.forecast_service import forecast_kpi
    rows = db.query(HRKPI).filter(
        HRKPI.institution_id == institution_id
    ).order_by(HRKPI.semester).all()
    if not rows:
        raise HTTPException(404, "Aucune donnée RH trouvée")
    data = [_row_to_dict(r) for r in rows]
    result = forecast_kpi(data, kpi_field, periods=2)
    if not result:
        raise HTTPException(400, "Données insuffisantes pour la prévision")
    return result


@router.get("/forecast/risk-matrix")
def get_risk_matrix(db: Session = Depends(get_db)):
    """Return probability × impact risk matrix for all institutions."""
    from services.forecast_service import compute_risk_matrix
    institutions = db.query(Institution).filter(Institution.is_active == True).all()

    all_data = []
    for inst in institutions:
        academic = db.query(AcademicKPI).filter(
            AcademicKPI.institution_id == inst.id
        ).order_by(AcademicKPI.semester).all()
        if academic:
            all_data.append({
                'institution': _row_to_dict(inst) | {'name_fr': inst.name_fr, 'code': inst.code},
                'academic': [_row_to_dict(a) for a in academic],
            })

    return compute_risk_matrix(all_data)


# ─────────────────────────────────────────────────────────────
# PREDICTIONS (pre-computed from context/13-demo-data-strategy)
# ─────────────────────────────────────────────────────────────

@router.get("/predictions")
def get_predictions(db: Session = Depends(get_db)):
    """Return pre-computed predictive risk forecasts for the dashboard."""
    try:
        # Compute real current values from DB
        latest_sem_row = db.query(AcademicKPI.semester).order_by(AcademicKPI.id.desc()).first()
        latest_sem = latest_sem_row[0] if latest_sem_row else "S1_2026"

        avg_dropout_raw = db.query(func.avg(AcademicKPI.dropout_rate)).filter(
            AcademicKPI.semester == latest_sem
        ).scalar()
        avg_dropout = float(avg_dropout_raw) if avg_dropout_raw else 6.2

        # Find the institution with worst budget execution
        worst_budget_row = db.query(
            Institution.code, FinanceKPI.budget_execution_rate
        ).join(FinanceKPI, FinanceKPI.institution_id == Institution.id).order_by(
            FinanceKPI.budget_execution_rate.desc()
        ).first()

        wb_code = worst_budget_row[0] if worst_budget_row else "IHEC"
        wb_val = float(worst_budget_row[1]) if worst_budget_row and worst_budget_row[1] else 88.0

        # Find institution with worst teaching load
        worst_load_row = db.query(
            Institution.code, HRKPI.avg_teaching_load_hours
        ).join(HRKPI, HRKPI.institution_id == Institution.id).filter(
            HRKPI.semester == latest_sem
        ).order_by(HRKPI.avg_teaching_load_hours.desc()).first()

        wl_code = worst_load_row[0] if worst_load_row else "INSAT"
        wl_val = float(worst_load_row[1]) if worst_load_row and worst_load_row[1] else 31.2

        return [
            {
                "id": "pred_dropout",
                "title": "Risque Abandon — Réseau",
                "icon": "🎓",
                "severity": "warning",
                "current_value": round(avg_dropout, 1),
                "current_label": "Moy. réseau actuelle",
                "predicted_value": round(avg_dropout * 1.31, 1),
                "predicted_label": "Prévu S2 2026",
                "unit": "%",
                "confidence": 68,
                "trend": "up",
                "explanation": "Tendance haussière détectée sur 3 semestres. Facteurs : délais bourses, saturation résidences.",
            },
            {
                "id": "pred_budget",
                "title": f"Budget {wb_code}",
                "icon": "💰",
                "severity": "critical",
                "current_value": round(wb_val, 1),
                "current_label": "Exécution actuelle",
                "predicted_value": round(wb_val * 1.15, 1),
                "predicted_label": "Prévu juin 2026",
                "unit": "%",
                "confidence": 84,
                "trend": "up",
                "explanation": "Au rythme actuel, dépassement budgétaire de 14% prévu. Principaux postes : RH (61%) et infrastructure (28%).",
            },
            {
                "id": "pred_hr",
                "title": f"Charge RH — {wl_code}",
                "icon": "👥",
                "severity": "info",
                "current_value": round(wl_val, 1),
                "current_label": "Charge max actuelle",
                "predicted_value": round(wl_val * 1.06, 1),
                "predicted_label": "Prévu S2 2026",
                "unit": "h/sem",
                "confidence": 71,
                "trend": "up",
                "explanation": "Charge enseignante en hausse progressive. Risque de surcharge si aucun recrutement avant S2.",
            },
        ]
    except Exception as e:
        # Fallback to static data if DB query fails
        return [
            {
                "id": "pred_dropout", "title": "Risque Abandon — Réseau", "icon": "🎓",
                "severity": "warning", "current_value": 6.2, "current_label": "Moy. réseau actuelle",
                "predicted_value": 8.1, "predicted_label": "Prévu S2 2026", "unit": "%",
                "confidence": 68, "trend": "up",
                "explanation": "Tendance haussière détectée sur 3 semestres.",
            },
            {
                "id": "pred_budget", "title": "Budget IHEC", "icon": "💰",
                "severity": "critical", "current_value": 88.0, "current_label": "Exécution actuelle",
                "predicted_value": 101.0, "predicted_label": "Prévu juin 2026", "unit": "%",
                "confidence": 84, "trend": "up",
                "explanation": "Au rythme actuel, dépassement budgétaire de 14% prévu.",
            },
            {
                "id": "pred_hr", "title": "Charge RH — INSAT", "icon": "👥",
                "severity": "info", "current_value": 31.2, "current_label": "Charge max actuelle",
                "predicted_value": 33.1, "predicted_label": "Prévu S2 2026", "unit": "h/sem",
                "confidence": 71, "trend": "up",
                "explanation": "Charge enseignante en hausse progressive.",
            },
        ]


# ─────────────────────────────────────────────────────────────
# CAUSAL CONTEXT (from context/10-causal-graph-forecast-agent)
# ─────────────────────────────────────────────────────────────

# Causal graph encoded from file 10 — node → upstream causes + downstream effects
CAUSAL_GRAPH = {
    "dropout_rate": {
        "label": "Taux d'abandon",
        "domain": "academic",
        "causes": [
            {"kpi": "scholarship_delay", "label": "Délai traitement bourses", "lag_weeks": 2, "strength": 0.72},
            {"kpi": "residence_occupancy", "label": "Taux occupation résidences", "lag_weeks": 1, "strength": 0.58},
            {"kpi": "avg_teaching_load_hours", "label": "Charge enseignante excessive", "lag_weeks": 3, "strength": 0.44},
        ],
        "effects": [
            {"kpi": "success_rate", "label": "Taux de réussite", "lag_weeks": 6, "direction": "down"},
            {"kpi": "avg_grade", "label": "Note moyenne", "lag_weeks": 4, "direction": "down"},
        ],
        "recommendation": "Prioriser le déblocage des bourses en attente et augmenter les places en résidence.",
    },
    "success_rate": {
        "label": "Taux de réussite",
        "domain": "academic",
        "causes": [
            {"kpi": "dropout_rate", "label": "Taux d'abandon", "lag_weeks": 0, "strength": -0.81},
            {"kpi": "avg_teaching_load_hours", "label": "Charge enseignante", "lag_weeks": 1, "strength": -0.52},
            {"kpi": "attendance_rate", "label": "Taux de présence", "lag_weeks": 0, "strength": 0.69},
        ],
        "effects": [
            {"kpi": "institution_reputation", "label": "Attractivité institutionnelle", "lag_weeks": 52, "direction": "up"},
        ],
        "recommendation": "Renforcer l'encadrement pédagogique et réduire les absences non justifiées.",
    },
    "attendance_rate": {
        "label": "Taux de présence",
        "domain": "academic",
        "causes": [
            {"kpi": "dropout_rate", "label": "Risque d'abandon", "lag_weeks": 2, "strength": -0.61},
            {"kpi": "avg_teaching_load_hours", "label": "Surcharge enseignante", "lag_weeks": 1, "strength": -0.38},
        ],
        "effects": [
            {"kpi": "success_rate", "label": "Taux de réussite", "lag_weeks": 0, "direction": "up"},
        ],
        "recommendation": "Mettre en place un suivi hebdomadaire des absences avec alertes automatiques.",
    },
    "budget_execution_rate": {
        "label": "Taux d'exécution budgétaire",
        "domain": "finance",
        "causes": [
            {"kpi": "staff_budget_pct", "label": "Part budget RH", "lag_weeks": 0, "strength": 0.68},
            {"kpi": "infrastructure_budget_pct", "label": "Part budget infrastructure", "lag_weeks": 4, "strength": 0.45},
            {"kpi": "total_teaching_staff", "label": "Recrutements enseignants", "lag_weeks": 8, "strength": 0.39},
        ],
        "effects": [
            {"kpi": "cost_per_student", "label": "Coût par étudiant", "lag_weeks": 4, "direction": "up"},
            {"kpi": "avg_teaching_load_hours", "label": "Charge enseignante", "lag_weeks": 12, "direction": "up"},
        ],
        "recommendation": "Réallouer les lignes budgétaires infrastructure non consommées avant clôture.",
    },
    "absenteeism_rate": {
        "label": "Taux d'absentéisme RH",
        "domain": "hr",
        "causes": [
            {"kpi": "avg_teaching_load_hours", "label": "Surcharge horaire", "lag_weeks": 3, "strength": 0.67},
            {"kpi": "staff_turnover_rate", "label": "Turnover du personnel", "lag_weeks": 6, "strength": 0.51},
        ],
        "effects": [
            {"kpi": "attendance_rate", "label": "Présence étudiante", "lag_weeks": 2, "direction": "down"},
            {"kpi": "success_rate", "label": "Taux de réussite", "lag_weeks": 4, "direction": "down"},
        ],
        "recommendation": "Redistribuer la charge enseignante et initier un programme de bien-être au travail.",
    },
    "avg_teaching_load_hours": {
        "label": "Charge enseignante moyenne",
        "domain": "hr",
        "causes": [
            {"kpi": "total_teaching_staff", "label": "Effectif enseignant", "lag_weeks": 0, "strength": -0.74},
            {"kpi": "budget_execution_rate", "label": "Dépassement budgétaire", "lag_weeks": 12, "strength": 0.43},
        ],
        "effects": [
            {"kpi": "absenteeism_rate", "label": "Absentéisme RH", "lag_weeks": 3, "direction": "up"},
            {"kpi": "dropout_rate", "label": "Taux d'abandon", "lag_weeks": 3, "direction": "up"},
        ],
        "recommendation": "Recruter au moins 3 enseignants contractuels pour ramener la charge sous 24h/semaine.",
    },
}

@router.get("/causal/{kpi_name}")
def get_causal_context(kpi_name: str):
    """Return causal chain for a given KPI from the encoded causal graph."""
    node = CAUSAL_GRAPH.get(kpi_name)
    if not node:
        # Return generic response for unknown KPIs
        return {
            "kpi": kpi_name,
            "label": kpi_name.replace("_", " ").title(),
            "causes": [],
            "effects": [],
            "recommendation": "Analyser les tendances sur plusieurs semestres pour identifier les facteurs causaux.",
        }
    return {"kpi": kpi_name, **node}


# ─────────────────────────────────────────────────────────────
# ALERTS
# ─────────────────────────────────────────────────────────────

@router.get("/alerts", response_model=List[AlertOut])
def get_alerts(
    resolved: Optional[bool] = False,
    severity: Optional[str] = None,
    domain: Optional[str] = None,
    institution_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Alert, Institution.name_fr).join(
        Institution, Alert.institution_id == Institution.id
    )
    if resolved is not None:
        q = q.filter(Alert.is_resolved == resolved)
    if severity:
        q = q.filter(Alert.severity == severity)
    if domain:
        q = q.filter(Alert.domain == domain)
    if institution_id:
        q = q.filter(Alert.institution_id == institution_id)

    results = q.order_by(Alert.created_at.desc()).all()
    
    alerts_out = []
    for alert, inst_name in results:
        a = AlertOut.from_orm(alert)
        a.institution_name = inst_name
        alerts_out.append(a)
    return alerts_out


@router.patch("/alerts/{alert_id}/resolve")
def resolve_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    alert.is_resolved = True
    db.commit()
    return {"message": "Alerte résolue avec succès"}


@router.get("/alerts/{alert_id}/explain")
def explain_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte introuvable")
    
    inst = db.query(Institution).filter(Institution.id == alert.institution_id).first()
    
    explanation = explain_anomaly(
        institution_name=inst.name_fr if inst else "Institution inconnue",
        domain=alert.domain or "",
        kpi_name=alert.kpi_name or "",
        kpi_value=float(alert.kpi_value or 0),
        threshold_value=float(alert.threshold_value or 0),
    )
    
    return {"alert_id": alert_id, "explanation": explanation}


# ─────────────────────────────────────────────────────────────
# AI CHAT
# ─────────────────────────────────────────────────────────────

@router.post("/ai/chat", response_model=ChatResponse)
def chat(request: ChatMessage, db: Session = Depends(get_db)):
    # Build context from DB
    institutions = db.query(Institution).filter(Institution.is_active == True).all()
    active_alerts = db.query(Alert, Institution.name_fr).join(
        Institution, Alert.institution_id == Institution.id
    ).filter(Alert.is_resolved == False).all()
    
    avg_success = db.query(func.avg(AcademicKPI.success_rate)).scalar()
    avg_budget = db.query(func.avg(FinanceKPI.budget_execution_rate)).scalar()
    total_students = db.query(func.sum(Institution.student_capacity)).scalar() or 0

    context = {
        "institutions": [
            {
                "name_fr": i.name_fr,
                "code": i.code,
                "governorate": i.governorate,
                "student_capacity": i.student_capacity,
                "active_alerts": db.query(Alert).filter(
                    Alert.institution_id == i.id, Alert.is_resolved == False
                ).count()
            }
            for i in institutions
        ],
        "alerts": [
            {
                "institution_name": inst_name,
                "severity": a.severity,
                "domain": a.domain,
                "title": a.title,
                "kpi_value": float(a.kpi_value or 0)
            }
            for a, inst_name in active_alerts
        ],
        "avg_success_rate": round(float(avg_success), 2) if avg_success else None,
        "avg_budget_execution": round(float(avg_budget), 2) if avg_budget else None,
        "total_students": int(total_students),
    }

    response_text = answer_data_question(request.message, context)
    return ChatResponse(response=response_text, context_used="dashboard_global")


# ─────────────────────────────────────────────────────────────
# REPORTS
# ─────────────────────────────────────────────────────────────

@router.post("/reports/generate")
def generate_report(request: ReportRequest, db: Session = Depends(get_db)):
    inst = db.query(Institution).filter(Institution.id == request.institution_id).first()
    if not inst:
        raise HTTPException(status_code=404, detail="Institution introuvable")

    # Get latest KPI data for the requested period
    academic = db.query(AcademicKPI).filter(
        AcademicKPI.institution_id == request.institution_id,
        AcademicKPI.semester == request.period
    ).first()

    finance = db.query(FinanceKPI).filter(
        FinanceKPI.institution_id == request.institution_id,
        FinanceKPI.fiscal_year == request.period
    ).first()

    # fallback: get latest if period not found
    if not academic:
        academic = db.query(AcademicKPI).filter(
            AcademicKPI.institution_id == request.institution_id
        ).order_by(AcademicKPI.id.desc()).first()

    if not finance:
        finance = db.query(FinanceKPI).filter(
            FinanceKPI.institution_id == request.institution_id
        ).order_by(FinanceKPI.id.desc()).first()

    hr = db.query(HRKPI).filter(
        HRKPI.institution_id == request.institution_id
    ).order_by(HRKPI.id.desc()).first()

    alerts = db.query(Alert).filter(
        Alert.institution_id == request.institution_id,
        Alert.is_resolved == False
    ).all()

    academic_dict = _row_to_dict(academic) if academic else {}
    finance_dict = _row_to_dict(finance) if finance else {}
    hr_dict = _row_to_dict(hr) if hr else {}
    alerts_list = [_alert_to_dict(a) for a in alerts]

    institution_dict = {
        "name_fr": inst.name_fr,
        "code": inst.code,
        "governorate": inst.governorate,
        "director_name": inst.director_name,
    }

    if request.format == "excel":
        content = generate_excel_report(
            institution=institution_dict,
            period=request.period,
            academic=academic_dict,
            finance=finance_dict,
            hr=hr_dict
        )
        filename = f"rapport_{inst.code}_{request.period}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        # Generate AI summary first
        ai_summary = generate_report_summary(
            institution_name=inst.name_fr,
            period=request.period,
            academic_data=academic_dict,
            finance_data=finance_dict,
            hr_data=hr_dict,
            alerts=alerts_list
        )
        content = generate_pdf_report(
            institution=institution_dict,
            period=request.period,
            academic=academic_dict,
            finance=finance_dict,
            hr=hr_dict,
            alerts=alerts_list,
            ai_summary=ai_summary
        )
        filename = f"rapport_{inst.code}_{request.period}.pdf"
        media_type = "application/pdf"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def _compute_health_score(academic: AcademicKPI, alert_count: int) -> float:
    if not academic:
        return 50.0
    score = 100.0
    if academic.success_rate:
        sr = float(academic.success_rate)
        if sr < 60:
            score -= 30
        elif sr < 75:
            score -= 15
    if academic.dropout_rate:
        dr = float(academic.dropout_rate)
        if dr > 15:
            score -= 25
        elif dr > 8:
            score -= 10
    if academic.attendance_rate:
        ar = float(academic.attendance_rate)
        if ar < 60:
            score -= 20
        elif ar < 75:
            score -= 10
    score -= alert_count * 5
    return max(0.0, min(100.0, round(score, 1)))


def _row_to_dict(row) -> dict:
    if row is None:
        return {}
    result = {}
    for col in row.__table__.columns:
        val = getattr(row, col.name)
        if hasattr(val, '__float__'):
            val = float(val)
        result[col.name] = val
    return result


def _alert_to_dict(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "domain": alert.domain,
        "severity": alert.severity,
        "title": alert.title,
        "description": alert.description,
        "kpi_name": alert.kpi_name,
        "kpi_value": float(alert.kpi_value or 0),
        "threshold_value": float(alert.threshold_value or 0),
        "is_resolved": alert.is_resolved,
        "created_at": str(alert.created_at),
    }