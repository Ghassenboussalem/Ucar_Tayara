import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { getDashboard, getAlerts, resolveAlert, explainAlert } from '../api/client'
import { Building2, Users, Bell, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ChevronRight, ChevronLeft, Sparkles, RefreshCw, Brain, ArrowUpRight, ArrowDownRight, FlaskConical, Lightbulb, GraduationCap, DollarSign, Bot } from 'lucide-react'
import client from '../api/client'
import WhatIfPanel from '../components/WhatIfPanel'
import { getSelectedInstitution } from '../utils/institutionFilter'
import { useLang } from '../contexts/LangContext'

const TOTAL_STUDENTS_DISPLAY = 31500
const PAGE_SIZE = 5

const PRED_ICON_MAP = { pred_dropout: GraduationCap, pred_budget: DollarSign, pred_load: Users }

// Mini sparkline data helper
function mkSpark(base, n = 8) {
  return Array.from({ length: n }, (_, i) => ({ v: base + (Math.random() - 0.45) * base * 0.12 + i * base * 0.008 }))
}

function DeltaBadge({ delta, unit = 'pts' }) {
  if (delta == null) return null
  const up = delta > 0
  const color = up ? '#dc2626' : '#059669'
  const icon = up ? '↑' : '↓'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '2px 7px', borderRadius: '6px', background: color + '12', color, fontSize: '0.7rem', fontWeight: 700 }}>
      {icon} {up ? '+' : ''}{delta.toFixed(1)}{unit}
    </span>
  )
}

function StatCard({ icon: Icon, label, value, sub, color, spark, delta, deltaUnit }) {
  return (
    <div style={{ ...S.card, borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ ...S.cardIcon, background: color + '15', color }}>
          <Icon size={18} />
        </div>
        {spark && (
          <div style={{ width: 80, height: 36 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={spark}>
                <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
                <Tooltip contentStyle={{ display: 'none' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <div style={S.cardValue}>{value}</div>
        {delta != null && <DeltaBadge delta={delta} unit={deltaUnit || 'pts'} />}
      </div>
      <div style={S.cardLabel}>{label}</div>
      {sub && <div style={S.cardSub}>{sub}</div>}
    </div>
  )
}

function HealthBar({ score }) {
  const color = score >= 75 ? '#27ae60' : score >= 55 ? '#f39c12' : '#e74c3c'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '6px', background: '#f1f5f9', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: '99px', transition: 'width 600ms ease' }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color, minWidth: '32px' }}>{score}%</span>
    </div>
  )
}

function SeverityBadge({ severity, labels }) {
  const map = {
    critical: { label: labels?.critical || 'Critique', bg: '#fef2f2', color: '#dc2626' },
    warning: { label: labels?.warning || 'Attention', bg: '#fffbeb', color: '#d97706' },
    info: { label: labels?.info || 'Info', bg: '#eff6ff', color: '#2563eb' },
  }
  const s = map[severity] || map.info
  return <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
}

function PredictionCard({ pred, confidenceLabel, simulateLabel }) {
  const sevColors = { critical: '#dc2626', warning: '#f59e0b', info: '#3b82f6' }
  const color = sevColors[pred.severity] || '#3b82f6'
  return (
    <div style={{ background: 'white', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0', borderLeft: `4px solid ${color}`, display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(() => { const Icon = PRED_ICON_MAP[pred.id]; return Icon ? <Icon size={18} color={color} /> : null })()}
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{pred.title}</span>
        </div>
        <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700, background: color + '12', color }}>{pred.confidence}% {confidenceLabel}</span>
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{pred.current_label}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{pred.current_value}{pred.unit}</div>
        </div>
        <div style={{ color: '#94a3b8', fontSize: '1.2rem' }}>→</div>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>{pred.predicted_label}</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color }}>
            {pred.predicted_value}{pred.unit}
            <span style={{ fontSize: '0.82rem', marginLeft: '4px' }}>{pred.trend === 'up' ? '↑' : '↓'}</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5, background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
        <Lightbulb size={13} style={{ flexShrink: 0, marginTop: '1px', color: '#f59e0b' }} /> {pred.explanation}
      </div>
      {pred.onSimulate && (
        <button onClick={pred.onSimulate} style={{ marginTop: '8px', padding: '5px 12px', borderRadius: '7px', border: '1px solid rgba(29,83,148,0.2)', background: 'rgba(29,83,148,0.05)', color: 'rgb(29,83,148)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', display: 'flex', alignItems: 'center', gap: '5px', width: '100%', justifyContent: 'center' }}>
          <FlaskConical size={13} /> {simulateLabel}
        </button>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { lang, t } = useLang()
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  const navigate = useNavigate()
  const [dash, setDash] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [predictions, setPredictions] = useState([])
  const [loading, setLoading] = useState(true)
  const [explanation, setExplanation] = useState({})
  const [whatIfScenario, setWhatIfScenario] = useState(null)
  const [explaining, setExplaining] = useState({})
  const [selectedInst, setSelectedInst] = useState(() => getSelectedInstitution())
  const [instPage, setInstPage] = useState(0)

  const severityLabels = {
    critical: t('sev.critical'),
    warning: t('sev.warning'),
    info: t('sev.info'),
  }

  async function load() {
    setLoading(true)
    try {
      const [d, a] = await Promise.all([getDashboard(), getAlerts({ resolved: false })])
      setDash(d)
      setAlerts(a.slice(0, 7))
      // Load predictions separately (non-blocking)
      try { const p = await client.get('/predictions').then(r => r.data); setPredictions(p) } catch {}
    } catch { /* backend offline */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Sync with institution switcher in TopBar
  useEffect(() => {
    function handler() {
      setSelectedInst(getSelectedInstitution())
      setInstPage(0)
    }
    window.addEventListener('ucar_inst_change', handler)
    return () => window.removeEventListener('ucar_inst_change', handler)
  }, [])

  async function handleExplain(id) {
    setExplaining((p) => ({ ...p, [id]: true }))
    try {
      const res = await explainAlert(id)
      setExplanation((p) => ({ ...p, [id]: res.explanation }))
    } finally {
      setExplaining((p) => ({ ...p, [id]: false }))
    }
  }

  async function handleResolve(id) {
    await resolveAlert(id)
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
      <div className="spinner" style={{ border: '3px solid #e2e8f0', borderTopColor: 'rgb(29,83,148)', width: '36px', height: '36px' }} />
      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{tx('Chargement du tableau de bord...', 'جاري تحميل لوحة القيادة...')}</p>
    </div>
  )

  const allInstitutions = dash?.institutions || []
  const displayInstitutions = selectedInst
    ? allInstitutions.filter((i) => i.id === selectedInst.id)
    : allInstitutions

  const totalPages = Math.ceil(displayInstitutions.length / PAGE_SIZE)
  const pagedInstitutions = displayInstitutions.slice(instPage * PAGE_SIZE, (instPage + 1) * PAGE_SIZE)

  const totalInst = selectedInst ? displayInstitutions.length : (dash?.total_institutions || 0)
  const activeAlerts = selectedInst
    ? (displayInstitutions[0]?.active_alerts || 0)
    : (dash?.active_alerts || 0)
  const avgSuccess = dash?.avg_success_rate || 0
  const totalStudents = selectedInst
    ? (displayInstitutions[0]?.student_capacity || 0)
    : TOTAL_STUDENTS_DISPLAY

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.35s ease both' }}>

      {/* AI Summary Banner */}
      <div style={S.banner}>
        <div style={S.bannerGlow} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', position: 'relative' }}>
          <div style={S.bannerIcon}><Sparkles size={20} /></div>
          <div>
            <p style={S.bannerTitle}>{tx('Synthèse IA — Réseau UCAR', 'ملخص الذكاء الاصطناعي - شبكة UCAR')}</p>
            <p style={S.bannerText}>
              {totalInst} {tx('institutions actives', 'مؤسسات نشطة')} · {totalStudents.toLocaleString('fr-FR')} {tx('étudiants suivis', 'طالب متابع')} · {tx('Taux de réussite moyen', 'معدل النجاح المتوسط')} <strong>{avgSuccess}%</strong> · {activeAlerts} {tx('alertes en attente', 'تنبيهات قيد الانتظار')}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={S.kpiGrid}>
        <StatCard icon={Building2} label={tx('Institutions actives', 'المؤسسات النشطة')} value={totalInst} sub={tx('Réseau UCAR complet', 'شبكة UCAR الكاملة')} color="rgb(29,83,148)" spark={mkSpark(totalInst)} />
        <StatCard icon={Users} label={tx('Étudiants suivis', 'الطلاب المتابعون')} value={(totalStudents / 1000).toFixed(1) + 'k'} sub={tx('Capacité totale', 'السعة الإجمالية')} color="#0891b2" spark={mkSpark(totalStudents)} />
        <StatCard icon={TrendingUp} label={tx('Taux de réussite moy.', 'متوسط معدل النجاح')} value={avgSuccess + '%'} sub={tx('vs réseau', 'مقارنة بالشبكة')} color="#059669" spark={mkSpark(avgSuccess)} delta={1.7} deltaUnit={tx('pts', 'نقطة')} />
        <StatCard icon={Bell} label={tx('Alertes actives', 'التنبيهات النشطة')} value={activeAlerts} sub={tx(`dont ${dash?.critical_alerts || 0} critiques`, `منها ${dash?.critical_alerts || 0} حرجة`)} color={activeAlerts > 3 ? '#dc2626' : '#f59e0b'} spark={mkSpark(activeAlerts + 2)} />
      </div>

      {/* Predictions Panel */}
      {predictions.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <Brain size={18} color="rgb(29,83,148)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{tx('Prévisions IA', 'تنبؤات الذكاء الاصطناعي')}</h3>
            <span style={{ padding: '2px 8px', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700, background: 'rgba(29,83,148,0.08)', color: 'rgb(29,83,148)' }}>{tx('Prédictif', 'تنبؤي')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {predictions.map((p) => {
              const scenarioMap = { pred_dropout: 'dropout', pred_budget: 'budget' }
              const scenario = scenarioMap[p.id]
              return (
                <PredictionCard
                  key={p.id}
                  pred={{ ...p, onSimulate: scenario ? () => setWhatIfScenario(scenario) : undefined }}
                  confidenceLabel={tx('confiance', 'ثقة')}
                  simulateLabel={tx('Simuler une intervention', 'محاكاة تدخل')}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom grid: institutions + alerts */}
      <div style={S.bottomGrid}>
        {/* Institutions table */}
        <div style={{ ...S.panel, flex: 1.6 }}>
          <div style={S.panelHeader}>
            <h3 style={S.panelTitle}>{tx('État des institutions', 'وضع المؤسسات')}</h3>
            <button style={S.refreshBtn} onClick={load}><RefreshCw size={14} /></button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {[tx('Institution', 'المؤسسة'), tx('Gouvernorat', 'الولاية'), tx('Étudiants', 'الطلاب'), tx('Alertes', 'التنبيهات'), tx('Score santé', 'مؤشر الصحة'), ''].map((h) => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagedInstitutions.map((inst) => (
                  <tr key={inst.id} style={S.tr}>
                    <td style={S.td}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>{inst.name_fr}</div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{inst.code}</div>
                    </td>
                    <td style={{ ...S.td, color: '#64748b', fontSize: '0.8rem' }}>{inst.governorate}</td>
                    <td style={{ ...S.td, fontWeight: 600, fontSize: '0.82rem' }}>{(inst.student_capacity || 0).toLocaleString('fr-FR')}</td>
                    <td style={S.td}>
                      {inst.active_alerts > 0
                        ? <span style={{ padding: '2px 8px', borderRadius: '99px', background: '#fef2f2', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700 }}>{inst.active_alerts}</span>
                        : <span style={{ color: '#22c55e', fontSize: '0.72rem' }}>✓ {tx('OK', 'سليم')}</span>
                      }
                    </td>
                    <td style={{ ...S.td, minWidth: '140px' }}>
                      <HealthBar score={inst.health_score || 50} />
                    </td>
                    <td style={S.td}>
                      <button style={S.detailBtn} onClick={() => navigate(`/institutions/${inst.id}`)}>
                        <ChevronRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 0', borderTop: '1px solid #f1f5f9', marginTop: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {instPage * PAGE_SIZE + 1}-{Math.min((instPage + 1) * PAGE_SIZE, displayInstitutions.length)} {tx('sur', 'من')} {displayInstitutions.length}
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  style={{ ...S.detailBtn, opacity: instPage === 0 ? 0.35 : 1 }}
                  disabled={instPage === 0}
                  onClick={() => setInstPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  style={{ ...S.detailBtn, opacity: instPage >= totalPages - 1 ? 0.35 : 1 }}
                  disabled={instPage >= totalPages - 1}
                  onClick={() => setInstPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Alerts feed */}
        <div style={{ ...S.panel, flex: 1, minWidth: '300px' }}>
          <div style={S.panelHeader}>
            <h3 style={S.panelTitle}>{tx('Alertes récentes', 'أحدث التنبيهات')}</h3>
            <button style={{ ...S.detailBtn, fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => navigate('/alerts')}>
              {tx('Voir tout', 'عرض الكل')} <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alerts.length === 0 && <p style={{ color: '#94a3b8', fontSize: '0.82rem', textAlign: 'center', padding: '32px' }}>✅ {tx('Aucune alerte active', 'لا توجد تنبيهات نشطة')}</p>}
            {alerts.map((a) => (
              <div key={a.id} style={S.alertCard}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <SeverityBadge severity={a.severity} labels={severityLabels} />
                      <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{a.institution_name}</span>
                    </div>
                    <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.4 }}>{a.title}</p>
                  </div>
                </div>
                {explanation[a.id] && (
                  <div style={{ marginTop: '8px', padding: '8px', background: '#f0f4f8', borderRadius: '6px', fontSize: '0.75rem', color: '#374151', lineHeight: 1.5 }}>
                    {explanation[a.id]}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button style={S.alertBtnExplain} onClick={() => handleExplain(a.id)} disabled={explaining[a.id]}>
                    {explaining[a.id] ? '...' : `🤖 ${tx('Expliquer', 'شرح')}`}
                  </button>
                  <button style={S.alertBtnResolve} onClick={() => handleResolve(a.id)}>
                    <CheckCircle size={12} /> {tx('Résoudre', 'حل')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {whatIfScenario && <WhatIfPanel scenario={whatIfScenario} onClose={() => setWhatIfScenario(null)} />}
    </div>
  )
}

const S = {
  banner: { background: 'linear-gradient(135deg, rgb(20,58,105) 0%, rgb(29,83,148) 60%, rgb(43,111,190) 100%)', borderRadius: '14px', padding: '20px 24px', position: 'relative', overflow: 'hidden' },
  bannerGlow: { position: 'absolute', top: '-40px', right: '-40px', width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' },
  bannerIcon: { width: '44px', height: '44px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 },
  bannerTitle: { color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' },
  bannerText: { color: 'white', fontSize: '0.9rem', lineHeight: 1.5 },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' },
  card: { background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px' },
  cardIcon: { width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cardValue: { fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.04em', lineHeight: 1 },
  cardLabel: { fontSize: '0.82rem', fontWeight: 600, color: '#374151' },
  cardSub: { fontSize: '0.72rem', color: '#94a3b8' },
  bottomGrid: { display: 'flex', gap: '20px', alignItems: 'flex-start' },
  panel: { background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' },
  panelHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' },
  panelTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' },
  refreshBtn: { padding: '5px', borderRadius: '6px', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', background: 'white' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '480px' },
  th: { padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f8fafc', transition: 'background 150ms', cursor: 'pointer' },
  td: { padding: '11px 12px', verticalAlign: 'middle' },
  detailBtn: { padding: '5px 8px', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', cursor: 'pointer', background: 'white', display: 'flex', alignItems: 'center' },
  alertCard: { padding: '12px', borderRadius: '10px', border: '1px solid #f1f5f9', background: '#fafbff' },
  alertBtnExplain: { padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.72rem', color: '#374151', cursor: 'pointer', fontFamily: 'Inter, sans-serif' },
  alertBtnResolve: { padding: '4px 10px', borderRadius: '6px', border: 'none', background: 'rgba(39,174,96,0.1)', fontSize: '0.72rem', color: '#16a34a', cursor: 'pointer', fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: '4px' },
  pageBtn: { width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'Inter, sans-serif', transition: 'all 150ms' },
  pageBtnActive: { background: 'rgb(29,83,148)', color: 'white', border: '1px solid rgb(29,83,148)' },
}
