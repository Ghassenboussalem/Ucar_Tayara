import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, TrendingUp, TrendingDown, BarChart3, Activity, FlaskConical, ChevronRight } from 'lucide-react'
import ForecastChart from '../components/ForecastChart'
import RiskMatrix from '../components/RiskMatrix'
import WhatIfPanel from '../components/WhatIfPanel'
import { getInstitutions, getForecastAcademic, getForecastFinance, getRiskMatrix } from '../api/client'
import { useLang } from '../contexts/LangContext'

const FORECAST_CONFIGS = [
  {
    id: 'dropout',
    label: "Taux d'abandon",
    labelAr: 'معدل الانقطاع',
    domain: 'academic',
    kpi: 'dropout_rate',
    color: '#dc2626',
    unit: '%',
    badWhenUp: true,
    whatIf: 'dropout',
    description: "Prédit la progression du taux d'abandon sur les 2 prochains semestres.",
    descriptionAr: 'يتنبأ بتطور معدل الانقطاع خلال السداسيين القادمين.',
  },
  {
    id: 'success',
    label: 'Taux de réussite',
    labelAr: 'معدل النجاح',
    domain: 'academic',
    kpi: 'success_rate',
    color: 'rgb(29,83,148)',
    unit: '%',
    badWhenUp: false,
    description: "Prévision du taux de réussite moyen du réseau UCAR.",
    descriptionAr: 'توقع معدل النجاح المتوسط لشبكة UCAR.',
  },
  {
    id: 'budget',
    label: 'Exécution budgétaire',
    labelAr: 'تنفيذ الميزانية',
    domain: 'finance',
    kpi: 'budget_execution_rate',
    color: '#7c3aed',
    unit: '%',
    badWhenUp: true,
    whatIf: 'budget',
    description: "Détecte un risque de dépassement budgétaire avant la clôture de l'exercice.",
    descriptionAr: 'يكشف خطر تجاوز الميزانية قبل غلق السنة المالية.',
  },
]

const SCENARIO_TABS = [
  { id: 'dropout', label: "Taux d'abandon — EPT", labelAr: 'معدل الانقطاع - EPT', kpiLabel: '9.2% actuel → 10.4% prévu', kpiLabelAr: '9.2% حاليا → 10.4% متوقع' },
  { id: 'budget', label: 'Exécution budget — IHEC', labelAr: 'تنفيذ الميزانية - IHEC', kpiLabel: '88% actuel → 107% prévu', kpiLabelAr: '88% حاليا → 107% متوقع' },
]

export default function PredictiveAnalyticsPage() {
  const { lang } = useLang()
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  const navigate = useNavigate()
  const [institutions, setInstitutions] = useState([])
  const [selectedInstId, setSelectedInstId] = useState(null)
  const [forecasts, setForecasts] = useState({})
  const [riskData, setRiskData] = useState([])
  const [loading, setLoading] = useState({})
  const [activeTab, setActiveTab] = useState('forecasts')
  const [whatIfScenario, setWhatIfScenario] = useState(null)
  const [scenarioTab, setScenarioTab] = useState('dropout')

  useEffect(() => {
    getInstitutions().then((insts) => {
      setInstitutions(insts)
      if (insts.length) setSelectedInstId(insts[0].id)
    }).catch(() => {})

    getRiskMatrix().then(setRiskData).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedInstId) return
    FORECAST_CONFIGS.forEach(async (cfg) => {
      setLoading(prev => ({ ...prev, [cfg.id]: true }))
      try {
        let data
        if (cfg.domain === 'academic') {
          data = await getForecastAcademic(selectedInstId, cfg.kpi)
        } else if (cfg.domain === 'finance') {
          data = await getForecastFinance(selectedInstId, cfg.kpi)
        }
        if (data) setForecasts(prev => ({ ...prev, [cfg.id]: data }))
      } catch (e) {
        console.warn(`Forecast failed for ${cfg.id}:`, e.message)
      }
      setLoading(prev => ({ ...prev, [cfg.id]: false }))
    })
  }, [selectedInstId])

  const selectedInst = institutions.find(i => i.id === selectedInstId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.35s ease both' }}>

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Brain size={22} color="rgb(29,83,148)" /> {tx('Analytique prédictive', 'تحليلات تنبؤية')}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
            {tx('Prévisions Prophet · Matrice de risque · Simulation d\'interventions', 'توقعات Prophet - مصفوفة المخاطر - محاكاة التدخلات')}
          </p>
        </div>

        {/* Institution selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{tx('Institution', 'المؤسسة')} :</label>
          <select
            value={selectedInstId || ''}
            onChange={(e) => setSelectedInstId(Number(e.target.value))}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'Inter,sans-serif', color: '#0f172a', background: 'white', outline: 'none', cursor: 'pointer', minWidth: '220px' }}
          >
            {institutions.map(i => (
              <option key={i.id} value={i.id}>{i.code} — {i.name_fr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '4px', background: '#f8fafc', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[
          { id: 'forecasts', label: tx('Prévisions', 'توقعات'), icon: TrendingUp },
          { id: 'risk', label: tx('Matrice de risque', 'مصفوفة المخاطر'), icon: Activity },
          { id: 'whatif', label: tx('Simulation', 'محاكاة'), icon: FlaskConical },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px',
            borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif',
            fontSize: '0.82rem', fontWeight: activeTab === id ? 700 : 500,
            background: activeTab === id ? 'white' : 'transparent',
            color: activeTab === id ? 'rgb(29,83,148)' : '#64748b',
            boxShadow: activeTab === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 150ms',
          }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ── Forecast tab ── */}
      {activeTab === 'forecasts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {FORECAST_CONFIGS.map((cfg) => {
            const fc = forecasts[cfg.id]
            const isLoading = loading[cfg.id]
            return (
              <div key={cfg.id} style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cfg.color }} />
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{lang === 'ar' ? cfg.labelAr : cfg.label}</h3>
                      <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(29,83,148,0.08)', color: 'rgb(29,83,148)', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>Prophet · 80% IC</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{lang === 'ar' ? cfg.descriptionAr : cfg.description} · {selectedInst?.name_fr}</p>
                  </div>
                  {cfg.whatIf && (
                    <button onClick={() => setWhatIfScenario(cfg.whatIf)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: '1px solid rgba(29,83,148,0.2)', background: 'rgba(29,83,148,0.05)', color: 'rgb(29,83,148)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                      <FlaskConical size={13} /> {tx('Simuler une intervention', 'محاكاة تدخل')}
                    </button>
                  )}
                </div>
                {isLoading ? (
                  <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                    <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block', marginRight: '8px' }}>⟳</span> {tx('Calcul Prophet en cours...', 'جاري حساب Prophet...')}
                  </div>
                ) : fc ? (
                  <ForecastChart
                    data={fc.points}
                    color={cfg.color}
                    unit={cfg.unit}
                    label={cfg.label}
                    trend={fc.trend}
                    changePct={fc.change_pct}
                    confidence={fc.confidence}
                    lastActual={fc.last_actual}
                    lastForecast={fc.last_forecast}
                    lang={lang}
                  />
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.82rem', flexDirection: 'column', gap: '8px' }}>
                    <BarChart3 size={32} style={{ opacity: 0.3 }} />
                    {tx('Prévision non disponible — données insuffisantes ou erreur backend', 'التوقع غير متاح - البيانات غير كافية أو يوجد خطأ في الخادم')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Risk Matrix tab ── */}
      {activeTab === 'risk' && (
        <div style={{ background: 'white', borderRadius: '14px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} color="rgb(29,83,148)" /> {tx('Matrice de risque — Réseau UCAR', 'مصفوفة المخاطر - شبكة UCAR')}
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {tx("Probabilité de dégradation (basée sur la pente du taux d'abandon) × Impact (effectif étudiant). Calculé sur toutes les institutions actives.", 'احتمال التدهور (بناء على ميل معدل الانقطاع) × الأثر (عدد الطلبة). محسوب على جميع المؤسسات النشطة.')}
            </p>
          </div>
          <RiskMatrix
            data={riskData}
            onSelect={(d) => navigate(`/institutions/${d.id}`)}
            lang={lang}
          />
        </div>
      )}

      {/* ── What-If / Scenarios tab ── */}
      {activeTab === 'whatif' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Scenario selector tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {SCENARIO_TABS.map((t) => (
              <button key={t.id} onClick={() => setScenarioTab(t.id)} style={{
                padding: '8px 16px', borderRadius: '8px', border: `2px solid ${scenarioTab === t.id ? 'rgb(29,83,148)' : '#e2e8f0'}`,
                background: scenarioTab === t.id ? 'rgba(29,83,148,0.04)' : 'white',
                cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all 150ms',
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: scenarioTab === t.id ? 'rgb(29,83,148)' : '#374151' }}>{lang === 'ar' ? t.labelAr : t.label}</div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>{lang === 'ar' ? t.kpiLabelAr : t.kpiLabel}</div>
              </button>
            ))}
          </div>

          {/* Scenario comparison — A/B/C side by side */}
          <ScenarioComparison scenario={scenarioTab} />
        </div>
      )}

      {/* WhatIfPanel modal */}
      {whatIfScenario && <WhatIfPanel scenario={whatIfScenario} onClose={() => setWhatIfScenario(null)} />}
    </div>
  )
}

// Pre-computed scenarios from context/13-demo-data-strategy.md
const SCENARIOS_DATA = {
  dropout: {
    kpi: "Taux d'abandon — EPT",
    unit: '%',
    current: 9.2,
    baseline: { label: 'Sans intervention (mars 2026)', value: 10.4, confidence: null },
    interventions: [
      { label: 'Bourses accélérées', value: 8.1, delta: -2.3, confidence: 71, delay: '6–8 sem.', color: '#059669' },
      { label: '+50 places résidence', value: 9.3, delta: -1.1, confidence: 64, delay: '4–6 sem.', color: '#0891b2' },
      { label: 'Bourses + Résidence', value: 7.6, delta: -2.8, confidence: 62, delay: '6–8 sem.', color: '#7c3aed' },
      { label: 'Tout + 5 enseignants', value: 6.8, delta: -3.6, confidence: 55, delay: '8–12 sem.', color: 'rgb(29,83,148)' },
    ],
  },
  budget: {
    kpi: 'Exécution budgétaire — IHEC',
    unit: '%',
    current: 88,
    baseline: { label: 'Sans intervention (juin 2026)', value: 107, confidence: null },
    interventions: [
      { label: 'Gel recrutements RH', value: 96, delta: -11, confidence: 84, delay: 'Immédiat', color: '#059669' },
      { label: 'Réallocation infra 8%', value: 99, delta: -8, confidence: 78, delay: '1–2 sem.', color: '#0891b2' },
      { label: 'Les deux mesures', value: 91, delta: -16, confidence: 72, delay: 'Immédiat', color: '#7c3aed' },
    ],
  },
}

function ScenarioComparison({ scenario }) {
  const data = SCENARIOS_DATA[scenario]
  if (!data) return null
  const maxVal = Math.max(data.baseline.value, data.current, ...data.interventions.map(i => i.value)) * 1.05

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* A/B/C comparison cards — side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: `1fr repeat(${data.interventions.length}, 1fr)`, gap: '12px' }}>
        {/* Baseline */}
        <div style={{ padding: '16px', borderRadius: '12px', border: '2px solid #fecaca', background: '#fef2f2' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '6px' }}>Sans action</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', letterSpacing: '-0.04em' }}>{data.baseline.value}{data.unit}</div>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>{data.baseline.label}</div>
          <BarViz value={data.baseline.value} max={maxVal} color="#dc2626" />
        </div>

        {/* Interventions */}
        {data.interventions.map((intv, i) => (
          <div key={i} style={{ padding: '16px', borderRadius: '12px', border: `2px solid ${intv.color}30`, background: intv.color + '06' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: intv.color, textTransform: 'uppercase', marginBottom: '6px' }}>
              Scénario {String.fromCharCode(65 + i)}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: intv.color, letterSpacing: '-0.04em' }}>{intv.value}{data.unit}</div>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#374151', marginTop: '4px' }}>{intv.label}</div>
            <BarViz value={intv.value} max={maxVal} color={intv.color} />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
              <span style={{ padding: '2px 7px', borderRadius: '5px', background: '#dcfce7', color: '#16a34a', fontSize: '0.68rem', fontWeight: 700 }}>
                {intv.delta > 0 ? '+' : ''}{intv.delta}{data.unit}
              </span>
              <span style={{ padding: '2px 7px', borderRadius: '5px', background: 'rgba(29,83,148,0.08)', color: 'rgb(29,83,148)', fontSize: '0.68rem', fontWeight: 700 }}>
                🎯 {intv.confidence}%
              </span>
              <span style={{ padding: '2px 7px', borderRadius: '5px', background: '#fef9c3', color: '#a16207', fontSize: '0.68rem', fontWeight: 700 }}>
                ⏱ {intv.delay}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary table */}
      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Scénario</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Valeur prévue</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Variation</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Confiance</th>
              <th style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>Délai</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 16px', fontWeight: 600, color: '#dc2626' }}>Sans action</td>
              <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>{data.baseline.value}{data.unit}</td>
              <td style={{ padding: '10px 16px', textAlign: 'center', color: '#94a3b8' }}>—</td>
              <td style={{ padding: '10px 16px', textAlign: 'center', color: '#94a3b8' }}>—</td>
              <td style={{ padding: '10px 16px', textAlign: 'center', color: '#94a3b8' }}>—</td>
            </tr>
            {data.interventions.map((intv, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: intv.color }}>
                  Scénario {String.fromCharCode(65 + i)} — {intv.label}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 700, color: intv.color }}>{intv.value}{data.unit}</td>
                <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '5px', background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>
                    {intv.delta}{data.unit}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>{intv.confidence}%</td>
                <td style={{ padding: '10px 16px', textAlign: 'center', color: '#64748b' }}>{intv.delay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BarViz({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ marginTop: '10px', height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 600ms ease' }} />
    </div>
  )
}
