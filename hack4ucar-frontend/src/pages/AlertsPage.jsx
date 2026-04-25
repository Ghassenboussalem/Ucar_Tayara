import { useState, useEffect } from 'react'
import { getAlerts, resolveAlert, explainAlert } from '../api/client'
import { Bell, Filter, CheckCircle, Sparkles, RefreshCw } from 'lucide-react'

const DOMAINS = ['Tous', 'academic', 'finance', 'hr']
const SEVERITIES = ['Tous', 'critical', 'warning', 'info']

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [domain, setDomain] = useState('Tous')
  const [severity, setSeverity] = useState('Tous')
  const [showResolved, setShowResolved] = useState(false)
  const [explanation, setExplanation] = useState({})
  const [explaining, setExplaining] = useState({})

  async function load() {
    setLoading(true)
    try {
      const params = { resolved: showResolved }
      if (severity !== 'Tous') params.severity = severity
      if (domain !== 'Tous') params.domain = domain
      setAlerts(await getAlerts(params))
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [domain, severity, showResolved])

  async function handleExplain(id) {
    setExplaining((p) => ({ ...p, [id]: true }))
    try {
      const res = await explainAlert(id)
      setExplanation((p) => ({ ...p, [id]: res.explanation }))
    } finally {
      setExplaining((p) => ({ ...p, [id]: false }))
    }
  }

  const sevColor = { critical: '#dc2626', warning: '#f59e0b', info: '#3b82f6' }
  const sevLabel = { critical: '🔴 Critique', warning: '🟠 Attention', info: '🔵 Info' }
  const domLabel = { academic: 'Académique', finance: 'Finance', hr: 'RH' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', animation: 'fadeInUp 0.3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={22} color="rgb(29,83,148)" /> Centre d'alertes
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>Surveillance en temps réel — {alerts.length} alerte(s)</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '14px 18px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <Filter size={15} style={{ color: '#94a3b8' }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          {SEVERITIES.map((s) => (
            <button key={s} onClick={() => setSeverity(s)}
              style={{ padding: '4px 12px', borderRadius: '99px', border: '1.5px solid', borderColor: severity === s ? 'rgb(29,83,148)' : '#e2e8f0', background: severity === s ? 'rgb(29,83,148)' : 'white', color: severity === s ? 'white' : '#64748b', fontSize: '0.74rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              {s === 'Tous' ? 'Tout' : sevLabel[s]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {DOMAINS.map((d) => (
            <button key={d} onClick={() => setDomain(d)}
              style={{ padding: '4px 12px', borderRadius: '99px', border: '1.5px solid', borderColor: domain === d ? 'rgb(29,83,148)' : '#e2e8f0', background: domain === d ? 'rgb(29,83,148)' : 'white', color: domain === d ? 'white' : '#64748b', fontSize: '0.74rem', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              {d === 'Tous' ? 'Tout' : domLabel[d]}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748b', cursor: 'pointer', marginLeft: 'auto' }}>
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          Inclure résolues
        </label>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>Chargement…</p>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
          <CheckCircle size={48} color="#22c55e" /><p style={{ marginTop: '12px', color: '#374151', fontWeight: 700 }}>Aucune alerte active</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.map((a) => (
            <div key={a.id} style={{ background: 'white', borderRadius: '12px', padding: '18px 20px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${sevColor[a.severity] || '#94a3b8'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                    <span style={{ padding: '2px 9px', borderRadius: '99px', fontSize: '0.72rem', fontWeight: 700, background: sevColor[a.severity] + '18', color: sevColor[a.severity] }}>{sevLabel[a.severity]}</span>
                    <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>{domLabel[a.domain] || a.domain}</span>
                    <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 600 }}>{a.institution_name}</span>
                    <span style={{ fontSize: '0.7rem', color: '#cbd5e1', marginLeft: 'auto' }}>{a.created_at ? new Date(a.created_at).toLocaleDateString('fr-FR') : ''}</span>
                  </div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{a.title}</h4>
                  <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.55 }}>{a.description}</p>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                    {[['Indicateur', a.kpi_name], ['Valeur actuelle', a.kpi_value], ['Seuil', a.threshold_value]].map(([l, v]) => (
                      <div key={l} style={{ padding: '5px 10px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{l}</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {explanation[a.id] && (
                    <div style={{ marginTop: '10px', padding: '12px', background: 'rgba(29,83,148,0.04)', borderRadius: '8px', border: '1px solid rgba(29,83,148,0.12)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Sparkles size={13} color="rgb(29,83,148)" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgb(29,83,148)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analyse IA</span>
                      </div>
                      <p style={{ fontSize: '0.79rem', color: '#374151', lineHeight: 1.6 }}>{explanation[a.id]}</p>
                    </div>
                  )}
                </div>
                {!a.is_resolved && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => handleExplain(a.id)} disabled={explaining[a.id]}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.74rem', color: '#374151', cursor: 'pointer', fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap' }}>
                      <Sparkles size={13} /> {explaining[a.id] ? '…' : 'Analyser'}
                    </button>
                    <button onClick={async () => { await resolveAlert(a.id); setAlerts((p) => p.filter((x) => x.id !== a.id)) }}
                      style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', border: 'none', borderRadius: '8px', background: 'rgba(39,174,96,0.1)', fontSize: '0.74rem', color: '#16a34a', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <CheckCircle size={13} /> Résoudre
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
