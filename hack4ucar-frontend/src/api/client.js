import axios from 'axios'

const API_BASE = 'http://localhost:8000/api'

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
})

// Attach JWT token to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('ucar_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 → redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('ucar_token')
      localStorage.removeItem('ucar_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────
export const login = (email, password) =>
  client.post('/auth/login', { email, password }).then((r) => r.data)

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboard = () =>
  client.get('/dashboard').then((r) => r.data)

// ── Institutions ──────────────────────────────────────────────
export const getInstitutions = () =>
  client.get('/institutions').then((r) => r.data)

export const getInstitutionScores = () =>
  client.get('/institutions/scores').then((r) => r.data)

export const getInstitution = (id) =>
  client.get(`/institutions/${id}`).then((r) => r.data)

// ── KPIs ──────────────────────────────────────────────────────
export const getAcademicKPIs = (id) =>
  client.get(`/kpis/${id}/academic`).then((r) => r.data)

export const getFinanceKPIs = (id) =>
  client.get(`/kpis/${id}/finance`).then((r) => r.data)

export const getHRKPIs = (id) =>
  client.get(`/kpis/${id}/hr`).then((r) => r.data)

export const getAllKPIs = (id) =>
  client.get(`/kpis/${id}/all`).then((r) => r.data)

// ── Alerts ────────────────────────────────────────────────────
export const getAlerts = (params = {}) =>
  client.get('/alerts', { params }).then((r) => r.data)

export const resolveAlert = (id) =>
  client.patch(`/alerts/${id}/resolve`).then((r) => r.data)

export const explainAlert = (id) =>
  client.get(`/alerts/${id}/explain`).then((r) => r.data)

// ── AI Chat (agent + RAG) ─────────────────────────────────────
export const sendChat = (message, history = [], institution_id = null) =>
  client.post('/ai/chat', { message, history, institution_id }).then((r) => r.data)

export const ingestPdfs = () =>
  client.post('/ai/ingest-pdfs').then((r) => r.data)

export const getRagStats = () =>
  client.get('/ai/rag-stats').then((r) => r.data)

// ── Causal Graph ─────────────────────────────────────────────
export const getCausalGraph = () =>
  client.get('/causal/graph/all').then((r) => r.data)

export const getCausalDetail = (kpiName) =>
  client.get(`/causal/${kpiName}`).then((r) => r.data)

// ── Reports ───────────────────────────────────────────────────
export const generateReport = (institution_id, period, format, report_type = 'monthly') =>
  client.post(
    '/reports/generate',
    { institution_id, period, format, report_type },
    { responseType: 'blob' }
  ).then((r) => r)

// ── Forecast (Prophet) ────────────────────────────────────────
export const getForecastAcademic = (institutionId, kpiField) =>
  client.get(`/forecast/${institutionId}/academic/${kpiField}`).then((r) => r.data)

export const getForecastFinance = (institutionId, kpiField) =>
  client.get(`/forecast/${institutionId}/finance/${kpiField}`).then((r) => r.data)

export const getForecastHR = (institutionId, kpiField) =>
  client.get(`/forecast/${institutionId}/hr/${kpiField}`).then((r) => r.data)

export const getRiskMatrix = () =>
  client.get('/forecast/risk-matrix').then((r) => r.data)

// ── Platform KPI import (from ETL bridge) ─────────────────────
export const getRecentAlerts = (limit = 10) =>
  client.get('/alerts', { params: { limit } }).then((r) => r.data)

// ── ETL service (port 8001) ───────────────────────────────────
const ETL_BASE = import.meta.env.VITE_ETL_URL || 'http://localhost:8001'

const etlClient = axios.create({ baseURL: ETL_BASE, timeout: 30000 })

// ETL uses JWT — auto-login as admin1 and cache the token
let _etlToken = null
let _etlTokenPromise = null

async function getEtlToken() {
  if (_etlToken) return _etlToken
  // Deduplicate concurrent requests while login is in flight
  if (!_etlTokenPromise) {
    _etlTokenPromise = axios
      .post(`${ETL_BASE}/api/auth/login`, { username: 'admin1', password: 'admin123' })
      .then((r) => { _etlToken = r.data.access_token; _etlTokenPromise = null; return _etlToken })
      .catch((e) => { _etlTokenPromise = null; throw e })
  }
  return _etlTokenPromise
}

etlClient.interceptors.request.use(async (cfg) => {
  try {
    const token = await getEtlToken()
    cfg.headers.Authorization = `Bearer ${token}`
  } catch { /* offline — send without auth, will 401 gracefully */ }
  return cfg
})

etlClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) _etlToken = null // force re-login next call
    return Promise.reject(err)
  }
)

export const etlUploadFile = (file, institution, documentType) => {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('institution', institution)
  if (documentType) fd.append('document_type', documentType)
  return etlClient.post('/api/upload-async', fd).then((r) => r.data)
}

export const etlUploadBatch = (files, institution, documentType) => {
  const fd = new FormData()
  files.forEach((f) => fd.append('files', f))
  fd.append('institution', institution)
  if (documentType) fd.append('document_type', documentType)
  return etlClient.post('/api/upload-batch', fd).then((r) => r.data)
}

export const etlGetJob = (jobId) =>
  etlClient.get(`/api/jobs/${jobId}`).then((r) => r.data)

export const etlListJobs = (limit = 20) =>
  etlClient.get('/api/jobs', { params: { limit } }).then((r) => r.data)

export const etlGetScenarios = () =>
  etlClient.get('/api/demo/scenarios').then((r) => r.data)

export const etlDemoTrigger = (scenario) => {
  const fd = new FormData()
  fd.append('scenario', scenario)
  return etlClient.post('/api/demo/trigger', fd).then((r) => r.data)
}

export const etlGetTemplates = () =>
  etlClient.get('/api/templates').then((r) => r.data)

export default client
