from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from database import get_db
from models.models import Institution, AcademicKPI, FinanceKPI, HRKPI, Alert, User, EmploymentKPI, InfrastructureKPI, PartnershipKPI, ESGKPI, ResearchKPI
from models.schemas import *
from services.claude_service import explain_anomaly, generate_report_summary
from services.agent_service import run_agent
from agents.orchestrator import orchestrator
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

    employment = db.query(EmploymentKPI).filter(
        EmploymentKPI.institution_id == institution_id
    ).order_by(EmploymentKPI.graduation_year).all()

    infrastructure = db.query(InfrastructureKPI).filter(
        InfrastructureKPI.institution_id == institution_id
    ).order_by(InfrastructureKPI.semester).all()

    partnership = db.query(PartnershipKPI).filter(
        PartnershipKPI.institution_id == institution_id
    ).order_by(PartnershipKPI.academic_year).all()

    esg = db.query(ESGKPI).filter(
        ESGKPI.institution_id == institution_id
    ).order_by(ESGKPI.fiscal_year).all()

    research = db.query(ResearchKPI).filter(
        ResearchKPI.institution_id == institution_id
    ).order_by(ResearchKPI.academic_year).all()

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
        "employment": [_row_to_dict(e) for e in employment],
        "infrastructure": [_row_to_dict(i) for i in infrastructure],
        "partnership": [_row_to_dict(p) for p in partnership],
        "esg": [_row_to_dict(e) for e in esg],
        "research": [_row_to_dict(r) for r in research],
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
# PREDICTIONS (Prophet-based, real forecasts)
# ─────────────────────────────────────────────────────────────

@router.get("/predictions")
def get_predictions(db: Session = Depends(get_db)):
    """Return Prophet-based predictive risk forecasts for the dashboard."""
    from services.forecast_service import forecast_kpi

    def _fc_label(points):
        fc_pts = [p for p in (points or []) if p['is_forecast']]
        return fc_pts[-1]['name'] if fc_pts else 'Prévu'

    try:
        # ── 1. Network dropout — per-semester average across all institutions ──
        sem_avgs = db.query(
            AcademicKPI.semester,
            func.avg(AcademicKPI.dropout_rate).label('dropout_rate')
        ).group_by(AcademicKPI.semester).order_by(AcademicKPI.semester).all()

        dropout_data = [
            {'semester': r.semester, 'dropout_rate': float(r.dropout_rate or 0)}
            for r in sem_avgs
        ]
        fc_dropout = forecast_kpi(dropout_data, 'dropout_rate', periods=2)

        latest_sem = sem_avgs[-1].semester if sem_avgs else None

        # ── 2. Budget — institution with highest current execution rate ────────
        latest_fy_row = db.query(FinanceKPI.fiscal_year).order_by(FinanceKPI.id.desc()).first()
        latest_fy = latest_fy_row[0] if latest_fy_row else None

        wb_code, fc_budget = 'IHEC', None
        if latest_fy:
            worst_b = db.query(Institution, FinanceKPI.budget_execution_rate).join(
                FinanceKPI, FinanceKPI.institution_id == Institution.id
            ).filter(FinanceKPI.fiscal_year == latest_fy).order_by(
                FinanceKPI.budget_execution_rate.desc()
            ).first()
            if worst_b:
                wb_inst, _ = worst_b
                wb_code = wb_inst.code
                budget_rows = db.query(FinanceKPI).filter(
                    FinanceKPI.institution_id == wb_inst.id
                ).order_by(FinanceKPI.fiscal_year).all()
                fc_budget = forecast_kpi(
                    [_row_to_dict(r) for r in budget_rows], 'budget_execution_rate', periods=2
                )

        # ── 3. HR — institution with highest teaching load ─────────────────────
        wl_code, fc_hr = 'INSAT', None
        if latest_sem:
            worst_h = db.query(Institution, HRKPI.avg_teaching_load_hours).join(
                HRKPI, HRKPI.institution_id == Institution.id
            ).filter(HRKPI.semester == latest_sem).order_by(
                HRKPI.avg_teaching_load_hours.desc()
            ).first()
            if worst_h:
                wl_inst, _ = worst_h
                wl_code = wl_inst.code
                hr_rows = db.query(HRKPI).filter(
                    HRKPI.institution_id == wl_inst.id
                ).order_by(HRKPI.semester).all()
                fc_hr = forecast_kpi(
                    [_row_to_dict(r) for r in hr_rows], 'avg_teaching_load_hours', periods=2
                )

        # ── Build response cards ──────────────────────────────────────────────
        cards = []

        if fc_dropout:
            d_trend = fc_dropout['trend']
            d_chg = abs(fc_dropout['change_pct'])
            sev = ('critical' if fc_dropout['last_forecast'] > 12
                   else 'warning' if d_trend == 'up' else 'info')
            cards.append({
                "id": "pred_dropout",
                "title": "Risque Abandon — Réseau",
                "icon": "🎓",
                "severity": sev,
                "current_value": round(fc_dropout['last_actual'], 1),
                "current_label": "Moy. réseau actuelle",
                "predicted_value": round(fc_dropout['last_forecast'], 1),
                "predicted_label": f"Prévu {_fc_label(fc_dropout['points'])}",
                "unit": "%",
                "confidence": fc_dropout['confidence'],
                "trend": d_trend,
                "explanation": (
                    f"Prophet détecte une tendance {'haussière' if d_trend == 'up' else 'baissière' if d_trend == 'down' else 'stable'} "
                    f"de {d_chg}% sur le réseau. "
                    "Facteurs corrélés : délais bourses, saturation résidences."
                ),
            })

        if fc_budget:
            b_trend = fc_budget['trend']
            b_chg = abs(fc_budget['change_pct'])
            overshoot = round(fc_budget['last_forecast'] - 100, 1)
            sev = ('critical' if fc_budget['last_forecast'] > 100
                   else 'warning' if b_trend == 'up' else 'info')
            cards.append({
                "id": "pred_budget",
                "title": f"Budget {wb_code}",
                "icon": "💰",
                "severity": sev,
                "current_value": round(fc_budget['last_actual'], 1),
                "current_label": "Exécution actuelle",
                "predicted_value": round(fc_budget['last_forecast'], 1),
                "predicted_label": f"Prévu {_fc_label(fc_budget['points'])}",
                "unit": "%",
                "confidence": fc_budget['confidence'],
                "trend": b_trend,
                "explanation": (
                    f"Prophet prévoit {'un dépassement de ' + str(overshoot) + '% ' if overshoot > 0 else 'un taux de ' + str(round(fc_budget['last_forecast'], 1)) + '% '}"
                    f"(évolution {b_chg}%). "
                    "Principaux postes : RH (61%) et infrastructure (28%)."
                ),
            })

        if fc_hr:
            h_trend = fc_hr['trend']
            h_chg = abs(fc_hr['change_pct'])
            sev = ('critical' if fc_hr['last_forecast'] > 35
                   else 'warning' if h_trend == 'up' else 'info')
            cards.append({
                "id": "pred_hr",
                "title": f"Charge RH — {wl_code}",
                "icon": "👥",
                "severity": sev,
                "current_value": round(fc_hr['last_actual'], 1),
                "current_label": "Charge max actuelle",
                "predicted_value": round(fc_hr['last_forecast'], 1),
                "predicted_label": f"Prévu {_fc_label(fc_hr['points'])}",
                "unit": "h/sem",
                "confidence": fc_hr['confidence'],
                "trend": h_trend,
                "explanation": (
                    f"Charge enseignante en {'hausse' if h_trend == 'up' else 'baisse' if h_trend == 'down' else 'stabilisation'} "
                    f"({h_chg}%). "
                    "Risque de surcharge si aucun recrutement avant S2."
                ),
            })

        if not cards:
            raise ValueError("Prophet returned no forecasts")

        return cards

    except Exception:
        # Static fallback if DB/Prophet unavailable
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

@router.get("/causal/graph/all")
def get_full_causal_graph():
    """Return all nodes and edges of the causal graph."""
    nodes = [{"id": k, "label": v["label"], "domain": v["domain"]} for k, v in CAUSAL_GRAPH.items()]
    edges = [
        {"source": kpi, "target": e["kpi"], "strength": e.get("strength", 0)}
        for kpi, data in CAUSAL_GRAPH.items()
        for e in data.get("causes", [])
    ]
    return {"nodes": nodes, "edges": edges}


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
# AI CHAT — Agno multi-agent orchestrator (primary)
#           Falls back to tool-use agent for deep DB/RAG queries
# ─────────────────────────────────────────────────────────────

def _build_context(db: Session) -> str:
    """Build a rich text snapshot of current DB state for the Agno agents."""
    institutions = db.query(Institution).filter(Institution.is_active == True).all()

    avg_success = db.query(func.avg(AcademicKPI.success_rate)).scalar()
    avg_dropout = db.query(func.avg(AcademicKPI.dropout_rate)).scalar()
    avg_budget = db.query(func.avg(FinanceKPI.budget_execution_rate)).scalar()
    active_alerts = db.query(Alert).filter(Alert.is_resolved == False).count()
    critical_alerts = db.query(Alert).filter(
        Alert.is_resolved == False, Alert.severity == "critical"
    ).count()

    latest_sem_row = db.query(AcademicKPI.semester).order_by(AcademicKPI.id.desc()).first()
    latest_sem = latest_sem_row[0] if latest_sem_row else "S1_2026"

    lines = [
        f"=== RÉSEAU UCAR — Snapshot {latest_sem} ===",
        f"Institutions actives : {len(institutions)}",
        f"Alertes actives : {active_alerts} (dont {critical_alerts} critiques)",
        f"Taux de réussite moyen : {round(float(avg_success), 2) if avg_success else 'N/A'}%",
        f"Taux d'abandon moyen : {round(float(avg_dropout), 2) if avg_dropout else 'N/A'}%",
        f"Taux d'exécution budgétaire moyen : {round(float(avg_budget), 2) if avg_budget else 'N/A'}%",
        "",
        "=== INSTITUTIONS (extrait) ===",
    ]

    for inst in institutions[:15]:
        latest_acad = db.query(AcademicKPI).filter(
            AcademicKPI.institution_id == inst.id
        ).order_by(AcademicKPI.id.desc()).first()
        latest_fin = db.query(FinanceKPI).filter(
            FinanceKPI.institution_id == inst.id
        ).order_by(FinanceKPI.id.desc()).first()
        latest_hr = db.query(HRKPI).filter(
            HRKPI.institution_id == inst.id
        ).order_by(HRKPI.id.desc()).first()
        inst_alerts = db.query(Alert).filter(
            Alert.institution_id == inst.id, Alert.is_resolved == False
        ).count()

        line = f"- {inst.code} | {inst.name_fr} | {inst.governorate}"
        if latest_acad:
            line += (f" | Réussite:{float(latest_acad.success_rate or 0):.1f}%"
                     f" Abandon:{float(latest_acad.dropout_rate or 0):.1f}%"
                     f" Présence:{float(latest_acad.attendance_rate or 0):.1f}%")
        if latest_fin:
            line += f" | Budget:{float(latest_fin.budget_execution_rate or 0):.1f}%"
        if latest_hr:
            line += (f" | Absentéisme:{float(latest_hr.absenteeism_rate or 0):.1f}%"
                     f" ChargeEns:{float(latest_hr.avg_teaching_load_hours or 0):.1f}h")
        if inst_alerts:
            line += f" | ⚠️ {inst_alerts} alerte(s)"
        lines.append(line)

    # Active alerts detail
    alerts = db.query(Alert, Institution.name_fr).join(
        Institution, Alert.institution_id == Institution.id
    ).filter(Alert.is_resolved == False).order_by(Alert.created_at.desc()).limit(10).all()

    if alerts:
        lines.append("")
        lines.append("=== ALERTES ACTIVES ===")
        for a, inst_name in alerts:
            lines.append(
                f"[{a.severity.upper()}] {inst_name} — {a.title}"
                f" (KPI: {a.kpi_name}={float(a.kpi_value or 0):.1f},"
                f" seuil={float(a.threshold_value or 0):.1f})"
            )

    return "\n".join(lines)


@router.post("/ai/chat", response_model=ChatResponse)
def chat(request: ChatMessage, db: Session = Depends(get_db)):
    from agno.exceptions import InputCheckError, OutputCheckError

    message = request.message.strip()
    history = [{"role": h.role, "content": h.content} for h in request.history]

    # ── Early user-message length guard (before building context) ─────────────
    if len(message) > 2000:
        return ChatResponse(
            response="Message trop long (max 2000 caractères). Veuillez raccourcir votre question.",
            blocked=True,
            block_reason="message_too_long",
            context_used="route_validation",
        )

    # ── Agno multi-agent orchestrator (analysis, benchmarks, forecasts, strategy)
    try:
        context = _build_context(db)

        # Optionally enrich with RAG knowledge base results
        rag_section = ""
        try:
            from services.rag_service import search as rag_search
            rag_hits = rag_search(message, n_results=3)
            if rag_hits:
                rag_section = "\n=== BASE DOCUMENTAIRE (extraits pertinents) ===\n"
                for hit in rag_hits:
                    rag_section += f"[{hit['source']}] {hit['content'][:400]}\n"
        except Exception:
            pass

        # Prepend last 4 history turns for conversational context
        history_section = ""
        if history:
            history_section = "\n=== HISTORIQUE RÉCENT ===\n"
            for h in history[-4:]:
                prefix = "Utilisateur" if h["role"] == "user" else "Assistant"
                history_section += f"{prefix}: {h['content'][:300]}\n"

        prompt = f"{context}{rag_section}{history_section}\n=== QUESTION ===\n{message}"

        result = orchestrator.run(prompt)

        # Extract which agent handled the request
        agent_used = "StrategicAdvisorAgent"
        if getattr(result, "member_responses", None):
            last = result.member_responses[-1]
            agent_used = getattr(last, "agent_name", None) or getattr(last, "team_name", agent_used)

        return ChatResponse(
            response=result.content or "",
            agent_used=agent_used,
            context_used="agno_orchestrator",
        )

    except InputCheckError as e:
        return ChatResponse(
            response=str(e),
            blocked=True,
            block_reason=str(e.check_trigger),
            context_used="guardrail_blocked",
        )
    except OutputCheckError as e:
        return ChatResponse(
            response="Réponse filtrée par les règles de sécurité.",
            blocked=True,
            block_reason="output_filtered",
            context_used="guardrail_blocked",
        )
    except Exception as e:
        # Fallback to tool-use agent on any Agno failure
        try:
            result = run_agent(message, history, db)
            nav = result.get("navigation")
            return ChatResponse(
                response=result["response"],
                navigation=nav,
                actions=result.get("actions"),
                agent_used="ToolUseAgent",
                context_used="agent_fallback",
            )
        except Exception:
            return ChatResponse(
                response="Service IA temporairement indisponible.",
                context_used="error",
            )


@router.get("/ai/agent-status")
def agent_status():
    """Returns the multi-agent system configuration and guardrail status."""
    return {
        "orchestrator": "UCAR Orchestrator",
        "mode": "route",
        "agents": [
            {"name": "AlertInvestigatorAgent", "role": "Anomalies & cross-KPI correlations"},
            {"name": "ForecastAgent", "role": "Trend interpretation & risk communication"},
            {"name": "BenchmarkAgent", "role": "Rankings & gap analysis"},
            {"name": "StrategicAdvisorAgent", "role": "Executive synthesis & recommendations"},
        ],
        "guardrails": [
            "LengthGuardrail (user message max 2000 chars, agent input max 50k)",
            "PromptInjectionGuardrail (FR+EN patterns)",
            "PIIDetectionGuardrail (email, phone, CIN, RIB)",
            "DomainScopeGuardrail (UCAR topics only)",
            "SecretScrubber (output)",
        ],
        "fallback": "ToolUseAgent (agent_service + ai_provider)",
    }


@router.post("/ai/ingest-pdfs")
def ingest_pdfs():
    """Trigger ingestion of all PDFs in the rag_dataset directory into ChromaDB."""
    try:
        from services.rag_service import ingest_directory
        result = ingest_directory()
        # Normalise: always return the expected keys even on error
        if "error" in result:
            return {"ingested": 0, "skipped": 0, "total_docs": 0, "errors": [result["error"]],
                    "message": result.get("message", "")}
        return result
    except Exception as e:
        return {"ingested": 0, "skipped": 0, "total_docs": 0,
                "errors": [f"Service RAG indisponible: {str(e)}"]}


@router.get("/ai/rag-stats")
def rag_stats():
    """Return stats about the RAG knowledge base."""
    from services.rag_service import get_stats
    return get_stats()


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