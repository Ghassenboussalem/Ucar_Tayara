import { useState, useRef, useEffect } from 'react'
import { Brain, TrendingUp, TrendingDown, ArrowRight, Lightbulb } from 'lucide-react'
import client from '../api/client'

// Cache fetched results to avoid repeated calls
const _cache = {}

export default function CausalTooltip({ kpiName, value, threshold, children }) {
  const [data, setData] = useState(null)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const timerRef = useRef(null)

  async function fetchCausal() {
    if (_cache[kpiName]) { setData(_cache[kpiName]); return }
    setLoading(true)
    try {
      const res = await client.get(`/causal/${kpiName}`)
      _cache[kpiName] = res.data
      setData(res.data)
    } catch {}
    setLoading(false)
  }

  function handleMouseEnter() {
    if (!kpiName) return
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setPos({ top: rect.bottom + 8, left: Math.min(rect.left, window.innerWidth - 340) })
      }
      setVisible(true)
      fetchCausal()
    }, 350)
  }

  function handleMouseLeave() {
    clearTimeout(timerRef.current)
    setVisible(false)
  }

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ display: 'contents' }}>
      {children}
      {visible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            width: '320px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            animation: 'fadeInUp 0.18s ease both',
          }}
          onMouseEnter={() => { clearTimeout(timerRef.current); setVisible(true) }}
          onMouseLeave={() => setVisible(false)}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, rgb(20,58,105), rgb(29,83,148))', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={14} color="white" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
              Analyse causale · {data?.label || kpiName}
            </span>
          </div>

          {loading && !data && (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>Chargement…</div>
          )}

          {data && (
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Causes */}
              {data.causes?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    ↳ Facteurs causaux identifiés
                  </div>
                  {data.causes.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0', borderBottom: i < data.causes.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                      <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: `hsl(${Math.abs(c.strength) * 120}, 70%, 50%)`, opacity: Math.abs(c.strength) }} />
                      <span style={{ fontSize: '0.75rem', color: '#374151', flex: 1 }}>{c.label}</span>
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>lag {c.lag_weeks}sem</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Effects */}
              {data.effects?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                    ↳ Effets en cascade
                  </div>
                  {data.effects.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 0' }}>
                      <ArrowRight size={11} color="#94a3b8" />
                      <span style={{ fontSize: '0.75rem', color: '#374151', flex: 1 }}>{e.label}</span>
                      {e.direction === 'up'
                        ? <TrendingUp size={12} color="#dc2626" />
                        : <TrendingDown size={12} color="#dc2626" />
                      }
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>~{e.lag_weeks}sem</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendation */}
              {data.recommendation && (
                <div style={{ padding: '8px 10px', background: 'rgba(29,83,148,0.05)', borderRadius: '6px', border: '1px solid rgba(29,83,148,0.1)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgb(29,83,148)', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}><Lightbulb size={10} /> RECOMMANDATION</div>
                  <div style={{ fontSize: '0.73rem', color: '#374151', lineHeight: 1.5 }}>{data.recommendation}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
