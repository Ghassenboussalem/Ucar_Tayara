import { useState } from 'react'
import { X, FlaskConical, TrendingDown, Zap, ChevronRight } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

// Pre-computed scenarios from context/13-demo-data-strategy.md
const SCENARIOS = {
  dropout: {
    title: "Taux d'abandon — EPT",
    current: 9.2,
    unit: '%',
    baseline_forecast: 10.4,
    baseline_label: 'Sans intervention (mars 2026)',
    interventions: [
      {
        id: 'scholarship',
        label: 'Réduire délai bourses (38j → 10j)',
        result: 8.1,
        delta: -2.3,
        confidence: 71,
        delay: '6-8 semaines',
        detail: 'Accélérer le traitement des 67 dossiers de bourse en attente. Réduction du stress financier étudiant.',
      },
      {
        id: 'housing',
        label: 'Ajouter 50 places en résidence',
        result: 9.3,
        delta: -1.1,
        confidence: 64,
        delay: '4-6 semaines',
        detail: "18 places disponibles à l'INSAT. Convention d'hébergement d'urgence avec résidence partenaire.",
      },
      {
        id: 'both',
        label: 'Les deux interventions combinées',
        result: 7.6,
        delta: -2.8,
        confidence: 62,
        delay: '6-8 semaines',
        detail: 'Effet combiné : réduction significative du stress financier + résolution de la pression résidentielle.',
      },
      {
        id: 'all',
        label: 'Tout + recruter 5 enseignants',
        result: 6.8,
        delta: -3.6,
        confidence: 55,
        delay: '8-12 semaines',
        detail: 'Impact maximal. Recrutement permettant de ramener la charge enseignante sous le seuil réglementaire.',
      },
    ],
  },
  budget: {
    title: "Exécution budgétaire — IHEC",
    current: 88,
    unit: '%',
    baseline_forecast: 107,
    baseline_label: 'Sans intervention (juin 2026) — Dépassement',
    interventions: [
      {
        id: 'freeze_hr',
        label: 'Geler les recrutements RH',
        result: 96,
        delta: -11,
        confidence: 84,
        delay: 'Immédiat',
        detail: "Économie estimée : 180 000 TND/mois. Gel des postes non essentiels jusqu'en juin.",
      },
      {
        id: 'realloc',
        label: 'Réallouer 8% budget infrastructure',
        result: 99,
        delta: -8,
        confidence: 78,
        delay: '1-2 semaines',
        detail: 'Transfert du budget infrastructure non consommé vers réserve de contingence.',
      },
      {
        id: 'both_budget',
        label: 'Les deux mesures combinées',
        result: 91,
        delta: -16,
        confidence: 72,
        delay: 'Immédiat',
        detail: 'Combinaison des deux mesures. Budget stabilisé dans les limites avec marge de sécurité.',
      },
    ],
  },
}

export default function WhatIfPanel({ scenario = 'dropout', onClose }) {
  const { lang } = useLang()
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  const data = SCENARIOS[scenario] || SCENARIOS.dropout
  const [selected, setSelected] = useState(null)
  const active = selected != null ? data.interventions[selected] : null

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={S.headerIcon}><FlaskConical size={18} /></div>
            <div>
              <div style={S.headerTitle}>{tx("Simulation d'impact", 'محاكاة الأثر')}</div>
              <div style={S.headerSub}>{data.title}</div>
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Current state */}
        <div style={S.stateRow}>
          <div style={S.stateBox}>
            <div style={S.stateLabel}>{tx('Valeur actuelle', 'القيمة الحالية')}</div>
            <div style={S.stateValue}>{data.current}{data.unit}</div>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '1.4rem', display: 'flex', alignItems: 'center' }}>→</div>
          <div style={{ ...S.stateBox, borderColor: '#fecaca', background: '#fef2f2' }}>
            <div style={S.stateLabel}>{data.baseline_label}</div>
            <div style={{ ...S.stateValue, color: '#dc2626' }}>{data.baseline_forecast}{data.unit} <span style={{ fontSize: '0.8rem' }}>↑</span></div>
          </div>
        </div>

        {/* Interventions */}
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <Zap size={13} style={{ display: 'inline', verticalAlign: '-2px', marginRight: '4px' }} />
            {tx('Interventions disponibles', 'التدخلات المتاحة')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.interventions.map((intv, idx) => (
              <button
                key={intv.id}
                style={{ ...S.interventionBtn, ...(selected === idx ? S.interventionBtnActive : {}) }}
                onClick={() => setSelected(selected === idx ? null : idx)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: selected === idx ? '2px solid rgb(29,83,148)' : '2px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selected === idx && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgb(29,83,148)' }} />}
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', textAlign: 'left' }}>{intv.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#dcfce7', color: '#16a34a', fontSize: '0.72rem', fontWeight: 700 }}>
                    {intv.delta > 0 ? '+' : ''}{intv.delta}{data.unit}
                  </span>
                  <ChevronRight size={14} style={{ color: '#94a3b8' }} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Result panel */}
        {active && (
          <div style={S.resultPanel}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 600, textTransform: 'uppercase' }}>{tx('Résultat simulé', 'النتيجة المتوقعة')}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', letterSpacing: '-0.04em' }}>
                  {active.result}{data.unit}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={S.resultTag}>
                  <TrendingDown size={12} /> {active.delta > 0 ? '+' : ''}{active.delta}{data.unit} {tx('vs baseline', 'مقارنة بخط الأساس')}
                </div>
                <div style={{ ...S.resultTag, background: 'rgba(29,83,148,0.08)', color: 'rgb(29,83,148)' }}>
                  🎯 {tx('Confiance', 'الثقة')}: {active.confidence}%
                </div>
                <div style={{ ...S.resultTag, background: '#fef9c3', color: '#a16207' }}>
                  ⏱ {tx("Délai d'effet", 'مدة التأثير')}: {active.delay}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.6, background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              💡 {active.detail}
            </div>

            {/* Comparison bar */}
            <div style={{ marginTop: '14px' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, marginBottom: '6px' }}>{tx('COMPARAISON VISUELLE', 'مقارنة مرئية')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <CompBar label={tx('Sans action', 'بدون إجراء')} value={data.baseline_forecast} max={Math.max(data.baseline_forecast, data.current) * 1.1} color="#dc2626" unit={data.unit} />
                <CompBar label={tx('Avec intervention', 'مع تدخل')} value={active.result} max={Math.max(data.baseline_forecast, data.current) * 1.1} color="#059669" unit={data.unit} />
                <CompBar label={tx('Actuel', 'الحالي')} value={data.current} max={Math.max(data.baseline_forecast, data.current) * 1.1} color="rgb(29,83,148)" unit={data.unit} />
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={S.footer}>
          <button style={S.footerBtnSecondary} onClick={onClose}>{tx('Fermer', 'إغلاق')}</button>
          {active && (
            <button style={S.footerBtnPrimary}>
              📄 {tx("Générer rapport d'impact", 'إنشاء تقرير الأثر')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function CompBar({ label, value, max, color, unit }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '110px', fontSize: '0.7rem', color: '#64748b', fontWeight: 600, textAlign: 'right' }}>{label}</div>
      <div style={{ flex: 1, height: '18px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 600ms ease' }} />
        <span style={{ position: 'absolute', right: '6px', top: '1px', fontSize: '0.68rem', fontWeight: 700, color: '#374151' }}>{value}{unit}</span>
      </div>
    </div>
  )
}

const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    animation: 'fadeInUp 0.2s ease both',
  },
  modal: {
    background: 'white', borderRadius: '16px', width: '580px', maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 25px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  headerIcon: {
    width: '40px', height: '40px', borderRadius: '10px',
    background: 'linear-gradient(135deg, rgb(20,58,105), rgb(29,83,148))',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
  },
  headerTitle: { fontSize: '1rem', fontWeight: 800, color: '#0f172a' },
  headerSub: { fontSize: '0.78rem', color: '#64748b' },
  closeBtn: {
    padding: '6px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white',
    color: '#64748b', cursor: 'pointer', display: 'flex',
  },
  stateRow: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px',
  },
  stateBox: {
    flex: 1, padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc',
  },
  stateLabel: { fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' },
  stateValue: { fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' },
  interventionBtn: {
    display: 'flex', alignItems: 'center', padding: '10px 12px', borderRadius: '8px',
    border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer',
    transition: 'all 150ms', fontFamily: 'Inter, sans-serif', width: '100%',
  },
  interventionBtnActive: {
    border: '2px solid rgb(29,83,148)', background: 'rgba(29,83,148,0.03)',
  },
  resultPanel: {
    margin: '0 24px 16px', padding: '18px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #bbf7d0',
  },
  resultTag: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
    background: 'rgba(5,150,105,0.1)', color: '#059669',
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px',
    borderTop: '1px solid #f1f5f9',
  },
  footerBtnSecondary: {
    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
    background: 'white', color: '#64748b', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  },
  footerBtnPrimary: {
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    background: 'rgb(29,83,148)', color: 'white', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
  },
}
