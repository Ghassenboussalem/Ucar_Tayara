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
      { to: '/causal', icon: Network, labelKey: 'nav.causal' },
      { to: '/analytics', icon: Brain, labelKey: 'nav.analytics' },
      { to: '/ingestion', icon: Database, labelKey: 'nav.ingestion' },
    ],
  },
]


export default function Sidebar() {
  const navigate = useNavigate()
  const { t, isRTL } = useLang()
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('ucar_user') || '{}') } catch { return {} }
  })()

  function handleLogout() {
    localStorage.removeItem('ucar_token')
    localStorage.removeItem('ucar_user')
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
        <div style={styles.logoIcon}>
          <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
            {/* Shield crest shape */}
            <path d="M24 4 L40 10 L40 26 C40 35 32 42 24 45 C16 42 8 35 8 26 L8 10 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
            {/* U letter */}
            <path d="M16 16 L16 26 C16 31 20 33 24 33 C28 33 32 31 32 26 L32 16" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            {/* Crossbar decoration */}
            <path d="M19 37 L29 37" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div style={styles.logoName}>UCAR Intelligence</div>
          <div style={styles.logoSub}>Université de Carthage</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* Navigation */}
      <nav style={styles.nav}>
        {NAV.map((group) => (
          <div key={group.sectionKey} style={styles.navGroup}>
            <div style={styles.navSection}>{t(group.sectionKey)}</div>
            {group.items.map((item) => (
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
        ))}

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
        <div style={styles.avatar}>
          {(user.full_name || 'U').charAt(0).toUpperCase()}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{user.full_name || t('role.unknown')}</div>
          <div style={styles.userRole}>{roleLabel(user.role, t)}</div>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout} title={t('sidebar.logout')}>
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}

function roleLabel(role, t) {
  const map = {
    presidency: 'role.presidency',
    institution_admin: 'role.institution_admin',
    viewer: 'role.viewer',
  }
  return map[role] ? t(map[role]) : (role || t('role.unknown'))
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
