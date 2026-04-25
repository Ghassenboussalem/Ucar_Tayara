import { Search, Sparkles } from 'lucide-react'

export default function TopBar({ onOpenChat }) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('ucar_user') || '{}') } catch { return {} }
  })()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = user.full_name ? user.full_name.split(' ')[0] : ''

  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <h2 style={styles.greeting}>
          {greeting}{firstName ? `, ${firstName}` : ''} 👋
        </h2>
        <p style={styles.sub}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={styles.right}>
        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            placeholder="Rechercher une institution, un KPI…"
          />
        </div>

        <button id="btn-open-chat" style={styles.aiBtn} onClick={onOpenChat}>
          <Sparkles size={15} />
          <span>Demander à l'IA</span>
        </button>
      </div>
    </header>
  )
}

const styles = {
  bar: {
    height: '70px',
    background: 'white',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    position: 'sticky',
    top: 0,
    zIndex: 40,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  left: { display: 'flex', flexDirection: 'column', gap: '1px' },
  greeting: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  sub: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontWeight: 400,
    textTransform: 'capitalize',
  },
  right: { display: 'flex', alignItems: 'center', gap: '12px' },
  searchWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    color: '#94a3b8',
    pointerEvents: 'none',
  },
  searchInput: {
    padding: '7px 14px 7px 32px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '0.8rem',
    width: '240px',
    outline: 'none',
    background: '#f8fafc',
    color: '#0f172a',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 150ms, width 300ms',
  },
  aiBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    padding: '8px 16px',
    background: 'rgb(29, 83, 148)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'background 150ms, transform 100ms',
    boxShadow: '0 2px 8px rgba(29,83,148,0.3)',
    whiteSpace: 'nowrap',
  },
}
