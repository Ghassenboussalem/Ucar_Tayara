import { createContext, useContext, useState, useEffect } from 'react'

function readUser() {
  try { return JSON.parse(localStorage.getItem('ucar_user') || '{}') } catch { return {} }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)

  useEffect(() => {
    function handler() { setUser(readUser()) }
    window.addEventListener('ucar_user_change', handler)
    return () => window.removeEventListener('ucar_user_change', handler)
  }, [])

  const role = user.role || 'viewer'

  const value = {
    user,
    role,
    institutionId: user.institution_id ?? null,
    fullName: user.full_name || '',
    isPresidency: role === 'presidency',
    isInstitutionAdmin: role === 'institution_admin',
    isViewer: role === 'viewer',
    can: (permission) => PERMISSIONS[permission]?.includes(role) ?? false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

// What each role is allowed to do
const PERMISSIONS = {
  viewAllInstitutions: ['presidency'],
  viewIngestion:       ['presidency', 'institution_admin'],
  viewCausal:          ['presidency'],
  viewAnalytics:       ['presidency'],
  viewMap:             ['presidency', 'institution_admin', 'viewer'],
  resolveAlerts:       ['presidency', 'institution_admin'],
  generateReports:     ['presidency', 'institution_admin'],
}
