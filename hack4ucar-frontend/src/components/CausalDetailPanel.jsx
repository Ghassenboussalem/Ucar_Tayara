import { X, ArrowRight, ArrowLeft, Lightbulb, Loader2 } from 'lucide-react'

const DOMAIN_COLOR = {
  academic: 'rgb(29,83,148)',
  finance:  'rgb(22,163,74)',
  hr:       'rgb(245,158,11)',
  external: '#64748b',
}

const DOMAIN_BG = {
  academic: 'rgba(29,83,148,0.08)',
  finance:  'rgba(22,163,74,0.08)',
  hr:       'rgba(245,158,11,0.08)',
  external: 'rgba(100,116,139,0.08)',
}

const DOMAIN_LABEL = {
  academic: 'Académique',
  finance:  'Finance',
  hr:       'Ressources Humaines',
  external: 'Externe',
}

const DIR_ICON = {
  up:   { label: '↑ Hausse', color: '#16a34a' },
  down: { label: '↓ Baisse', color: '#dc2626' },
}

function StrengthBar({ value }) {
  const abs = Math.abs(value)
  const isNeg = value < 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '5px' }}>
      <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{
          width: `${abs * 100}%`,
          height: '100%',
          background: isNeg
            ? 'linear-gradient(90deg, #fca5a5, #ef4444)'
            : 'linear-gradient(90deg, #86efac, #22c55e)',
          borderRadius: '99px',
          transition: 'width 0.45s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: isNeg ? '#dc2626' : '#16a34a', minWidth: 32, textAlign: 'right' }}>
        {value > 0 ? '+' : ''}{value}
      </span>
    </div>
  )
}

export default function CausalDetailPanel({ detail, loading, error, onClose }) {
  const color = detail ? (DOMAIN_COLOR[detail.domain] || '#64748b') : '#64748b'
  const bg = detail ? (DOMAIN_BG[detail.domain] || '#f8fafc') : '#f8fafc'

  return (
    <div style={{
      width: '290px',
      flexShrink: 0,
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      maxHeight: '610px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    }}>
      {/* Color accent bar */}
      <div style={{ height: 4, background: detail ? color : '#e2e8f0', transition: 'background 0.35s ease' }} />

      {/* Header */}
      <div style={{ padding: '13px 16px 11px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>Détail causal</span>
          {detail && (
            <div style={{ fontSize: '0.67rem', color: '#94a3b8', marginTop: '1px' }}>
              Cliquez un autre nœud pour changer
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{ padding: '5px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', borderRadius: '6px', flexShrink: 0 }}
          onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '44px' }}>
            <Loader2 size={22} color="#94a3b8" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

        {!loading && !detail && error && (
          <div style={{ textAlign: 'center', padding: '32px 10px' }}>
            <div style={{ fontSize: '2rem', opacity: 0.3, marginBottom: '10px' }}>⚠</div>
            <p style={{ color: '#94a3b8', fontSize: '0.81rem', lineHeight: 1.6, margin: 0 }}>
              Données causales non disponibles pour cet indicateur.
            </p>
          </div>
        )}

        {!loading && detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {/* Node title */}
            <div style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px', lineHeight: 1.3 }}>{detail.label}</div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ padding: '3px 9px', borderRadius: '99px', fontSize: '0.67rem', fontWeight: 700, background: bg, color }}>
                  {DOMAIN_LABEL[detail.domain] || detail.domain}
                </span>
              </div>
            </div>

            {/* Causes */}
            {detail.causes?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '5px', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowLeft size={11} color="#dc2626" />
                  </div>
                  <span style={{ fontSize: '0.71rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Causes</span>
                  <span style={{ fontSize: '0.67rem', color: '#94a3b8', marginLeft: 'auto' }}>
                    {detail.causes.length} facteur{detail.causes.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {detail.causes.map((c) => (
                    <div key={c.kpi} style={{ padding: '9px 11px', background: '#fef2f2', borderRadius: '9px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#0f172a' }}>{c.label}</div>
                      {c.strength != null && <StrengthBar value={c.strength} />}
                      {c.lag_weeks != null && (
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '3px' }}>Délai : {c.lag_weeks} sem.</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Effects */}
            {detail.effects?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '5px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ArrowRight size={11} color="#16a34a" />
                  </div>
                  <span style={{ fontSize: '0.71rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Effets</span>
                  <span style={{ fontSize: '0.67rem', color: '#94a3b8', marginLeft: 'auto' }}>
                    {detail.effects.length} indicateur{detail.effects.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {detail.effects.map((e) => (
                    <div key={e.kpi} style={{ padding: '9px 11px', background: '#f0fdf4', borderRadius: '9px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#0f172a' }}>{e.label}</div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {e.direction && (
                          <span style={{ fontSize: '0.69rem', fontWeight: 600, color: DIR_ICON[e.direction]?.color || '#64748b' }}>
                            {DIR_ICON[e.direction]?.label || e.direction}
                          </span>
                        )}
                        {e.lag_weeks != null && (
                          <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Délai : {e.lag_weeks} sem.</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {detail.recommendation && (
              <div style={{ padding: '11px 13px', background: 'linear-gradient(135deg, rgba(29,83,148,0.05), rgba(29,83,148,0.02))', borderRadius: '10px', border: '1px solid rgba(29,83,148,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '7px' }}>
                  <Lightbulb size={13} color="rgb(29,83,148)" />
                  <span style={{ fontSize: '0.69rem', fontWeight: 700, color: 'rgb(29,83,148)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recommandation</span>
                </div>
                <p style={{ fontSize: '0.77rem', color: '#374151', lineHeight: 1.65, margin: 0 }}>{detail.recommendation}</p>
              </div>
            )}

            {/* Simulate button */}
            <button
              onClick={() => alert('Fonctionnalité à venir')}
              style={{
                width: '100%', padding: '11px',
                background: 'linear-gradient(135deg, rgb(29,83,148), rgb(37,99,185))',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 14px rgba(29,83,148,0.32)',
                transition: 'transform 0.12s, box-shadow 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 7px 20px rgba(29,83,148,0.42)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(29,83,148,0.32)' }}
            >
              Simuler une intervention
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
