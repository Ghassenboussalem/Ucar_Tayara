import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Bell,
  FileText,
  LogOut,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  Lock,
  Network,
  Map,
  Brain,
  DatabaseZap,
} from 'lucide-react'
import { useLang } from '../contexts/LangContext'
import { useAuth } from '../contexts/AuthContext'

// roles: which roles can see this item (undefined = all)
const NAV = [
  {
    sectionKey: 'nav.overview',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    ],
  },
  {
    sectionKey: 'nav.data',
    items: [
      { to: '/institutions', icon: Building2, labelKey: 'nav.institutions' },
      { to: '/map', icon: Map, labelKey: 'nav.map' },
      { to: '/alerts', icon: Bell, labelKey: 'nav.alerts', badge: true },
    ],
  },
  {
    sectionKey: 'nav.intelligence',
    items: [
      { to: '/reports', icon: FileText, labelKey: 'nav.reports' },
      { to: '/causal', icon: Network, labelKey: 'nav.causal', roles: ['presidency'] },
      { to: '/analytics', icon: Brain, labelKey: 'nav.analytics', roles: ['presidency'] },
      { to: '/ingestion', icon: DatabaseZap, labelKey: 'nav.ingestion', roles: ['presidency', 'institution_admin'] },
    ],
  },
]

const ROLE_META = {
  presidency:        { label: 'Présidence UCAR', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  institution_admin: { label: 'Directeur',        color: '#38bdf8', bg: 'rgba(56,189,248,0.15)' },
  viewer:            { label: 'Observateur',       color: '#86efac', bg: 'rgba(134,239,172,0.15)' },
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { t, isRTL } = useLang()
  const { user, role, can } = useAuth()

  function handleLogout() {
    localStorage.removeItem('ucar_token')
    localStorage.removeItem('ucar_user')
    window.dispatchEvent(new Event('ucar_user_change'))
    navigate('/login')
  }

  const sideStyle = {
    ...styles.sidebar,
    left: isRTL ? 'auto' : 0,
    right: isRTL ? 0 : 'auto',
  }

  const ChevronEnd = isRTL ? ChevronLeft : ChevronRight

  return (
    <aside style={sideStyle}>
      {/* Logo */}
      <div style={styles.logo}>
        <img
          src="/ucar-logo.jpg"
          alt="Université de Carthage"
          style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0, background: 'white' }}
        />
        <div>
          <div style={styles.logoName}>UCAR Intelligence</div>
          <div style={styles.logoSub}>Université de Carthage</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Navigation */}
      <nav style={styles.nav}>
        {NAV.map((group) => {
          const visibleItems = group.items.filter(
            item => !item.roles || item.roles.includes(role)
          )
          if (!visibleItems.length) return null
          return (
            <div key={group.sectionKey} style={styles.navGroup}>
              <div style={styles.navSection}>{t(group.sectionKey)}</div>
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  style={({ isActive }) => ({
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : {}),
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={17} style={{ flexShrink: 0, opacity: isActive ? 1 : 0.75 }} />
                      <span style={styles.navLabel}>{t(item.labelKey)}</span>
                      {isActive && <ChevronEnd size={14} style={{ marginInlineStart: 'auto', opacity: 0.6 }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* AI Tag */}
      <div style={styles.aiTag}>
        <TrendingUp size={15} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{t('sidebar.ai')}</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.65 }}>{t('sidebar.ai.sub')}</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* User */}
      <div style={styles.userRow}>
        <div style={{
          ...styles.avatar,
          background: ROLE_META[role]?.bg || 'rgba(255,255,255,0.15)',
          color: ROLE_META[role]?.color || 'white',
          border: `1.5px solid ${ROLE_META[role]?.color || 'transparent'}40`,
        }}>
          {(user.full_name || 'U').charAt(0).toUpperCase()}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{user.full_name || t('role.unknown')}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '3px',
            padding: '1px 7px', borderRadius: '20px',
            background: ROLE_META[role]?.bg || 'rgba(255,255,255,0.1)',
            color: ROLE_META[role]?.color || 'rgba(255,255,255,0.5)',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.02em',
          }}>
            {role === 'presidency' && '👑 '}
            {role === 'institution_admin' && '🏛 '}
            {role === 'viewer' && '👁 '}
            {ROLE_META[role]?.label || role}
          </div>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout} title={t('sidebar.logout')}>
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '240px',
    height: '100vh',
    position: 'fixed',
    top: 0,
    background: 'rgb(20, 58, 105)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  logo: {
    padding: '20px 18px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '38px', height: '38px',
    background: 'rgba(255,255,255,0.12)',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  logoName: {
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  },
  logoSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.68rem',
    marginTop: '2px',
  },
  divider: {
    height: '1px',
    background: 'rgba(255,255,255,0.08)',
    margin: '0 18px',
  },
  nav: {
    padding: '12px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  navGroup: {
    marginBottom: '18px',
  },
  navSection: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: '0.65rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '4px 10px 8px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.72)',
    fontSize: '0.83rem',
    fontWeight: 500,
    transition: 'background 150ms, color 150ms',
    cursor: 'pointer',
  },
  navItemActive: {
    background: 'rgba(255,255,255,0.14)',
    color: 'white',
    fontWeight: 600,
  },
  navLabel: { flex: 1 },
  aiTag: {
    margin: '8px 10px 12px',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.07)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: 'rgba(255,255,255,0.7)',
  },
  userRow: {
    padding: '14px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  avatar: {
    width: '32px', height: '32px',
    background: 'rgba(255,255,255,0.15)',
    borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white',
    fontSize: '0.82rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    color: 'white',
    fontSize: '0.8rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRole: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: '0.68rem',
    marginTop: '1px',
  },
  logoutBtn: {
    color: 'rgba(255,255,255,0.4)',
    padding: '6px',
    borderRadius: '6px',
    transition: 'color 150ms, background 150ms',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
}
