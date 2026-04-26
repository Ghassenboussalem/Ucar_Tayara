import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getInstitutions, getInstitutionScores } from '../api/client'
import { Building2, ChevronRight, Search, Map } from 'lucide-react'
import { useLang } from '../contexts/LangContext'

function ScoreBadge({ score }) {
  if (score == null) return null
  const color = score >= 75 ? '#16a34a' : score >= 55 ? '#d97706' : '#dc2626'
  const bg = score >= 75 ? '#dcfce7' : score >= 55 ? '#fef3c7' : '#fee2e2'
  const label = score >= 75 ? '🟢' : score >= 55 ? '🟡' : '🔴'
  return (
    <span style={{ padding: '2px 8px', borderRadius: '6px', background: bg, color, fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
      {label} {score}/100
    </span>
  )
}

export default function InstitutionsPage() {
  const { lang } = useLang()
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  const navigate = useNavigate()
  const [institutions, setInstitutions] = useState([])
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([
      getInstitutions(),
      getInstitutionScores().catch(() => []),
    ]).then(([insts, scoreList]) => {
      setInstitutions(insts)
      const map = {}
      scoreList.forEach((s) => { map[s.id] = s })
      setScores(map)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = institutions.filter((i) =>
    i.name_fr.toLowerCase().includes(search.toLowerCase()) ||
    (i.code || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.governorate || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', animation: 'fadeInUp 0.3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={22} color="rgb(29,83,148)" /> {tx('Institutions', 'المؤسسات')}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
            {tx('Réseau UCAR', 'شبكة UCAR')} - {institutions.length} {tx('établissements', 'مؤسسة')}
          </p>
        </div>
        <button
          onClick={() => navigate('/map')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        >
          <Map size={15} color="rgb(29,83,148)" /> Voir la carte
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: '360px' }}>
        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tx('Rechercher par nom, code ou gouvernorat…', 'ابحث بالاسم أو الرمز أو الولاية...')}
          style={{ padding: '9px 12px 9px 36px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', fontFamily: 'Inter,sans-serif', width: '100%', outline: 'none', background: 'white' }}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '60px' }}>{tx('Chargement...', 'جاري التحميل...')}</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
          {filtered.map((inst) => (
            <div key={inst.id}
              onClick={() => navigate(`/institutions/${inst.id}`)}
              style={{ background: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', cursor: 'pointer', transition: 'box-shadow 150ms, transform 150ms', display: 'flex', flexDirection: 'column', gap: '12px' }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(29,83,148,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ width: '42px', height: '42px', background: 'rgba(29,83,148,0.08)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(29,83,148)', fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                  {(inst.code || '').slice(0, 2)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ScoreBadge score={scores[inst.id]?.health_score} />
                  {scores[inst.id]?.critical_alerts > 0 && (
                    <span style={{ padding: '2px 7px', borderRadius: '6px', background: '#fee2e2', color: '#dc2626', fontSize: '0.68rem', fontWeight: 700 }}>
                      ⚠ {scores[inst.id].critical_alerts}
                    </span>
                  )}
                  <ChevronRight size={16} style={{ color: '#cbd5e1' }} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{inst.name_fr}</div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '3px' }}>{inst.code}</div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {inst.governorate && (
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', fontSize: '0.7rem', fontWeight: 600 }}>📍 {inst.governorate}</span>
                )}
                {inst.type && (
                  <span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(29,83,148,0.06)', color: 'rgb(29,83,148)', fontSize: '0.7rem', fontWeight: 600 }}>{inst.type}</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>
                  👥 {(inst.student_capacity || 0).toLocaleString('fr-FR')} {tx('étudiants', 'طالب')}
                </span>
                {inst.director_name && (
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inst.director_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
