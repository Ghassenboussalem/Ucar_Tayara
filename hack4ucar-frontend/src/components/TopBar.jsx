import { useState, useEffect, useRef } from 'react'
import { Search, Sparkles, Building2, ChevronDown, X } from 'lucide-react'
import { getInstitutions } from '../api/client'

// Global institution filter — stored in sessionStorage so it persists across page navigation
export function getSelectedInstitution() {
  try { return JSON.parse(sessionStorage.getItem('ucar_inst_filter') || 'null') } catch { return null }
}
export function setSelectedInstitution(inst) {
  if (inst) sessionStorage.setItem('ucar_inst_filter', JSON.stringify(inst))
  else sessionStorage.removeItem('ucar_inst_filter')
  window.dispatchEvent(new Event('ucar_inst_change'))
}

export default function TopBar({ onOpenChat }) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem('ucar_user') || '{}') } catch { return {} }
  })()
  const isPresidency = user.role === 'presidency'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const firstName = user.full_name ? user.full_name.split(' ')[0] : ''

  const [institutions, setInstitutions] = useState([])
  const [selected, setSelected] = useState(getSelectedInstitution())
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = useRef(null)

  useEffect(() => {
    if (isPresidency) {
      getInstitutions().then(setInstitutions).catch(() => {})
    }
  }, [isPresidency])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(inst) {
    const next = inst === null ? null : inst
    setSelected(next)
    setSelectedInstitution(next)
    setOpen(false)
    setSearch('')
  }

  const filtered = institutions.filter((i) =>
    !search || i.name_fr.toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <h2 style={styles.greeting}>{greeting}{firstName ? `, ${firstName}` : ''} 👋</h2>
        <p style={styles.sub}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={styles.right}>
        {/* Institution Switcher — only for presidency role */}
        {isPresidency && (
          <div ref={dropRef} style={{ position: 'relative' }}>
            <button
              id="btn-institution-filter"
              style={{ ...styles.instBtn, ...(selected ? styles.instBtnActive : {}) }}
              onClick={() => setOpen(!open)}
            >
              <Building2 size={14} />
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected ? selected.code + ' — ' + selected.name_fr.split(' ').slice(0, 3).join(' ') : 'Tous les établissements'}
              </span>
              <ChevronDown size={13} style={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }} />
              {selected && (
                <span onClick={(e) => { e.stopPropagation(); handleSelect(null) }} style={{ marginLeft: '2px', opacity: 0.6, display: 'flex' }}>
                  <X size={12} />
                </span>
              )}
            </button>

            {open && (
              <div style={styles.dropdown}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher…"
                    style={styles.dropSearch}
                  />
                </div>
                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  <button style={styles.dropItem} onClick={() => handleSelect(null)}>
                    <Building2 size={13} style={{ opacity: 0.5 }} />
                    <span style={{ fontWeight: 600 }}>Tous les établissements</span>
                    {!selected && <span style={styles.activeDot} />}
                  </button>
                  {filtered.map((inst) => (
                    <button key={inst.id} style={styles.dropItem} onClick={() => handleSelect(inst)}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgb(29,83,148)', minWidth: '44px' }}>{inst.code}</span>
                      <span style={{ flex: 1, textAlign: 'left', fontSize: '0.8rem', color: '#0f172a' }}>{inst.name_fr}</span>
                      {selected?.id === inst.id && <span style={styles.activeDot} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={styles.searchWrap}>
          <Search size={15} style={styles.searchIcon} />
          <input style={styles.searchInput} placeholder="Rechercher une institution, un KPI…" />
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
    height: '70px', background: 'white', borderBottom: '1px solid #e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 32px', position: 'sticky', top: 0, zIndex: 40,
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  left: { display: 'flex', flexDirection: 'column', gap: '1px' },
  greeting: { fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' },
  sub: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400, textTransform: 'capitalize' },
  right: { display: 'flex', alignItems: 'center', gap: '12px' },
  instBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px',
    borderRadius: '8px', border: '1.5px solid #e2e8f0', background: 'white',
    fontSize: '0.8rem', fontWeight: 500, color: '#374151', cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', transition: 'all 150ms', maxWidth: '240px',
  },
  instBtnActive: {
    border: '1.5px solid rgb(29,83,148)', color: 'rgb(29,83,148)',
    background: 'rgba(29,83,148,0.04)',
  },
  dropdown: {
    position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: '300px',
    background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100,
  },
  dropSearch: {
    width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #e2e8f0',
    fontSize: '0.8rem', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box',
  },
  dropItem: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
    padding: '8px 12px', background: 'transparent', border: 'none',
    cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 100ms',
  },
  activeDot: {
    width: '6px', height: '6px', borderRadius: '50%', background: 'rgb(29,83,148)', marginLeft: 'auto',
  },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '10px', color: '#94a3b8', pointerEvents: 'none' },
  searchInput: {
    padding: '7px 14px 7px 32px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
    fontSize: '0.8rem', width: '220px', outline: 'none', background: '#f8fafc',
    color: '#0f172a', fontFamily: 'Inter, sans-serif', transition: 'border-color 150ms',
  },
  aiBtn: {
    display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 16px',
    background: 'rgb(29, 83, 148)', color: 'white', border: 'none', borderRadius: '8px',
    fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    transition: 'background 150ms', boxShadow: '0 2px 8px rgba(29,83,148,0.3)', whiteSpace: 'nowrap',
  },
}
