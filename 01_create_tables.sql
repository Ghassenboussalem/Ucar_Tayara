-- =========================
-- UCAR DEMO DATABASE SCHEMA
-- =========================

-- Drop tables if they exist (safe reset)
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS hr_kpis CASCADE;
DROP TABLE IF EXISTS finance_kpis CASCADE;
DROP TABLE IF EXISTS academic_kpis CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS institutions CASCADE;

-- =========================
-- 1. INSTITUTIONS
-- =========================
CREATE TABLE institutions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name_fr VARCHAR(150) NOT NULL,
  name_ar VARCHAR(150),
  type VARCHAR(50),
  governorate VARCHAR(50),
  city VARCHAR(50),
  student_capacity INTEGER,
  founded_year INTEGER,
  director_name VARCHAR(100),
  email_domain VARCHAR(80),
  is_active BOOLEAN DEFAULT TRUE
);

-- =========================
-- 2. ACADEMIC KPI
-- =========================
CREATE TABLE academic_kpis (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id),
  semester VARCHAR(20),
  total_enrolled INTEGER,
  total_passed INTEGER,
  total_failed INTEGER,
  total_dropped INTEGER,
  success_rate DECIMAL(5,2),
  dropout_rate DECIMAL(5,2),
  attendance_rate DECIMAL(5,2),
  repetition_rate DECIMAL(5,2),
  avg_grade DECIMAL(4,2),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 3. FINANCE KPI
-- =========================
CREATE TABLE finance_kpis (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id),
  fiscal_year VARCHAR(10),
  allocated_budget DECIMAL(12,2),
  consumed_budget DECIMAL(12,2),
  budget_execution_rate DECIMAL(5,2),
  cost_per_student DECIMAL(8,2),
  staff_budget_pct DECIMAL(5,2),
  infrastructure_budget_pct DECIMAL(5,2),
  research_budget_pct DECIMAL(5,2),
  other_budget_pct DECIMAL(5,2),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 4. HR KPI
-- =========================
CREATE TABLE hr_kpis (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id),
  semester VARCHAR(20),
  total_teaching_staff INTEGER,
  total_admin_staff INTEGER,
  absenteeism_rate DECIMAL(5,2),
  avg_teaching_load_hours DECIMAL(6,2),
  staff_turnover_rate DECIMAL(5,2),
  training_completion_rate DECIMAL(5,2),
  permanent_staff_pct DECIMAL(5,2),
  contract_staff_pct DECIMAL(5,2),
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 5. ALERTS
-- =========================
CREATE TABLE alerts (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id),
  domain VARCHAR(50),
  severity VARCHAR(20),
  title VARCHAR(200),
  description TEXT,
  kpi_name VARCHAR(100),
  kpi_value DECIMAL(10,2),
  threshold_value DECIMAL(10,2),
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP,
  resolved_at TIMESTAMP
);

-- =========================
-- 6. USERS
-- =========================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(100),
  role VARCHAR(30),
  institution_id INTEGER REFERENCES institutions(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
