import { X, ArrowRight, ArrowLeft, Lightbulb, Loader2 } from 'lucide-react'

const DOMAIN_COLOR = {
  academic: 'rgb(29,83,148)',
  finance: 'rgb(22,163,74)',
  hr: 'rgb(245,158,11)',
}

const DOMAIN_BG = {
  academic: 'rgba(29,83,148,0.08)',
  finance: 'rgba(22,163,74,0.08)',
  hr: 'rgba(245,158,11,0.08)',
}

const DOMAIN_LABEL = {
  academic: 'Académique',
  finance: 'Finance',
  hr: 'Ressources Humaines',
}

const DIR_ICON = {
  up: { label: '↑ Hausse', color: '#16a34a' },
  down: { label: '↓ Baisse', color: '#dc2626' },
}

export default function CausalDetailPanel({ detail, loading, error, onClose }) {
  const color = detail ? (DOMAIN_COLOR[detail.domain] || '#64748b') : '#64748b'
  const bg = detail ? (DOMAIN_BG[detail.domain] || '#f8fafc') : '#f8fafc'

  return (
    <div style={{
      width: '320px',
      flexShrink: 0,
      background: 'white',
      borderRadius: '14px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      maxHeight: '580px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>Détail causal</span>
        <button onClick={onClose} style={{ padding: '4px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 size={22} color="#94a3b8" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}

        {!loading && !detail && error && (
          <div style={{ textAlign: 'center', padding: '32px 12px' }}>
            <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>—</div>
            <p style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
              Données causales non disponibles pour cet indicateur.
            </p>
          </div>
        )}

        {!loading && !detail && !error && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem', padding: '40px 0' }}>
            Cliquez sur un nœud pour afficher les détails.
          </p>
        )}

        {!loading && detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Node title */}
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>{detail.label}</div>
              <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: bg, color }}>
                {DOMAIN_LABEL[detail.domain] || detail.domain}
              </span>
            </div>

            {/* Causes */}
            {detail.causes?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <ArrowLeft size={14} color="#dc2626" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Causes</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detail.causes.map((c) => (
                    <div key={c.kpi} style={{ padding: '8px 10px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{c.label}</div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        {c.strength != null && (
                          <span style={{ fontSize: '0.7rem', color: c.strength > 0 ? '#16a34a' : '#dc2626' }}>
                            Force : {c.strength > 0 ? '+' : ''}{c.strength}
                          </span>
                        )}
                        {c.lag_weeks != null && (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Délai : {c.lag_weeks}sem</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Effects */}
            {detail.effects?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <ArrowRight size={14} color="#16a34a" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Effets</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detail.effects.map((e) => (
                    <div key={e.kpi} style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0f172a' }}>{e.label}</div>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                        {e.direction && (
                          <span style={{ fontSize: '0.7rem', color: DIR_ICON[e.direction]?.color || '#64748b' }}>
                            {DIR_ICON[e.direction]?.label || e.direction}
                          </span>
                        )}
                        {e.lag_weeks != null && (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Délai : {e.lag_weeks}sem</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {detail.recommendation && (
              <div style={{ padding: '12px 14px', background: 'rgba(29,83,148,0.04)', borderRadius: '10px', border: '1px solid rgba(29,83,148,0.14)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Lightbulb size={14} color="rgb(29,83,148)" />
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgb(29,83,148)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recommandation</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#374151', lineHeight: 1.6, margin: 0 }}>{detail.recommendation}</p>
              </div>
            )}

            {/* Simulate button */}
            <button
              onClick={() => alert('Fonctionnalité à venir')}
              style={{ width: '100%', padding: '11px', background: 'rgb(29,83,148)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
            >
              Simuler une intervention
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
