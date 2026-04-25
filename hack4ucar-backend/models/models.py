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