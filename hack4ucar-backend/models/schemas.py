from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ─── Institution ─────────────────────────────────────────────
class InstitutionBase(BaseModel):
    code: str
    name_fr: str
    name_ar: Optional[str]
    type: Optional[str]
    governorate: Optional[str]
    city: Optional[str]
    student_capacity: Optional[int]
    founded_year: Optional[int]
    director_name: Optional[str]
    email_domain: Optional[str]
    is_active: Optional[bool]

class InstitutionOut(InstitutionBase):
    id: int
    class Config:
        from_attributes = True

class InstitutionSummary(BaseModel):
    id: int
    code: str
    name_fr: str
    type: Optional[str]
    governorate: Optional[str]
    city: Optional[str]
    student_capacity: Optional[int]
    director_name: Optional[str]
    is_active: Optional[bool]
    # Aggregated health fields added at query time
    health_score: Optional[float] = None
    active_alerts: Optional[int] = 0
    class Config:
        from_attributes = True


# ─── Academic KPI ─────────────────────────────────────────────
class AcademicKPIOut(BaseModel):
    id: int
    institution_id: int
    semester: str
    total_enrolled: Optional[int]
    total_passed: Optional[int]
    total_failed: Optional[int]
    total_dropped: Optional[int]
    success_rate: Optional[Decimal]
    dropout_rate: Optional[Decimal]
    attendance_rate: Optional[Decimal]
    repetition_rate: Optional[Decimal]
    avg_grade: Optional[Decimal]
    recorded_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── Finance KPI ──────────────────────────────────────────────
class FinanceKPIOut(BaseModel):
    id: int
    institution_id: int
    fiscal_year: str
    allocated_budget: Optional[Decimal]
    consumed_budget: Optional[Decimal]
    budget_execution_rate: Optional[Decimal]
    cost_per_student: Optional[Decimal]
    staff_budget_pct: Optional[Decimal]
    infrastructure_budget_pct: Optional[Decimal]
    research_budget_pct: Optional[Decimal]
    other_budget_pct: Optional[Decimal]
    recorded_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── HR KPI ───────────────────────────────────────────────────
class HRKPIOut(BaseModel):
    id: int
    institution_id: int
    semester: str
    total_teaching_staff: Optional[int]
    total_admin_staff: Optional[int]
    absenteeism_rate: Optional[Decimal]
    avg_teaching_load_hours: Optional[Decimal]
    staff_turnover_rate: Optional[Decimal]
    training_completion_rate: Optional[Decimal]
    permanent_staff_pct: Optional[Decimal]
    contract_staff_pct: Optional[Decimal]
    recorded_at: Optional[datetime]
    class Config:
        from_attributes = True


# ─── Alert ────────────────────────────────────────────────────
class AlertOut(BaseModel):
    id: int
    institution_id: int
    domain: Optional[str]
    severity: Optional[str]
    title: Optional[str]
    description: Optional[str]
    kpi_name: Optional[str]
    kpi_value: Optional[Decimal]
    threshold_value: Optional[Decimal]
    is_resolved: Optional[bool]
    created_at: Optional[datetime]
    resolved_at: Optional[datetime]
    institution_name: Optional[str] = None
    class Config:
        from_attributes = True


# ─── Auth ─────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    institution_id: Optional[int]

class UserOut(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    role: str
    institution_id: Optional[int]
    class Config:
        from_attributes = True


# ─── AI Chat ──────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str
    institution_id: Optional[int] = None  # None = presidency context

class ChatResponse(BaseModel):
    response: str
    context_used: Optional[str] = None


# ─── Report ───────────────────────────────────────────────────
class ReportRequest(BaseModel):
    institution_id: int
    report_type: str  # 'monthly', 'semester', 'annual'
    period: str       # e.g. 'S1_2023', '2023'
    format: str       # 'pdf', 'excel'


# ─── Dashboard Summary ────────────────────────────────────────
class DashboardStats(BaseModel):
    total_institutions: int
    total_students: int
    total_staff: int
    active_alerts: int
    critical_alerts: int
    avg_success_rate: Optional[float]
    avg_budget_execution: Optional[float]
    institutions: List[InstitutionSummary]