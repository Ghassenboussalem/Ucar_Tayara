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
    }


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