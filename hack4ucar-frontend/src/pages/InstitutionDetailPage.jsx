import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine, PieChart, Pie, Cell,
} from 'recharts'
import { getAllKPIs } from '../api/client'
import { ArrowLeft, GraduationCap, DollarSign, Users, Bell, Building2, Globe, Briefcase, Leaf, BookOpen } from 'lucide-react'
import CausalTooltip from '../components/CausalTooltip'

const TABS = [
  { id: 'academic',       label: 'Académique',          icon: GraduationCap },
  { id: 'finance',        label: 'Finance',             icon: DollarSign },
  { id: 'hr',             label: 'Ressources Humaines', icon: Users },
  { id: 'infrastructure', label: 'Infrastructure',      icon: Building2 },
  { id: 'partnership',    label: 'Partenariats',        icon: Globe },
  { id: 'employment',     label: 'Employabilité',       icon: Briefcase },
  { id: 'esg',           label: 'ESG / RSE',           icon: Leaf },
  { id: 'research',      label: 'Recherche',           icon: BookOpen },
  { id: 'alerts',         label: 'Alertes',             icon: Bell },
]

const PIE_COLORS = ['#1d5394', '#059669', '#f59e0b', '#0891b2', '#7c3aed', '#dc2626']
const SEV_COLOR  = { critical: '#dc2626', warning: '#f59e0b', info: '#3b82f6' }

// ── Shared components ───────────────────────────────────────────────────────

function DeltaBadge({ current, previous, unit = '', invertColor = false, label = 'vs préc.' }) {
  if (current == null || previous == null) return null
  const delta = +(current - previous).toFixed(1)
  if (delta === 0) return null
  const up = delta > 0
  const good = invertColor ? !up : up
  const color = good ? '#059669' : '#dc2626'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', padding: '2px 7px', borderRadius: '6px', background: color + '14', color, fontSize: '0.67rem', fontWeight: 700, marginTop: '4px' }}>
      {up ? '↑' : '↓'} {up ? '+' : ''}{delta}{unit} {label}
    </span>
  )
}

function KPICard({ label, value, unit = '', color = 'rgb(29,83,148)', current, previous, invertColor = false, networkAvg, deltaLabel }) {
  return (
    <div style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' }}>
        {value ?? '—'}<span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94a3b8', marginLeft: '3px' }}>{unit}</span>
      </div>
      <DeltaBadge current={current} previous={previous} unit={unit} invertColor={invertColor} label={deltaLabel} />
      {networkAvg != null && (
        <div style={{ fontSize: '0.67rem', color: '#94a3b8', marginTop: '5px' }}>
          Moy. réseau: <strong style={{ color: '#64748b' }}>{networkAvg}{unit}</strong>
        </div>
      )}
    </div>
  )
}

function ProgressBar({ label, value, max = 100, color = 'rgb(29,83,148)', suffix = '%', compare }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const compPct = compare != null ? Math.min(100, Math.max(0, (compare / max) * 100)) : null
  return (
    <div style={{ marginBottom: '13px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
        <span style={{ fontSize: '0.74rem', color: '#475569', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '0.74rem', fontWeight: 700, color }}>{value}{suffix}</span>
      </div>
      <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '99px' }} />
        {compPct != null && (
          <div style={{ position: 'absolute', top: 0, left: `${compPct}%`, width: '2px', height: '100%', background: '#94a3b8' }} title={`Moy. réseau: ${compare}${suffix}`} />
        )}
      </div>
      {compare != null && (
        <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '3px' }}>Moy. réseau : {compare}{suffix}</div>
      )}
    </div>
  )
}

function SectionCard({ title, children, style }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', ...style }}>
      {title && <h3 style={{ fontSize: '0.87rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>{title}</h3>}
      {children}
    </div>
  )
}

function MiniStatGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '10px' }}>
      {items.map(({ label, value, unit = '', color = '#0f172a', icon }) => (
        <div key={label} style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
          {icon && <div style={{ fontSize: '1.1rem', marginBottom: '3px' }}>{icon}</div>}
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>{value ?? '—'}<span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '2px' }}>{unit}</span></div>
          <div style={{ fontSize: '0.67rem', color: '#94a3b8', marginTop: '3px', lineHeight: 1.3 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function BadgeRow({ items }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
      {items.map(({ label, value, color = 'rgb(29,83,148)' }) => (
        <div key={label} style={{ background: color + '0f', border: `1px solid ${color}30`, borderRadius: '10px', padding: '10px 18px', textAlign: 'center', minWidth: '90px' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color }}>{value ?? '—'}</div>
          <div style={{ fontSize: '0.67rem', color: '#64748b', marginTop: '3px', lineHeight: 1.3 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

const TT_STYLE = { borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '11px' }
const AXIS_TICK = { fontSize: 10, fill: '#94a3b8' }

// ── Main page ───────────────────────────────────────────────────────────────

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

  const inst       = data.institution
  const academic   = data.academic      || []
  const finance    = data.finance       || []
  const hr         = data.hr            || []
  const alerts     = data.alerts        || []
  const employment = data.employment    || []
  const infra      = data.infrastructure|| []
  const partner    = data.partnership   || []
  const esg        = data.esg          || []
  const research   = data.research     || []
  const netAvg     = data.network_avg   || {}

  const latA = academic[academic.length - 1]   || {}
  const prvA = academic[academic.length - 2]   || {}
  const latF = finance[finance.length - 1]     || {}
  const prvF = finance[finance.length - 2]     || {}
  const latH = hr[hr.length - 1]              || {}
  const prvH = hr[hr.length - 2]              || {}
  const latE = employment[employment.length - 1]|| {}
  const prvE = employment[employment.length - 2]|| {}
  const latI = infra[infra.length - 1]         || {}
  const prvI = infra[infra.length - 2]         || {}
  const latP = partner[partner.length - 1]     || {}
  const prvP = partner[partner.length - 2]     || {}
  const latG = esg[esg.length - 1]            || {}
  const prvG = esg[esg.length - 2]            || {}
  const latR = research[research.length - 1]  || {}
  const prvR = research[research.length - 2]  || {}

  // Chart data
  const academicTrend = academic.map(r => ({ name: r.semester, 'Réussite': +r.success_rate, 'Abandon': +r.dropout_rate, 'Présence': +r.attendance_rate }))
  const studentBreak  = academic.map(r => ({ name: r.semester, 'Réussis': r.total_passed, 'Échoués': r.total_failed, 'Abandons': r.total_dropped }))
  const finChart      = finance.map(r => ({ name: r.fiscal_year, 'Alloué': +(r.allocated_budget / 1e6).toFixed(2), 'Consommé': +(r.consumed_budget / 1e6).toFixed(2) }))
  const budgetPie     = latF.staff_budget_pct ? [
    { name: 'RH',            value: +latF.staff_budget_pct },
    { name: 'Infrastructure', value: +latF.infrastructure_budget_pct },
    { name: 'Recherche',     value: +latF.research_budget_pct },
    { name: 'Autres',        value: +latF.other_budget_pct },
  ] : []
  const hrChart       = hr.map(r => ({ name: r.semester, 'Enseignants': r.total_teaching_staff, 'Administratifs': r.total_admin_staff }))
  const infraChart    = infra.map(r => ({ name: r.semester, 'Salles': +r.classroom_occupancy_rate, 'Équipements': +r.it_equipment_status_pct, 'Labos': +r.lab_availability_rate }))
  const partnerChart  = partner.map(r => ({ name: r.academic_year, 'National': r.active_national_agreements, 'International': r.active_international_agreements, 'Industrie': r.industry_partnerships }))
  const empChart      = employment.map(r => ({ name: r.graduation_year, '6 mois': +r.employability_rate_6m, '12 mois': +r.employability_rate_12m }))
  const empDest       = latE.graduation_year ? [
    { name: 'National',        value: +latE.national_employment_pct },
    { name: 'International',   value: +latE.international_employment_pct },
    { name: 'Auto-entrepreneur',value: +latE.self_employed_pct },
    { name: 'Autres',          value: Math.max(0, +(100 - latE.national_employment_pct - latE.international_employment_pct - latE.self_employed_pct).toFixed(1)) },
  ] : []

  const maintRes = latI.maintenance_requests
    ? Math.round((latI.resolved_requests / latI.maintenance_requests) * 100) : 0

  // ESG charts
  const esgConsumptionChart = esg.map(r => ({
    name: r.fiscal_year,
    'Énergie (MWh)': +(r.energy_consumption_kwh / 1000).toFixed(0),
    'Eau (milliers m³)': +(r.water_consumption_m3 / 1000).toFixed(1),
    'Déchets (t)': +r.waste_produced_tons,
  }))
  const esgPerfChart = esg.map(r => ({
    name: r.fiscal_year,
    'Recyclage %': +r.recycling_rate,
    'Mobilité durable %': +r.sustainable_mobility_pct,
    'Accessibilité /100': +r.accessibility_score,
  }))

  // Research charts
  const researchChart = research.map(r => ({
    name: r.academic_year,
    'Publications': r.publications_count,
    'Projets actifs': r.active_projects,
    'Doctorants': r.phd_students,
  }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 0.3s ease both' }}>

      {/* Header */}
      <div>
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white', fontSize: '0.8rem', color: '#64748b', cursor: 'pointer', fontFamily: 'Inter,sans-serif', marginBottom: '14px' }}>
          <ArrowLeft size={14} /> Retour
        </button>
        <div style={{ background: 'linear-gradient(135deg,rgb(20,58,105),rgb(29,83,148))', borderRadius: '14px', padding: '24px 28px', color: 'white' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginBottom: '5px' }}>{inst.code}</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '10px' }}>{inst.name_fr}</h1>
          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[['📍', inst.city + ', ' + inst.governorate], ['👥', (inst.student_capacity || 0).toLocaleString('fr-FR') + ' étudiants'], ['🏛️', inst.type], ['👤', inst.director_name]].map(([icon, val]) => val && (
              <span key={val} style={{ fontSize: '0.82rem', opacity: 0.85 }}>{icon} {val}</span>
            ))}
            {alerts.length > 0 && <span style={{ padding: '2px 10px', borderRadius: '99px', background: 'rgba(220,38,38,0.22)', color: '#fca5a5', fontSize: '0.75rem', fontWeight: 700 }}>🔔 {alerts.length} alerte(s)</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', background: 'white', borderRadius: '10px', padding: '4px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 13px', borderRadius: '7px', border: 'none', fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all 150ms', background: tab === t.id ? 'rgb(29,83,148)' : 'transparent', color: tab === t.id ? 'white' : '#64748b' }}>
            <t.icon size={13} /> {t.label}
            {t.id === 'alerts' && alerts.length > 0 && <span style={{ background: 'rgba(220,38,38,0.15)', color: '#dc2626', borderRadius: '99px', padding: '0 6px', fontSize: '0.7rem' }}>{alerts.length}</span>}
          </button>
        ))}
      </div>

      {/* ── ACADEMIC ─────────────────────────────────────────────── */}
      {tab === 'academic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px' }}>
            <KPICard label="Étudiants inscrits" value={latA.total_enrolled?.toLocaleString('fr-FR')} color="rgb(29,83,148)" />
            <KPICard label="Taux de réussite" value={latA.success_rate} unit="%" color="#059669"
              current={+latA.success_rate} previous={+prvA.success_rate} networkAvg={netAvg.academic?.success_rate} />
            <CausalTooltip kpiName="dropout_rate" value={+latA.dropout_rate}>
              <KPICard label="Taux d'abandon" value={latA.dropout_rate} unit="%" color="#dc2626"
                current={+latA.dropout_rate} previous={+prvA.dropout_rate} invertColor networkAvg={netAvg.academic?.dropout_rate} />
            </CausalTooltip>
            <CausalTooltip kpiName="attendance_rate" value={+latA.attendance_rate}>
              <KPICard label="Taux de présence" value={latA.attendance_rate} unit="%" color="#0891b2"
                current={+latA.attendance_rate} previous={+prvA.attendance_rate} networkAvg={netAvg.academic?.attendance_rate} />
            </CausalTooltip>
            <KPICard label="Note moyenne" value={latA.avg_grade} unit="/20" color="#7c3aed"
              current={+latA.avg_grade} previous={+prvA.avg_grade} />
            <KPICard label="Taux de répétition" value={latA.repetition_rate} unit="%" color="#f59e0b"
              current={+latA.repetition_rate} previous={+prvA.repetition_rate} invertColor />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <SectionCard title="Performance vs moyenne réseau">
              <ProgressBar label="Taux de réussite" value={+latA.success_rate} color="#059669" compare={netAvg.academic?.success_rate} />
              <ProgressBar label="Taux d'abandon" value={+latA.dropout_rate} max={20} color="#dc2626" compare={netAvg.academic?.dropout_rate} />
              <ProgressBar label="Taux de présence" value={+latA.attendance_rate} color="#0891b2" compare={netAvg.academic?.attendance_rate} />
              <ProgressBar label="Note moyenne (/20)" value={+latA.avg_grade} max={20} color="#7c3aed" suffix="/20" />
            </SectionCard>
            <SectionCard title={`Répartition étudiants — ${latA.semester || 'dernier sem.'}`}>
              {latA.total_enrolled ? (
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={[
                      { name: 'Réussis',  value: latA.total_passed },
                      { name: 'Échoués', value: latA.total_failed },
                      { name: 'Abandons', value: latA.total_dropped },
                    ]} cx="50%" cy="50%" outerRadius={65} innerRadius={28} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {[0, 1, 2].map(i => <Cell key={i} fill={PIE_COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v + ' étudiants']} contentStyle={TT_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Aucune donnée</div>}
            </SectionCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <SectionCard title="Évolution des taux académiques (%)">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={academicTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {netAvg.academic?.success_rate && (
                    <ReferenceLine y={netAvg.academic.success_rate} stroke="#059669" strokeDasharray="5 3" strokeOpacity={0.5}
                      label={{ value: `Réseau ${netAvg.academic.success_rate}%`, position: 'insideTopRight', fontSize: 9, fill: '#059669' }} />
                  )}
                  <Line type="monotone" dataKey="Réussite" stroke="#059669" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Abandon"  stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Présence" stroke="rgb(29,83,148)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </SectionCard>
            <SectionCard title="Résultats étudiants par semestre">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={studentBreak}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Réussis"  stackId="a" fill="#059669" />
                  <Bar dataKey="Échoués" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Abandons" stackId="a" fill="#dc2626" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── FINANCE ──────────────────────────────────────────────── */}
      {tab === 'finance' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Budget alloué" value={(+latF.allocated_budget / 1e6).toFixed(2)} unit=" M TND" color="rgb(29,83,148)" />
            <KPICard label="Budget consommé" value={(+latF.consumed_budget / 1e6).toFixed(2)} unit=" M TND" color="#0891b2" />
            <CausalTooltip kpiName="budget_execution_rate" value={+latF.budget_execution_rate}>
              <KPICard label="Taux d'exécution" value={latF.budget_execution_rate} unit="%" color={+latF.budget_execution_rate > 95 ? '#dc2626' : '#059669'}
                current={+latF.budget_execution_rate} previous={+prvF.budget_execution_rate} invertColor networkAvg={netAvg.finance?.budget_execution_rate} />
            </CausalTooltip>
            <KPICard label="Coût / étudiant" value={(+latF.cost_per_student).toLocaleString('fr-FR')} unit=" TND" color="#7c3aed"
              networkAvg={netAvg.finance?.cost_per_student} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>
            <SectionCard title="Budget alloué vs consommé (M TND)">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={finChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Alloué"   fill="rgba(29,83,148,0.15)" stroke="rgb(29,83,148)" strokeWidth={1.5} radius={[4,4,0,0]} />
                  <Bar dataKey="Consommé" fill="rgb(29,83,148)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
            <SectionCard title="Répartition du budget">
              {budgetPie.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={budgetPie} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                        {budgetPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`]} contentStyle={TT_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {budgetPie.map((item, i) => (
                      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: PIE_COLORS[i], display: 'inline-block' }} />
                          {item.name}
                        </span>
                        <strong style={{ color: PIE_COLORS[i] }}>{item.value}%</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Aucune donnée</div>}
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── HR ───────────────────────────────────────────────────── */}
      {tab === 'hr' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Enseignants" value={latH.total_teaching_staff} color="rgb(29,83,148)"
              current={latH.total_teaching_staff} previous={prvH.total_teaching_staff} />
            <KPICard label="Administratifs" value={latH.total_admin_staff} color="#0891b2"
              current={latH.total_admin_staff} previous={prvH.total_admin_staff} />
            <CausalTooltip kpiName="absenteeism_rate" value={+latH.absenteeism_rate}>
              <KPICard label="Absentéisme" value={latH.absenteeism_rate} unit="%" color={+latH.absenteeism_rate > 15 ? '#dc2626' : '#f59e0b'}
                current={+latH.absenteeism_rate} previous={+prvH.absenteeism_rate} invertColor networkAvg={netAvg.hr?.absenteeism_rate} />
            </CausalTooltip>
            <CausalTooltip kpiName="avg_teaching_load_hours" value={+latH.avg_teaching_load_hours}>
              <KPICard label="Charge horaire" value={latH.avg_teaching_load_hours} unit=" h/sem" color="#7c3aed"
                current={+latH.avg_teaching_load_hours} previous={+prvH.avg_teaching_load_hours} invertColor networkAvg={netAvg.hr?.avg_teaching_load_hours} />
            </CausalTooltip>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Turn-over" value={latH.staff_turnover_rate} unit="%" color="#dc2626"
              current={+latH.staff_turnover_rate} previous={+prvH.staff_turnover_rate} invertColor />
            <KPICard label="Formation complétée" value={latH.training_completion_rate} unit="%" color="#059669"
              current={+latH.training_completion_rate} previous={+prvH.training_completion_rate} />
            <KPICard label="Staff permanent" value={latH.permanent_staff_pct} unit="%" color="rgb(29,83,148)" />
            <KPICard label="Staff contractuel" value={latH.contract_staff_pct} unit="%" color="#0891b2" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <SectionCard title="Évolution des effectifs">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hrChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Enseignants"   fill="rgb(29,83,148)" radius={[4,4,0,0]} />
                  <Bar dataKey="Administratifs" fill="#0891b2"        radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
            <SectionCard title="Indicateurs RH clés">
              <ProgressBar label="Taux d'absentéisme" value={+latH.absenteeism_rate} max={30} color="#f59e0b" compare={netAvg.hr?.absenteeism_rate} />
              <ProgressBar label="Taux de formation" value={+latH.training_completion_rate} color="#059669" />
              <ProgressBar label="Staff permanent" value={+latH.permanent_staff_pct} color="rgb(29,83,148)" />
              <ProgressBar label="Turn-over" value={+latH.staff_turnover_rate} max={30} color="#dc2626" compare={netAvg.hr?.staff_turnover_rate} />
              <ProgressBar label="Charge horaire" value={+latH.avg_teaching_load_hours} max={40} color="#7c3aed" suffix=" h" compare={netAvg.hr?.avg_teaching_load_hours} />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── INFRASTRUCTURE ───────────────────────────────────────── */}
      {tab === 'infrastructure' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Occupation salles" value={latI.classroom_occupancy_rate} unit="%" color="rgb(29,83,148)"
              current={+latI.classroom_occupancy_rate} previous={+prvI.classroom_occupancy_rate} />
            <KPICard label="Équip. informatique" value={latI.it_equipment_status_pct} unit="%" color="#059669"
              current={+latI.it_equipment_status_pct} previous={+prvI.it_equipment_status_pct} />
            <KPICard label="Disponibilité labos" value={latI.lab_availability_rate} unit="%" color="#7c3aed"
              current={+latI.lab_availability_rate} previous={+prvI.lab_availability_rate} />
            <KPICard label="Bibliothèque (taux)" value={latI.library_capacity_used_pct} unit="%" color="#0891b2"
              current={+latI.library_capacity_used_pct} previous={+prvI.library_capacity_used_pct} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <SectionCard title="Maintenance">
              <MiniStatGrid items={[
                { label: 'Demandes totales',  value: latI.maintenance_requests, color: '#f59e0b', icon: '🔧' },
                { label: 'Résolues',          value: latI.resolved_requests,    color: '#059669', icon: '✅' },
                { label: 'Travaux en cours',  value: latI.ongoing_works,        color: '#dc2626', icon: '🚧' },
                { label: 'Taux résolution',   value: maintRes + '%',            color: maintRes >= 80 ? '#059669' : '#f59e0b', icon: '📊' },
              ]} />
              <div style={{ marginTop: '16px' }}>
                <ProgressBar label="Résolution des demandes" value={maintRes} color={maintRes >= 80 ? '#059669' : '#f59e0b'} />
              </div>
            </SectionCard>
            <SectionCard title="Disponibilité des équipements">
              <ProgressBar label="Occupation salles"       value={+latI.classroom_occupancy_rate}    color="rgb(29,83,148)" />
              <ProgressBar label="Équipements IT"          value={+latI.it_equipment_status_pct}     color="#059669" />
              <ProgressBar label="Disponibilité générale"  value={+latI.equipment_availability_rate} color="#0891b2" />
              <ProgressBar label="Labos accessibles"       value={+latI.lab_availability_rate}       color="#7c3aed" />
              <ProgressBar label="Bibliothèque (capacité)" value={+latI.library_capacity_used_pct}   color="#f59e0b" />
            </SectionCard>
          </div>

          <SectionCard title="Évolution infrastructure par semestre (%)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={infraChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis domain={[50, 100]} tick={AXIS_TICK} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Salles"       stroke="rgb(29,83,148)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Équipements"  stroke="#059669"        strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="Labos"        stroke="#7c3aed"        strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}

      {/* ── PARTNERSHIPS ─────────────────────────────────────────── */}
      {tab === 'partnership' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Accords nationaux"       value={latP.active_national_agreements}       color="rgb(29,83,148)"
              current={latP.active_national_agreements} previous={prvP.active_national_agreements} deltaLabel="vs an préc." />
            <KPICard label="Accords internationaux"  value={latP.active_international_agreements}  color="#7c3aed"
              current={latP.active_international_agreements} previous={prvP.active_international_agreements} deltaLabel="vs an préc." />
            <KPICard label="Étudiants entrants"      value={latP.incoming_students}               color="#059669"
              current={latP.incoming_students} previous={prvP.incoming_students} deltaLabel="vs an préc." />
            <KPICard label="Étudiants sortants"      value={latP.outgoing_students}               color="#0891b2"
              current={latP.outgoing_students} previous={prvP.outgoing_students} deltaLabel="vs an préc." />
          </div>

          <SectionCard title="Programmes et partenariats spéciaux">
            <BadgeRow items={[
              { label: 'Partenariats Erasmus',   value: latP.erasmus_partnerships,         color: '#0891b2' },
              { label: 'Programmes conjoints',   value: latP.joint_programs,               color: '#7c3aed' },
              { label: 'Partenariats industrie', value: latP.industry_partnerships,         color: '#059669' },
              { label: 'Projets internationaux', value: latP.international_projects,        color: 'rgb(29,83,148)' },
            ]} />
          </SectionCard>

          <SectionCard title="Évolution des accords et partenariats">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={partnerChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="National"      fill="rgb(29,83,148)" radius={[4,4,0,0]} />
                <Bar dataKey="International" fill="#7c3aed"        radius={[4,4,0,0]} />
                <Bar dataKey="Industrie"     fill="#059669"        radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}

      {/* ── EMPLOYMENT ───────────────────────────────────────────── */}
      {tab === 'employment' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Diplômés" value={latE.graduates_total} color="rgb(29,83,148)"
              current={latE.graduates_total} previous={prvE.graduates_total} deltaLabel="vs an préc." />
            <KPICard label="Employabilité 6 mois" value={latE.employability_rate_6m} unit="%" color="#059669"
              current={+latE.employability_rate_6m} previous={+prvE.employability_rate_6m} deltaLabel="vs an préc." />
            <KPICard label="Employabilité 12 mois" value={latE.employability_rate_12m} unit="%" color="#0891b2"
              current={+latE.employability_rate_12m} previous={+prvE.employability_rate_12m} deltaLabel="vs an préc." />
            <KPICard label="Délai moyen insertion" value={latE.avg_months_to_employment} unit=" mois" color="#f59e0b"
              current={+latE.avg_months_to_employment} previous={+prvE.avg_months_to_employment} invertColor deltaLabel="vs an préc." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <SectionCard title="Destination des diplômés">
              {empDest.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <ResponsiveContainer width="55%" height={190}>
                    <PieChart>
                      <Pie data={empDest} cx="50%" cy="50%" outerRadius={72} innerRadius={32} dataKey="value">
                        {empDest.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v}%`]} contentStyle={TT_STYLE} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1 }}>
                    {empDest.map((item, i) => (
                      <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#475569' }}>
                          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i], display: 'inline-block' }} />
                          {item.name}
                        </span>
                        <strong style={{ color: PIE_COLORS[i], fontSize: '0.82rem' }}>{item.value}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Aucune donnée</div>}
            </SectionCard>

            <SectionCard title="Taux d'insertion professionnelle">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={empChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis domain={[0, 100]} tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} formatter={(v) => [`${v}%`]} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="6 mois"  fill="#059669" radius={[4,4,0,0]} />
                  <Bar dataKey="12 mois" fill="#0891b2" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ marginTop: '14px' }}>
                <ProgressBar label="Employabilité à 6 mois"  value={+latE.employability_rate_6m}  color="#059669" />
                <ProgressBar label="Employabilité à 12 mois" value={+latE.employability_rate_12m} color="#0891b2" />
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── ESG / RSE ────────────────────────────────────────────── */}
      {tab === 'esg' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Énergie consommée" value={+(latG.energy_consumption_kwh / 1000).toFixed(0)} unit=" MWh" color="#f59e0b"
              current={+(latG.energy_consumption_kwh / 1000).toFixed(0)} previous={+(prvG.energy_consumption_kwh / 1000).toFixed(0)} invertColor deltaLabel="vs an préc." />
            <KPICard label="Empreinte carbone" value={latG.carbon_footprint_tons} unit=" t CO₂" color="#dc2626"
              current={+latG.carbon_footprint_tons} previous={+prvG.carbon_footprint_tons} invertColor deltaLabel="vs an préc." />
            <KPICard label="Taux de recyclage" value={latG.recycling_rate} unit="%" color="#059669"
              current={+latG.recycling_rate} previous={+prvG.recycling_rate} deltaLabel="vs an préc." />
            <KPICard label="Consommation eau" value={+(latG.water_consumption_m3 / 1000).toFixed(1)} unit=" k·m³" color="#0891b2"
              current={+(latG.water_consumption_m3 / 1000).toFixed(1)} previous={+(prvG.water_consumption_m3 / 1000).toFixed(1)} invertColor deltaLabel="vs an préc." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Mobilité durable" value={latG.sustainable_mobility_pct} unit="%" color="#7c3aed"
              current={+latG.sustainable_mobility_pct} previous={+prvG.sustainable_mobility_pct} deltaLabel="vs an préc." />
            <KPICard label="Score accessibilité" value={latG.accessibility_score} unit="/100" color="#0891b2"
              current={+latG.accessibility_score} previous={+prvG.accessibility_score} deltaLabel="vs an préc." />
            <KPICard label="Déchets produits" value={latG.waste_produced_tons} unit=" t" color="#dc2626"
              current={+latG.waste_produced_tons} previous={+prvG.waste_produced_tons} invertColor deltaLabel="vs an préc." />
            <KPICard label="Espaces verts" value={(latG.green_spaces_sqm || 0).toLocaleString('fr-FR')} unit=" m²" color="#059669"
              current={latG.green_spaces_sqm} previous={prvG.green_spaces_sqm} deltaLabel="vs an préc." />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <SectionCard title="Performance environnementale">
              <ProgressBar label="Taux de recyclage" value={+latG.recycling_rate} color="#059669" />
              <ProgressBar label="Mobilité durable" value={+latG.sustainable_mobility_pct} color="#7c3aed" />
              <ProgressBar label="Score d'accessibilité" value={+latG.accessibility_score} color="#0891b2" />
              <div style={{ marginTop: '8px', padding: '10px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: 600 }}>
                  🌿 Score ESG global estimé :{' '}
                  <strong style={{ fontSize: '0.9rem' }}>
                    {(((+latG.recycling_rate / 50) + (+latG.sustainable_mobility_pct / 60) + (+latG.accessibility_score / 100)) / 3 * 100).toFixed(0)}/100
                  </strong>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Indicateurs de performance (%)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={esgPerfChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis domain={[0, 100]} tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Recyclage %"           fill="#059669" radius={[4,4,0,0]} />
                  <Bar dataKey="Mobilité durable %"    fill="#7c3aed" radius={[4,4,0,0]} />
                  <Bar dataKey="Accessibilité /100"    fill="#0891b2" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          <SectionCard title="Évolution des consommations">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={esgConsumptionChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={AXIS_TICK} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip contentStyle={TT_STYLE} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Énergie (MWh)"          stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="Eau (milliers m³)"       stroke="#0891b2" strokeWidth={2.5} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="Déchets (t)"             stroke="#dc2626" strokeWidth={2}   dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>
      )}

      {/* ── RESEARCH ─────────────────────────────────────────────── */}
      {tab === 'research' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px' }}>
            <KPICard label="Publications" value={latR.publications_count} color="rgb(29,83,148)"
              current={latR.publications_count} previous={prvR.publications_count} deltaLabel="vs an préc." />
            <KPICard label="Projets actifs" value={latR.active_projects} color="#7c3aed"
              current={latR.active_projects} previous={prvR.active_projects} deltaLabel="vs an préc." />
            <KPICard label="Financements obtenus" value={latR.funding_secured_tnd ? (latR.funding_secured_tnd / 1000).toFixed(0) : '—'} unit=" k TND" color="#059669"
              current={latR.funding_secured_tnd} previous={prvR.funding_secured_tnd} deltaLabel="vs an préc." />
            <KPICard label="Doctorants" value={latR.phd_students} color="#0891b2"
              current={latR.phd_students} previous={prvR.phd_students} deltaLabel="vs an préc." />
          </div>

          <SectionCard title="Indicateurs spécialisés">
            <BadgeRow items={[
              { label: 'Brevets déposés',           value: latR.patents_filed,                color: '#f59e0b' },
              { label: 'Collaborations intl.',      value: latR.international_collaborations, color: '#7c3aed' },
              { label: 'Collaborations nationales', value: latR.national_collaborations,      color: 'rgb(29,83,148)' },
              { label: 'Conférences',               value: latR.conferences_attended,         color: '#0891b2' },
            ]} />
          </SectionCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <SectionCard title="Évolution activité de recherche">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={researchChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={AXIS_TICK} />
                  <YAxis tick={AXIS_TICK} />
                  <Tooltip contentStyle={TT_STYLE} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Publications"   fill="rgb(29,83,148)" radius={[4,4,0,0]} />
                  <Bar dataKey="Projets actifs" fill="#7c3aed"        radius={[4,4,0,0]} />
                  <Bar dataKey="Doctorants"     fill="#0891b2"        radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
            <SectionCard title="Profil recherche">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Publications', value: latR.publications_count, max: 100, color: 'rgb(29,83,148)' },
                  { label: 'Projets actifs', value: latR.active_projects, max: 25, color: '#7c3aed' },
                  { label: 'Doctorants', value: latR.phd_students, max: 120, color: '#0891b2' },
                  { label: 'Collaborations intl.', value: latR.international_collaborations, max: 20, color: '#059669' },
                  { label: 'Conférences', value: latR.conferences_attended, max: 40, color: '#f59e0b' },
                ].map(({ label, value, max, color }) => (
                  <ProgressBar key={label} label={label} value={value || 0} max={max} color={color} suffix="" />
                ))}
                <div style={{ padding: '10px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd', marginTop: '4px' }}>
                  <div style={{ fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>
                    🔬 Financement total obtenu :{' '}
                    <strong>{latR.funding_secured_tnd ? (latR.funding_secured_tnd / 1000).toFixed(0) + ' k TND' : '—'}</strong>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {/* ── ALERTS ───────────────────────────────────────────────── */}
      {tab === 'alerts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alerts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#22c55e', fontWeight: 700 }}>✅ Aucune alerte active</div>
          ) : alerts.map((a) => (
            <div key={a.id} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${SEV_COLOR[a.severity] || '#94a3b8'}` }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: (SEV_COLOR[a.severity] || '#94a3b8') + '18', color: SEV_COLOR[a.severity] || '#94a3b8' }}>{a.severity?.toUpperCase()}</span>
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
