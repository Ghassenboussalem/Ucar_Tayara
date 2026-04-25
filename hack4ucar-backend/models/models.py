from sqlalchemy import Column, Integer, String, Boolean, Numeric, TIMESTAMP, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), unique=True, nullable=False)
    name_fr = Column(String(150), nullable=False)
    name_ar = Column(String(150))
    type = Column(String(50))
    governorate = Column(String(50))
    city = Column(String(50))
    student_capacity = Column(Integer)
    founded_year = Column(Integer)
    director_name = Column(String(100))
    email_domain = Column(String(80))
    is_active = Column(Boolean, default=True)

    academic_kpis = relationship("AcademicKPI", back_populates="institution")
    finance_kpis = relationship("FinanceKPI", back_populates="institution")
    hr_kpis = relationship("HRKPI", back_populates="institution")
    alerts = relationship("Alert", back_populates="institution")
    users = relationship("User", back_populates="institution")


class AcademicKPI(Base):
    __tablename__ = "academic_kpis"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    semester = Column(String(20))
    total_enrolled = Column(Integer)
    total_passed = Column(Integer)
    total_failed = Column(Integer)
    total_dropped = Column(Integer)
    success_rate = Column(Numeric(5, 2))
    dropout_rate = Column(Numeric(5, 2))
    attendance_rate = Column(Numeric(5, 2))
    repetition_rate = Column(Numeric(5, 2))
    avg_grade = Column(Numeric(4, 2))
    recorded_at = Column(TIMESTAMP, server_default=func.now())

    institution = relationship("Institution", back_populates="academic_kpis")


class FinanceKPI(Base):
    __tablename__ = "finance_kpis"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    fiscal_year = Column(String(10))
    allocated_budget = Column(Numeric(12, 2))
    consumed_budget = Column(Numeric(12, 2))
    budget_execution_rate = Column(Numeric(5, 2))
    cost_per_student = Column(Numeric(8, 2))
    staff_budget_pct = Column(Numeric(5, 2))
    infrastructure_budget_pct = Column(Numeric(5, 2))
    research_budget_pct = Column(Numeric(5, 2))
    other_budget_pct = Column(Numeric(5, 2))
    recorded_at = Column(TIMESTAMP, server_default=func.now())

    institution = relationship("Institution", back_populates="finance_kpis")


class HRKPI(Base):
    __tablename__ = "hr_kpis"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    semester = Column(String(20))
    total_teaching_staff = Column(Integer)
    total_admin_staff = Column(Integer)
    absenteeism_rate = Column(Numeric(5, 2))
    avg_teaching_load_hours = Column(Numeric(6, 2))
    staff_turnover_rate = Column(Numeric(5, 2))
    training_completion_rate = Column(Numeric(5, 2))
    permanent_staff_pct = Column(Numeric(5, 2))
    contract_staff_pct = Column(Numeric(5, 2))
    recorded_at = Column(TIMESTAMP, server_default=func.now())

    institution = relationship("Institution", back_populates="hr_kpis")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    domain = Column(String(50))
    severity = Column(String(20))
    title = Column(String(200))
    description = Column(Text)
    kpi_name = Column(String(100))
    kpi_value = Column(Numeric(10, 2))
    threshold_value = Column(Numeric(10, 2))
    is_resolved = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP)
    resolved_at = Column(TIMESTAMP)

    institution = relationship("Institution", back_populates="alerts")


class ESGKPI(Base):
    __tablename__ = "esg_kpis"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    fiscal_year = Column(String(10))
    energy_consumption_kwh = Column(Numeric(12, 2))
    carbon_footprint_tons = Column(Numeric(8, 2))
    recycling_rate = Column(Numeric(5, 2))
    green_spaces_sqm = Column(Integer)
    sustainable_mobility_pct = Column(Numeric(5, 2))
    accessibility_score = Column(Numeric(5, 2))
    waste_produced_tons = Column(Numeric(8, 2))
    water_consumption_m3 = Column(Numeric(10, 2))
    recorded_at = Column(TIMESTAMP, server_default=func.now())


class ResearchKPI(Base):
    __tablename__ = "research_kpis"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    academic_year = Column(String(10))
    publications_count = Column(Integer)
    active_projects = Column(Integer)
    funding_secured_tnd = Column(Numeric(12, 2))
    phd_students = Column(Integer)
    patents_filed = Column(Integer)
    international_collaborations = Column(Integer)
    national_collaborations = Column(Integer)
    conferences_attended = Column(Integer)
    recorded_at = Column(TIMESTAMP, server_default=func.now())


class EmploymentKPI(Base):
    __tablename__ = "employment_kpis"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    graduation_year = Column(String(10))
    graduates_total = Column(Integer)
    employed_within_6months = Column(Integer)
    employed_within_12months = Column(Integer)
    employability_rate_6m = Column(Numeric(5, 2))
    employability_rate_12m = Column(Numeric(5, 2))
    avg_months_to_employment = Column(Numeric(5, 2))
    national_employment_pct = Column(Numeric(5, 2))
    international_employment_pct = Column(Numeric(5, 2))
    self_employed_pct = Column(Numeric(5, 2))
    recorded_at = Column(TIMESTAMP, server_default=func.now())


class InfrastructureKPI(Base):
    __tablename__ = "infrastructure_kpis"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    semester = Column(String(20))
    classroom_occupancy_rate = Column(Numeric(5, 2))
    it_equipment_status_pct = Column(Numeric(5, 2))
    equipment_availability_rate = Column(Numeric(5, 2))
    ongoing_works = Column(Integer)
    maintenance_requests = Column(Integer)
    resolved_requests = Column(Integer)
    lab_availability_rate = Column(Numeric(5, 2))
    library_capacity_used_pct = Column(Numeric(5, 2))
    recorded_at = Column(TIMESTAMP, server_default=func.now())


class PartnershipKPI(Base):
    __tablename__ = "partnership_kpis"
    id = Column(Integer, primary_key=True, index=True)
    institution_id = Column(Integer, ForeignKey("institutions.id"))
    academic_year = Column(String(10))
    active_national_agreements = Column(Integer)
    active_international_agreements = Column(Integer)
    incoming_students = Column(Integer)
    outgoing_students = Column(Integer)
    erasmus_partnerships = Column(Integer)
    joint_programs = Column(Integer)
    industry_partnerships = Column(Integer)
    international_projects = Column(Integer)
    recorded_at = Column(TIMESTAMP, server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255))
    full_name = Column(String(100))
    role = Column(String(30))
    institution_id = Column(Integer, ForeignKey("institutions.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    institution = relationship("Institution", back_populates="users")