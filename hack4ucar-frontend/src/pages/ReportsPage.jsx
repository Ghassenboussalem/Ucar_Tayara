import { useState, useEffect } from 'react'
import { getInstitutions, generateReport } from '../api/client'
import { FileText, Download, FileSpreadsheet, Loader2 } from 'lucide-react'

const PERIODS_ACADEMIC = ['S1_2025', 'S2_2025', 'S1_2026']
const PERIODS_FINANCE  = ['2025', '2026']

export default function ReportsPage() {
  const [institutions, setInstitutions] = useState([])
  const [instId, setInstId] = useState('')
  const [format, setFormat] = useState('pdf')
  const [period, setPeriod] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    getInstitutions().then((d) => {
      setInstitutions(d)
      if (d.length) setInstId(String(d[0].id))
    }).catch(() => {})
  }, [])

  const periods = format === 'excel' ? [...PERIODS_ACADEMIC, ...PERIODS_FINANCE] : [...PERIODS_ACADEMIC, ...PERIODS_FINANCE]

  async function handleGenerate() {
    if (!instId || !period) { setError('Veuillez sélectionner une institution et une période.'); return }
    setLoading(true); setSuccess(''); setError('')
    try {
      const res = await generateReport(parseInt(instId), period, format)
      const blob = new Blob([res.data], { type: res.headers['content-type'] })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const inst = institutions.find((i) => String(i.id) === instId)
      a.href = url
      a.download = `rapport_${inst?.code || instId}_${period}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      a.click()
      URL.revokeObjectURL(url)
      setSuccess(`✅ Rapport ${format.toUpperCase()} généré et téléchargé avec succès.`)
    } catch {
      setError('Erreur lors de la génération. Vérifiez que le backend est actif.')
    }
    setLoading(false)
  }

  const selectedInst = institutions.find((i) => String(i.id) === instId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeInUp 0.3s ease both' }}>
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={22} color="rgb(29,83,148)" /> Génération de rapports
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>Générez des rapports institutionnels PDF ou Excel avec synthèse IA</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Config form */}
        <div style={{ background: 'white', borderRadius: '14px', padding: '28px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>Configuration du rapport</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Institution</label>
            <select value={instId} onChange={(e) => setInstId(e.target.value)} style={S.select}>
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>{i.name_fr} ({i.code})</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Période</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} style={S.select}>
              <option value="">— Sélectionner —</option>
              <optgroup label="Semestriel">
                {PERIODS_ACADEMIC.map((p) => <option key={p} value={p}>{p.replace('_', ' – ')}</option>)}
              </optgroup>
              <optgroup label="Annuel">
                {PERIODS_FINANCE.map((p) => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Format</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { id: 'pdf', icon: FileText, label: 'PDF', sub: 'Synthèse IA incluse' },
                { id: 'excel', icon: FileSpreadsheet, label: 'Excel', sub: 'Données brutes' },
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

          {error && <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.8rem' }}>{error}</div>}
          {success && <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.8rem' }}>{success}</div>}

          <button onClick={handleGenerate} disabled={loading || !instId || !period} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'rgb(29,83,148)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif', opacity: (!instId || !period) ? 0.5 : 1, transition: 'opacity 150ms' }}>
            {loading ? <><Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Génération en cours…</> : <><Download size={16} /> Générer et télécharger</>}
          </button>
        </div>

        {/* Preview card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'linear-gradient(135deg, rgb(20,58,105), rgb(29,83,148))', borderRadius: '14px', padding: '24px', color: 'white' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.6, marginBottom: '8px' }}>Aperçu du rapport</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '4px' }}>{selectedInst?.name_fr || '—'}</div>
            <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>Période : {period || '—'} · Format : {format.toUpperCase()}</div>
          </div>

          <div style={{ background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', marginBottom: '12px' }}>Contenu du rapport</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: '🤖', title: 'Résumé exécutif IA', desc: 'Synthèse narrative générée par Claude', only: 'pdf' },
                { icon: '📊', title: 'KPIs académiques', desc: 'Réussite, abandon, présence, notes' },
                { icon: '💰', title: 'KPIs financiers', desc: 'Budget, exécution, coût par étudiant' },
                { icon: '👥', title: 'KPIs RH', desc: 'Effectifs, absentéisme, charge horaire' },
                { icon: '🚨', title: 'Alertes actives', desc: 'Liste des anomalies en cours' },
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
            💡 Le rapport PDF inclut une <strong>synthèse narrative générée par l'IA</strong> avec points forts, points d'attention et recommandations prioritaires.
          </div>
        </div>
      </div>
    </div>
  )
}

const S = {
  select: { padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'Inter,sans-serif', color: '#0f172a', background: 'white', outline: 'none', cursor: 'pointer', width: '100%' },
}
