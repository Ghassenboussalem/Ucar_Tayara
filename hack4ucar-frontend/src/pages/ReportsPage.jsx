import { useState, useEffect } from 'react'
import { getInstitutions, generateReport } from '../api/client'
import { FileText, Download, FileSpreadsheet, Loader2, Clock, Trash2 } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

const PERIODS_ACADEMIC = ['S1_2025', 'S2_2025', 'S1_2026']
const PERIODS_FINANCE  = ['2025', '2026']

const REPORT_HISTORY_KEY = 'ucar_report_history'

function getHistory() {
  try { return JSON.parse(localStorage.getItem(REPORT_HISTORY_KEY) || '[]') } catch { return [] }
}
function saveHistory(h) {
  localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(h.slice(0, 10)))
}

export default function ReportsPage() {
  const { lang, dateLocale } = useLang()
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  const [institutions, setInstitutions] = useState([])
  const [instId, setInstId] = useState('')
  const [format, setFormat] = useState('pdf')
  const [period, setPeriod] = useState('')
  const [reportLang, setReportLang] = useState('fr')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useState(getHistory())

  useEffect(() => {
    getInstitutions().then((d) => {
      setInstitutions(d)
      if (d.length) setInstId(String(d[0].id))
    }).catch(() => {})
  }, [])

  async function handleGenerate() {
    if (!instId || !period) { setError(tx('Veuillez sélectionner une institution et une période.', 'يرجى اختيار المؤسسة والفترة.')); return }
    setLoading(true); setSuccess(''); setError('')
    try {
      const res = await generateReport(parseInt(instId), period, format, reportLang)
      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const inst = institutions.find((i) => String(i.id) === instId)
      const filename = `${lang === 'ar' ? 'report' : 'rapport'}_${inst?.code || instId}_${period}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      a.href = url; a.download = filename; a.click()
      URL.revokeObjectURL(url)
      setSuccess(`✅ ${tx('Rapport', 'تقرير')} ${format.toUpperCase()} ${tx('généré et téléchargé.', 'تم إنشاؤه وتنزيله.')}`)

      // Save to history
      const entry = {
        id: Date.now(),
        institution_code: inst?.code || instId,
        institution_name: inst?.name_fr || '',
        period,
        format: format.toUpperCase(),
        filename,
        generated_at: new Date().toISOString(),
      }
      const newHistory = [entry, ...history]
      setHistory(newHistory)
      saveHistory(newHistory)
    } catch {
      setError(tx('Erreur lors de la génération. Vérifiez que le backend est actif.', 'خطأ أثناء إنشاء التقرير. تحقق من أن الخادم الخلفي يعمل.'))
    }
    setLoading(false)
  }

  function clearHistory() {
    setHistory([])
    localStorage.removeItem(REPORT_HISTORY_KEY)
  }

  const selectedInst = institutions.find((i) => String(i.id) === instId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.3s ease both' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={22} color="rgb(29,83,148)" /> {tx('Génération de rapports', 'إنشاء التقارير')}
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>{tx('Générez des rapports institutionnels PDF ou Excel avec synthèse IA', 'أنشئ تقارير مؤسساتية PDF أو Excel مع ملخص بالذكاء الاصطناعي')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Config form */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{tx('Configuration du rapport', 'إعداد التقرير')}</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{tx('Institution', 'المؤسسة')}</label>
            <select value={instId} onChange={(e) => setInstId(e.target.value)} style={S.select}>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.name_fr} ({i.code})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{tx('Période', 'الفترة')}</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={S.select}>
              <option value="">- {tx('Sélectionner', 'اختر')} -</option>
              <optgroup label={tx('Semestriel', 'فصلي')}>
                {PERIODS_ACADEMIC.map((p) => <option key={p} value={p}>{p.replace('_', ' – ')}</option>)}
              </optgroup>
              <optgroup label={tx('Annuel', 'سنوي')}>
                {PERIODS_FINANCE.map((p) => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{tx('Format', 'الصيغة')}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { id: 'pdf', icon: FileText, label: 'PDF', sub: tx('Synthèse IA incluse', 'يتضمن ملخص الذكاء الاصطناعي') },
                { id: 'excel', icon: FileSpreadsheet, label: 'Excel', sub: tx('Données brutes', 'بيانات خام') },
              ].map((f) => (
                <div key={f.id} onClick={() => setFormat(f.id)}
                  style={{ flex: 1, padding: '14px', borderRadius: '10px', border: `2px solid ${format === f.id ? 'rgb(29,83,148)' : '#e2e8f0'}`, background: format === f.id ? 'rgba(29,83,148,0.04)' : 'white', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 150ms' }}>
                  <f.icon size={22} color={format === f.id ? 'rgb(29,83,148)' : '#94a3b8'} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: format === f.id ? 'rgb(29,83,148)' : '#374151' }}>{f.label}</span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{f.sub}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>{tx('Langue du rapport', 'لغة التقرير')}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { id: 'fr', label: 'Français', flag: '🇫🇷' },
                { id: 'ar', label: 'عربي',     flag: '🇹🇳' },
              ].map((l) => (
                <div key={l.id} onClick={() => setReportLang(l.id)}
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: `2px solid ${reportLang === l.id ? 'rgb(29,83,148)' : '#e2e8f0'}`, background: reportLang === l.id ? 'rgba(29,83,148,0.04)' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 150ms' }}>
                  <span style={{ fontSize: '1.1rem' }}>{l.flag}</span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: reportLang === l.id ? 'rgb(29,83,148)' : '#374151' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.8rem' }}>{error}</div>}
          {success && <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.8rem' }}>{success}</div>}

          <button onClick={handleGenerate} disabled={loading || !instId || !period} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgb(29,83,148)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', opacity: (!instId || !period) ? 0.5 : 1, transition: 'opacity 150ms' }}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> {tx('Génération en cours...', 'جار الإنشاء...')}</> : <><Download size={16} /> {tx('Générer et télécharger', 'إنشاء وتنزيل')}</>}
          </button>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgb(20,58,105), rgb(29,83,148))', borderRadius: '14px', padding: '24px', color: 'white' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginBottom: '8px' }}>{tx('Aperçu du rapport', 'معاينة التقرير')}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>{selectedInst?.name_fr || '—'}</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>{tx('Période', 'الفترة')} : {period || '—'} · {tx('Format', 'الصيغة')} : {format.toUpperCase()} · {reportLang === 'ar' ? '🇹🇳 عربي' : '🇫🇷 Français'}</div>
          </div>

          <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>{tx('Contenu du rapport', 'محتوى التقرير')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '🤖', title: tx('Résumé exécutif IA', 'ملخص تنفيذي بالذكاء الاصطناعي'), desc: tx('Synthèse narrative générée par Claude', 'ملخص سردي مولد بواسطة Claude'), only: 'pdf' },
                { icon: '📊', title: tx('KPIs académiques', 'مؤشرات أكاديمية'), desc: tx('Réussite, abandon, présence, notes', 'النجاح والانقطاع والحضور والمعدلات') },
                { icon: '💰', title: tx('KPIs financiers', 'مؤشرات مالية'), desc: tx('Budget, exécution, coût par étudiant', 'الميزانية والتنفيذ والكلفة لكل طالب') },
                { icon: '👥', title: tx('KPIs RH', 'مؤشرات الموارد البشرية'), desc: tx('Effectifs, absentéisme, charge horaire', 'الطاقم والغياب والعبء الساعي') },
                { icon: '🚨', title: tx('Alertes actives', 'تنبيهات نشطة'), desc: tx('Liste des anomalies en cours', 'قائمة الشذوذ الحالية') },
              ].map((item) => (
                (!item.only || item.only === format) && (
                  <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px', borderRadius: '8px', background: '#f8fafc' }}>
                    <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{item.title}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(29,83,148,0.04)', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(29,83,148,0.12)', fontSize: '0.78rem', color: '#374151', lineHeight: 1.6 }}>
            💡 {tx("Le rapport PDF inclut une ", 'يتضمن تقرير PDF ')}<strong>{tx("synthèse narrative générée par l'IA", 'ملخصا سرديا مولدا بالذكاء الاصطناعي')}</strong>{tx(' avec points forts, points d\'attention et recommandations prioritaires.', ' مع نقاط القوة ونقاط الانتباه والتوصيات ذات الأولوية.')}
          </div>
        </div>
      </div>

      {/* Report History (P2-9) */}
      {history.length > 0 && (
        <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} color="rgb(29,83,148)" />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{tx('Rapports récents', 'التقارير الأخيرة')}</h3>
              <span style={{ padding: '2px 8px', borderRadius: '99px', background: 'rgba(29,83,148,0.08)', color: 'rgb(29,83,148)', fontSize: '0.68rem', fontWeight: 700 }}>{history.length}</span>
            </div>
            <button onClick={clearHistory} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.72rem', color: '#94a3b8', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
              <Trash2 size={12} /> {tx('Effacer', 'مسح')}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #f1f5f9', background: '#fafbff' }}>
                {entry.format === 'PDF'
                  ? <FileText size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                  : <FileSpreadsheet size={18} color="#059669" style={{ flexShrink: 0 }} />
                }
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {entry.institution_name || entry.institution_code}
                    <span style={{ marginLeft: '6px', padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', fontSize: '0.68rem', fontWeight: 700, color: '#64748b' }}>{entry.period}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>
                    {new Date(entry.generated_at).toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 700, background: entry.format === 'PDF' ? '#fef2f2' : '#f0fdf4', color: entry.format === 'PDF' ? '#dc2626' : '#059669' }}>
                  {entry.format}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  select: { padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'Inter,sans-serif', color: '#0f172a', background: 'white', outline: 'none', cursor: 'pointer', width: '100%' },
}
