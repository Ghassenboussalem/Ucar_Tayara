import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import { AlertTriangle, CheckCircle, Info } from 'lucide-react'

const SEVERITY_COLORS = {
  critical: '#dc2626',
  warning: '#f59e0b',
  ok: '#22c55e',
}

const SEVERITY_LABELS = {
  critical: 'Critique',
  warning: 'Avertissement',
  ok: 'Normal',
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const color = SEVERITY_COLORS[d.severity]
  return (
    <div style={{ background: 'white', border: `1px solid ${color}40`, borderRadius: '10px', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', fontSize: '0.8rem', minWidth: '180px' }}>
      <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>{d.code}</div>
      <div style={{ color: '#64748b', marginBottom: '6px', fontSize: '0.72rem' }}>{d.name}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ color: '#94a3b8' }}>Probabilité</span>
          <span style={{ fontWeight: 700, color }}>{d.probability}%</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ color: '#94a3b8' }}>Étudiants</span>
          <span style={{ fontWeight: 700 }}>{d.impact?.toLocaleString('fr-FR')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <span style={{ color: '#94a3b8' }}>Taux abandon</span>
          <span style={{ fontWeight: 700, color }}>{d.dropout_rate}%</span>
        </div>
      </div>
      <div style={{ marginTop: '6px', padding: '3px 8px', borderRadius: '4px', background: color + '15', color, fontSize: '0.68rem', fontWeight: 700, textAlign: 'center' }}>
        {SEVERITY_LABELS[d.severity]}
      </div>
    </div>
  )
}

export default function RiskMatrix({ data = [], onSelect }) {
  if (!data.length) {
    return (
      <div style={{ height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
        Chargement de la matrice de risque…
      </div>
    )
  }

  const critical = data.filter(d => d.severity === 'critical')
  const warning = data.filter(d => d.severity === 'warning')
  const ok = data.filter(d => d.severity === 'ok')
  const maxImpact = Math.max(...data.map(d => d.impact || 0))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Legend + summary */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {[
          { label: 'Critique', count: critical.length, color: '#dc2626', Icon: AlertTriangle },
          { label: 'Avertissement', count: warning.length, color: '#f59e0b', Icon: Info },
          { label: 'Normal', count: ok.length, color: '#22c55e', Icon: CheckCircle },
        ].map(({ label, count, color, Icon }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '8px', background: color + '10', border: `1px solid ${color}30` }}>
            <Icon size={13} color={color} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>{count} {label}{count > 1 ? 's' : ''}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          Taille du point = effectif étudiant
        </div>
      </div>

      {/* Scatter chart */}
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            type="number" dataKey="probability" name="Probabilité"
            domain={[0, 100]} unit="%"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            label={{ value: 'Probabilité de dégradation', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }}
          />
          <YAxis
            type="number" dataKey="impact" name="Impact"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            label={{ value: 'Étudiants concernés', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#64748b' }}
          />
          <ZAxis type="number" dataKey="impact" range={[40, 200]} />
          <Tooltip content={<CustomTooltip />} />

          {/* Risk quadrant dividers */}
          <ReferenceLine x={50} stroke="#e2e8f0" strokeDasharray="4 2"
            label={{ value: 'Zone à risque →', position: 'insideTopLeft', fontSize: 9, fill: '#dc2626', dy: -4 }} />
          <ReferenceLine y={maxImpact * 0.4} stroke="#e2e8f0" strokeDasharray="4 2" />

          <Scatter data={data} cursor={onSelect ? 'pointer' : 'default'} onClick={onSelect}>
            {data.map((d, i) => (
              <Cell key={i} fill={SEVERITY_COLORS[d.severity]} fillOpacity={0.8} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {/* Top risk table */}
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Top 5 institutions à risque élevé
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {data.slice(0, 5).map((d) => (
            <div key={d.id} onClick={() => onSelect?.(d)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: `1px solid ${SEVERITY_COLORS[d.severity]}25`, background: SEVERITY_COLORS[d.severity] + '06', cursor: onSelect ? 'pointer' : 'default' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: SEVERITY_COLORS[d.severity], flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem', minWidth: '52px' }}>{d.code}</span>
              <span style={{ flex: 1, fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: SEVERITY_COLORS[d.severity] }}>{d.probability}% prob.</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{d.dropout_rate}% abandon</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
