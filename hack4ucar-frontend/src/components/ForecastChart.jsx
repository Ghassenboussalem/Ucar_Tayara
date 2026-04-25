import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const isForecast = payload[0]?.payload?.is_forecast
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {label}
        {isForecast && <span style={{ padding: '1px 6px', borderRadius: '4px', background: 'rgba(29,83,148,0.1)', color: 'rgb(29,83,148)', fontSize: '0.65rem', fontWeight: 700 }}>PRÉVISION</span>}
      </div>
      {payload.map((p) => p.value != null && (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', color: p.color || '#374151' }}>
          <span>{p.name}</span>
          <span style={{ fontWeight: 700 }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function ForecastChart({
  data,           // [{name, actual, forecast, lower, upper, is_forecast}]
  color = 'rgb(29,83,148)',
  unit = '%',
  label = 'Valeur',
  trend,
  changePct,
  confidence,
  lastActual,
  lastForecast,
}) {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
        Données insuffisantes pour la prévision
      </div>
    )
  }

  // Find the split point (last non-forecast)
  const splitName = data.filter(d => !d.is_forecast).at(-1)?.name

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? '#dc2626' : trend === 'down' ? '#059669' : '#64748b'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Metrics row */}
      {lastActual != null && (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Actuel</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{lastActual}{unit}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '1.1rem' }}>→</div>
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: trendColor + '08', border: `1px solid ${trendColor}30` }}>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Prévu (S2 2026)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: trendColor, display: 'flex', alignItems: 'center', gap: '4px' }}>
              {lastForecast}{unit} <TrendIcon size={14} />
            </div>
          </div>
          {changePct != null && (
            <div style={{ padding: '8px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Variation</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: trendColor }}>{changePct > 0 ? '+' : ''}{changePct}%</div>
            </div>
          )}
          {confidence != null && (
            <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(29,83,148,0.05)', border: '1px solid rgba(29,83,148,0.15)' }}>
              <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '3px' }}>Confiance</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'rgb(29,83,148)' }}>{confidence}%</div>
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={38} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />

          {/* Confidence band — upper bound (filled) */}
          <Area
            type="monotone"
            dataKey="upper"
            name="Borne haute"
            stroke="none"
            fill={color}
            fillOpacity={0.08}
            legendType="none"
            dot={false}
            activeDot={false}
          />
          {/* Confidence band — lower bound (white mask) */}
          <Area
            type="monotone"
            dataKey="lower"
            name="Borne basse"
            stroke="none"
            fill="white"
            fillOpacity={1}
            legendType="none"
            dot={false}
            activeDot={false}
          />

          {/* Historical line — solid */}
          <Line
            type="monotone"
            dataKey="actual"
            name={label}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 4, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />

          {/* Forecast line — dashed */}
          <Line
            type="monotone"
            dataKey="forecast"
            name="Prévision"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 4, fill: 'white', stroke: color, strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            connectNulls={true}
          />

          {/* Divider: past vs future */}
          {splitName && (
            <ReferenceLine
              x={splitName}
              stroke="#94a3b8"
              strokeDasharray="4 2"
              label={{ value: '▶ Prévision', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8', dy: -4 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
