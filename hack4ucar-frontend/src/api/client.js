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

// ── AI Chat ───────────────────────────────────────────────────
export const sendChat = (message, institution_id = null) =>
  client.post('/ai/chat', { message, institution_id }).then((r) => r.data)

// ── Reports ───────────────────────────────────────────────────
export const generateReport = (institution_id, period, format, report_type = 'monthly') =>
  client.post(
    '/reports/generate',
    { institution_id, period, format, report_type },
    { responseType: 'blob' }
  ).then((r) => r)

export default client
