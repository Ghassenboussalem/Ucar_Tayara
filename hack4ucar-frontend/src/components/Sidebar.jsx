import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Bell,
  FileText,
  LogOut,
  ChevronRight,
  TrendingUp,
  Lock,
  Network,
  Map,
  FlaskConical,
  Handshake,
  HeartPulse,
  HardHat,
  Cpu,
  Package,
  BookOpen,
  Leaf,
  Target,
  Truck,
  GraduationCap,
  ClipboardList,
} from 'lucide-react'

const NAV = [
  {
    section: 'Vue d\'ensemble',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    ],
  },
  {
    section: 'Données',
    items: [
      { to: '/institutions', icon: Building2, label: 'Institutions' },
      { to: '/map', icon: Map, label: 'Carte des institutions' },
      { to: '/alerts', icon: Bell, label: 'Alertes', badge: true },
    ],
  },
  {
    section: 'Intelligence',
    items: [
      { to: '/reports', icon: FileText, label: 'Rapports' },
      { to: '/causal', icon: Network, label: 'Graphe Causal' },
    ],
  },
]

const COMING_SOON_MODULES = [
  { icon: FlaskConical, label: 'Recherche' },
  { icon: Handshake, label: 'Partenariats' },
  { icon: HeartPulse, label: 'Vie Étudiante' },
  { icon: HardHat, label: 'Infrastructure' },
  { icon: Cpu, label: 'Équipements' },
  { icon: Package, label: 'Inventaire' },
  { icon: BookOpen, label: 'Formation Continue' },
  { icon: Leaf, label: 'ESG / RSE' },
  { icon: Target, label: 'Stratégie' },
  { icon: Truck, label: 'Logistique' },
  { icon: GraduationCap, label: 'Pédagogie' },
  { icon: ClipboardList, label: 'Scolarité' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('ucar_user') || '{}') } catch { return {} }
  })()

  function handleLogout() {
    localStorage.removeItem('ucar_token')
    localStorage.removeItem('ucar_user')
    navigate('/login')
  }

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <div style={styles.logoIcon}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <path d="M8 22 L16 10 L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <path d="M11 18 L21 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
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
          <div key={group.section} style={styles.navGroup}>
            <div style={styles.navSection}>{group.section}</div>
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
                    <span style={styles.navLabel}>{item.label}</span>
                    {isActive && <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Coming soon modules */}
        <div style={styles.navGroup}>
          <div style={styles.navSection}>Modules à venir</div>
          {COMING_SOON_MODULES.map((mod) => (
            <div key={mod.label} style={styles.lockedItem}>
              <mod.icon size={15} style={{ flexShrink: 0, opacity: 0.35 }} />
              <span style={styles.lockedLabel}>{mod.label}</span>
              <Lock size={11} style={{ marginLeft: 'auto', opacity: 0.3 }} />
            </div>
          ))}
        </div>
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* AI Tag */}
      <div style={styles.aiTag}>
        <TrendingUp size={15} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>Moteur IA actif</div>
          <div style={{ fontSize: '0.7rem', opacity: 0.65 }}>Claude Sonnet · Prédictif</div>
        </div>
      </div>

      <div style={styles.divider} />

      {/* User */}
      <div style={styles.userRow}>
        <div style={styles.avatar}>
          {(user.full_name || 'U').charAt(0).toUpperCase()}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userName}>{user.full_name || 'Utilisateur'}</div>
          <div style={styles.userRole}>{roleLabel(user.role)}</div>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout} title="Déconnexion">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}

function roleLabel(role) {
  const map = {
    presidency: 'Présidence UCAR',
    institution_admin: 'Admin Institution',
    viewer: 'Observateur',
  }
  return map[role] || role || 'Inconnu'
}

const styles = {
  sidebar: {
    width: '240px',
    height: '100vh',
    position: 'fixed',
    top: 0, left: 0,
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
  lockedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '6px 10px',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.28)',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'default',
  },
  lockedLabel: {
    flex: 1,
    opacity: 0.7,
  },
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
