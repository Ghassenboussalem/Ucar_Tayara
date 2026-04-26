import { useState, useEffect, useRef } from 'react'
import { Search, Sparkles, Building2, ChevronDown, X } from 'lucide-react'
import { getInstitutions } from '../api/client'
import { getSelectedInstitution, setSelectedInstitution } from '../utils/institutionFilter'
import { useLang } from '../contexts/LangContext'
import { useAuth } from '../contexts/AuthContext'

export default function TopBar({ onOpenChat }) {
  const { lang, toggleLang, t, isRTL, dateLocale } = useLang()
  const { user, role, institutionId, isPresidency } = useAuth()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('topbar.morning') : hour < 18 ? t('topbar.afternoon') : t('topbar.evening')
  const firstName = user.full_name ? user.full_name.split(' ')[0] : ''

  const [institutions, setInstitutions] = useState([])
  const [selected, setSelected] = useState(getSelectedInstitution())
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = useRef(null)

  useEffect(() => {
    if (isPresidency) {
      getInstitutions().then(setInstitutions).catch(() => {})
    } else if (institutionId) {
      // Auto-set institution filter to the user's own institution
      getInstitutions().then((list) => {
        const mine = list.find((i) => i.id === institutionId) || null
        if (mine) {
          setSelected(mine)
          setSelectedInstitution(mine)
        }
      }).catch(() => {})
    }
  }, [isPresidency, institutionId])

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

  function institutionName(inst) {
    if (!inst) return ''
    if (lang === 'ar') return inst.name_ar || inst.name_fr || ''
    return inst.name_fr || inst.name_ar || ''
  }

  const filtered = institutions.filter((i) =>
    !search || institutionName(i).toLowerCase().includes(search.toLowerCase()) || i.code.toLowerCase().includes(search.toLowerCase())
  )

  const barStyle = {
    ...styles.bar,
    flexDirection: isRTL ? 'row-reverse' : 'row',
  }

  const rightStyle = {
    ...styles.right,
    flexDirection: isRTL ? 'row-reverse' : 'row',
  }

  const dropdownStyle = {
    ...styles.dropdown,
    right: isRTL ? 'auto' : 0,
    left: isRTL ? 0 : 'auto',
  }

  const searchIconStyle = {
    ...styles.searchIcon,
    left: isRTL ? 'auto' : '10px',
    right: isRTL ? '10px' : 'auto',
  }

  const searchInputStyle = {
    ...styles.searchInput,
    padding: isRTL ? '7px 32px 7px 14px' : '7px 14px 7px 32px',
    textAlign: isRTL ? 'right' : 'left',
  }

  return (
    <header style={barStyle}>
      <div style={styles.left}>
        <h2 style={styles.greeting}>{greeting}{firstName ? `, ${firstName}` : ''} 👋</h2>
        <p style={{ ...styles.sub, textTransform: lang === 'fr' ? 'capitalize' : 'none' }}>
          {new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div style={rightStyle}>
        {/* Institution Switcher — dropdown for presidency, static badge for others */}
        {isPresidency ? (
          <div ref={dropRef} style={{ position: 'relative' }}>
            <button
              id="btn-institution-filter"
              style={{ ...styles.instBtn, ...(selected ? styles.instBtnActive : {}) }}
              onClick={() => setOpen(!open)}
            >
              <Building2 size={14} />
              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selected ? selected.code + ' — ' + institutionName(selected).split(' ').slice(0, 3).join(' ') : t('topbar.all_inst')}
              </span>
              <ChevronDown size={13} style={{ transition: 'transform 150ms', transform: open ? 'rotate(180deg)' : 'none' }} />
              {selected && (
                <span onClick={(e) => { e.stopPropagation(); handleSelect(null) }} style={{ marginInlineStart: '2px', opacity: 0.6, display: 'flex' }}>
                  <X size={12} />
                </span>
              )}
            </button>

            {open && (
              <div style={dropdownStyle}>
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('topbar.search_inst')}
                    style={styles.dropSearch}
                  />
                </div>
                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  <button style={styles.dropItem} onClick={() => handleSelect(null)}>
                    <Building2 size={13} style={{ opacity: 0.5 }} />
                    <span style={{ fontWeight: 600 }}>{t('topbar.all_inst')}</span>
                    {!selected && <span style={styles.activeDot} />}
                  </button>
                  {filtered.map((inst) => (
                    <button key={inst.id} style={styles.dropItem} onClick={() => handleSelect(inst)}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgb(29,83,148)', minWidth: '44px' }}>{inst.code}</span>
                      <span style={{ flex: 1, textAlign: isRTL ? 'right' : 'left', fontSize: '0.8rem', color: '#0f172a' }}>{institutionName(inst)}</span>
                      {selected?.id === inst.id && <span style={styles.activeDot} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : selected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', borderRadius: '8px', border: '1.5px solid rgb(29,83,148)', background: 'rgba(29,83,148,0.04)', fontSize: '0.8rem', fontWeight: 600, color: 'rgb(29,83,148)' }}>
            <Building2 size={14} />
            <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selected.code + ' — ' + institutionName(selected).split(' ').slice(0, 3).join(' ')}
            </span>
          </div>
        )}

        <button style={styles.langBtn} onClick={toggleLang} title={t('topbar.lang_switch_title')}>
          {t('lang.toggle')}
        </button>

        <div style={styles.searchWrap}>
          <Search size={15} style={searchIconStyle} />
          <input style={searchInputStyle} placeholder={t('topbar.search')} />
        </div>

        <button id="btn-open-chat" style={styles.aiBtn} onClick={onOpenChat}>
          <Sparkles size={15} />
          <span>{t('topbar.ai_btn')}</span>
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
  langBtn: {
    padding: '7px 11px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    background: 'white',
    color: '#374151',
    fontSize: '0.76rem',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    minWidth: '54px',
  },
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
    position: 'absolute', top: 'calc(100% + 6px)', width: '300px',
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
