import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ReferenceLine } from 'recharts'
import { getAllKPIs } from '../api/client'
import { ArrowLeft, GraduationCap, DollarSign, Users, Bell } from 'lucide-react'
import CausalTooltip from '../components/CausalTooltip'

const TABS = [
  { id: 'academic', label: 'Académique', icon: GraduationCap },
  { id: 'finance',  label: 'Finance',    icon: DollarSign },
  { id: 'hr',       label: 'Ressources Humaines', icon: Users },
  { id: 'alerts',   label: 'Alertes',    icon: Bell },
]

function DeltaBadge({ current, previous, unit = '', invertColor = false }) {
  if (current == null || previous == null) return null
  const delta = +(current - previous).toFixed(1)
  if (delta === 0) return null
  const up = delta > 0
  // For dropout/absenteeism, going up is bad. For success rate, going up is good
  const good = invertColor ? !up : up
  const color = good ? '#059669' : '#dc2626'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 7px', borderRadius: '6px', background: color + '12', color, fontSize: '0.68rem', fontWeight: 700, marginTop: '4px' }}>
      {up ? '↑' : '↓'} {up ? '+' : ''}{delta}{unit} vs sem. préc.
    </span>
  )
}

function KPICard({ label, value, unit = '', color = 'rgb(29,83,148)', current, previous, invertColor = false, networkAvg, networkLabel }) {
  return (
    <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
        {value ?? '—'}<span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#94a3b8', marginLeft: '3px' }}>{unit}</span>
      </div>
      <DeltaBadge current={current} previous={previous} unit={unit} invertColor={invertColor} />
      {networkAvg != null && (
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '4px' }}>
          Moy. réseau: <strong style={{ color: '#64748b' }}>{networkAvg}{unit}</strong>
        </div>
      )}
    </div>
  )
}

export default function InstitutionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('academic')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try { setData(await getAllKPIs(id)) } catch {}
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>Chargement…</div>
  if (!data) return <div style={{ textAlign: 'center', padding: '80px', color: '#e74c3c' }}>Institution introuvable.</div>

  const inst = data.institution
  const academic = data.academic || []
  const finance  = data.finance  || []
  const hr       = data.hr       || []
  const alerts   = data.alerts   || []
  const netAvg   = data.network_avg || {}

  const latestAcademic = academic[academic.length - 1] || {}
  const prevAcademic   = academic[academic.length - 2] || {}
  const latestFinance  = finance[finance.length - 1]   || {}
  const prevFinance    = finance[finance.length - 2]   || {}
  const latestHR       = hr[hr.length - 1]             || {}
  const prevHR         = hr[hr.length - 2]             || {}

  const academicChart = academic.map((r) => ({ name: r.semester, 'Réussite': +r.success_rate, 'Abandon': +r.dropout_rate, 'Présence': +r.attendance_rate }))
  const financeChart  = finance.map((r) => ({ name: r.fiscal_year, 'Alloué (M TND)': +(r.allocated_budget / 1e6).toFixed(2), 'Consommé (M TND)': +(r.consumed_budget / 1e6).toFixed(2), 'Exécution %': +r.budget_execution_rate }))
  const hrChart       = hr.map((r) => ({ name: r.semester, 'Enseignants': r.total_teaching_staff, 'Admin': r.total_admin_staff, 'Absentéisme %': +r.absenteeism_rate }))

  const sevColor = { critical: '#dc2626', warning: '#f59e0b', info: '#3b82f6' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.3s ease both' }}>
      {/* Back + header */}
      <div>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', fontFamily: 'Inter,sans-serif', marginBottom: '16px' }}>
          <ArrowLeft size={14} /> Retour
        </button>
        <div style={{ background: 'linear-gradient(135deg,rgb(20,58,105),rgb(29,83,148))', borderRadius: '14px', padding: '24px 28px', color: 'white' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginBottom: '6px' }}>{inst.code}</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '8px' }}>{inst.name_fr}</h1>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[['📍', inst.city + ', ' + inst.governorate], ['👥', (inst.student_capacity || 0).toLocaleString('fr-FR') + ' étudiants'], ['🏛️', inst.type || 'Institution'], ['👤', inst.director_name]].map(([icon, val]) => val && (
              <span key={val} style={{ fontSize: '0.82rem', opacity: 0.85 }}>{icon} {val}</span>
            ))}
            {alerts.length > 0 && <span style={{ padding: '2px 10px', borderRadius: '99px', background: 'rgba(220,38,38,0.2)', color: '#fca5a5', fontSize: '0.75rem', fontWeight: 700 }}>🔔 {alerts.length} alerte(s)</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '4px', border: '1px solid #e2e8f0', width: 'fit-content' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px', borderRadius: '7px', border: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all 150ms', background: tab === t.id ? 'rgb(29,83,148)' : 'transparent', color: tab === t.id ? 'white' : '#64748b' }}>
            <t.icon size={14} /> {t.label}
            {t.id === 'alerts' && alerts.length > 0 && <span style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626', borderRadius: '99px', padding: '0 6px', fontSize: '0.7rem' }}>{alerts.length}</span>}
          </button>
        ))}
      </div>

      {/* Academic tab */}
      {tab === 'academic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Étudiants inscrits" value={latestAcademic.total_enrolled?.toLocaleString('fr-FR')} color="rgb(29,83,148)" />
            <KPICard label="Taux de réussite" value={latestAcademic.success_rate} unit="%" color="#059669"
              current={+latestAcademic.success_rate} previous={+prevAcademic.success_rate}
              networkAvg={netAvg.academic?.success_rate} />
            <CausalTooltip kpiName="dropout_rate" value={+latestAcademic.dropout_rate}>
              <KPICard label="Taux d'abandon" value={latestAcademic.dropout_rate} unit="%" color="#dc2626"
                current={+latestAcademic.dropout_rate} previous={+prevAcademic.dropout_rate} invertColor={true}
                networkAvg={netAvg.academic?.dropout_rate} />
            </CausalTooltip>
            <CausalTooltip kpiName="attendance_rate" value={+latestAcademic.attendance_rate}>
              <KPICard label="Taux de présence" value={latestAcademic.attendance_rate} unit="%" color="#0891b2"
                current={+latestAcademic.attendance_rate} previous={+prevAcademic.attendance_rate}
                networkAvg={netAvg.academic?.attendance_rate} />
            </CausalTooltip>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Évolution des indicateurs académiques</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={academicChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {netAvg.academic?.success_rate && (
                  <ReferenceLine y={netAvg.academic.success_rate} stroke="#059669" strokeDasharray="6 3" strokeOpacity={0.5}
                    label={{ value: `Moy. réseau ${netAvg.academic.success_rate}%`, position: 'insideTopRight', fontSize: 10, fill: '#059669' }} />
                )}
                <Line type="monotone" dataKey="Réussite" stroke="#059669" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Abandon" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Présence" stroke="rgb(29,83,148)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Finance tab */}
      {tab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Budget alloué" value={(+latestFinance.allocated_budget / 1e6).toFixed(2)} unit="M TND" color="rgb(29,83,148)" />
            <KPICard label="Consommé" value={(+latestFinance.consumed_budget / 1e6).toFixed(2)} unit="M TND" color="#0891b2" />
            <CausalTooltip kpiName="budget_execution_rate" value={+latestFinance.budget_execution_rate}>
              <KPICard label="Taux d'exécution" value={latestFinance.budget_execution_rate} unit="%"
                color={+latestFinance.budget_execution_rate > 95 ? '#dc2626' : '#059669'}
                current={+latestFinance.budget_execution_rate} previous={+prevFinance.budget_execution_rate} invertColor={true}
                networkAvg={netAvg.finance?.budget_execution_rate} />
            </CausalTooltip>
            <KPICard label="Coût / étudiant" value={(+latestFinance.cost_per_student).toLocaleString('fr-FR')} unit="TND" color="#7c3aed"
              networkAvg={netAvg.finance?.cost_per_student} />
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Budget alloué vs consommé (M TND)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={financeChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Alloué (M TND)" fill="rgba(29,83,148,0.15)" stroke="rgb(29,83,148)" strokeWidth={1.5} radius={[4,4,0,0]} />
                <Bar dataKey="Consommé (M TND)" fill="rgb(29,83,148)" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* HR tab */}
      {tab === 'hr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Enseignants" value={latestHR.total_teaching_staff} color="rgb(29,83,148)" />
            <KPICard label="Administratifs" value={latestHR.total_admin_staff} color="#0891b2" />
            <CausalTooltip kpiName="absenteeism_rate" value={+latestHR.absenteeism_rate}>
              <KPICard label="Absentéisme" value={latestHR.absenteeism_rate} unit="%"
                color={+latestHR.absenteeism_rate > 15 ? '#dc2626' : '#f59e0b'}
                current={+latestHR.absenteeism_rate} previous={+prevHR.absenteeism_rate} invertColor={true}
                networkAvg={netAvg.hr?.absenteeism_rate} />
            </CausalTooltip>
            <CausalTooltip kpiName="avg_teaching_load_hours" value={+latestHR.avg_teaching_load_hours}>
              <KPICard label="Charge horaire" value={latestHR.avg_teaching_load_hours} unit="h/sem" color="#7c3aed"
                current={+latestHR.avg_teaching_load_hours} previous={+prevHR.avg_teaching_load_hours} invertColor={true}
                networkAvg={netAvg.hr?.avg_teaching_load_hours} />
            </CausalTooltip>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>Évolution des effectifs</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hrChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {netAvg.hr?.absenteeism_rate && (
                  <ReferenceLine y={netAvg.hr.absenteeism_rate} stroke="#f59e0b" strokeDasharray="6 3" strokeOpacity={0.5}
                    label={{ value: `Moy. réseau ${netAvg.hr.absenteeism_rate}%`, position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
                )}
                <Bar dataKey="Enseignants" fill="rgb(29,83,148)" radius={[4,4,0,0]} />
                <Bar dataKey="Admin" fill="#0891b2" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Alerts tab */}
      {tab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#22c55e', fontWeight: 700 }}>✅ Aucune alerte active</div>
          ) : alerts.map((a) => (
            <div key={a.id} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${sevColor[a.severity] || '#94a3b8'}` }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: (sevColor[a.severity] || '#94a3b8') + '18', color: sevColor[a.severity] || '#94a3b8' }}>{a.severity?.toUpperCase()}</span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{a.domain} · {a.kpi_name} = {a.kpi_value}</span>
              </div>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>{a.title}</p>
              <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
