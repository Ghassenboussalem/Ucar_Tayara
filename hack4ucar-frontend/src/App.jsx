import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LangProvider } from './contexts/LangContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import AlertsPage from './pages/AlertsPage'
import InstitutionDetailPage from './pages/InstitutionDetailPage'
import ReportsPage from './pages/ReportsPage'
import InstitutionsPage from './pages/InstitutionsPage'
import CausalGraphPage from './pages/CausalGraphPage'
import MapPage from './pages/MapPage'
import PredictiveAnalyticsPage from './pages/PredictiveAnalyticsPage'
import DataIngestionPage from './pages/DataIngestionPage'

function isAuthenticated() {
  return !!localStorage.getItem('ucar_token')
}

function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />
}

function RoleRoute({ permission, children }) {
  const { can } = useAuth()
  return can(permission) ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <LangProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="institutions" element={<InstitutionsPage />} />
              <Route path="institutions/:id" element={<InstitutionDetailPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="map" element={<MapPage />} />
              <Route path="causal" element={
                <RoleRoute permission="viewCausal"><CausalGraphPage /></RoleRoute>
              } />
              <Route path="analytics" element={
                <RoleRoute permission="viewAnalytics"><PredictiveAnalyticsPage /></RoleRoute>
              } />
              <Route path="ingestion" element={
                <RoleRoute permission="viewIngestion"><DataIngestionPage /></RoleRoute>
              } />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LangProvider>
  )
}
