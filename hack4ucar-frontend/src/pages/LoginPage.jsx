import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/client'
import { useLang } from '../contexts/LangContext'
import { setSelectedInstitution } from '../utils/institutionFilter'

export default function LoginPage() {
  const { lang, toggleLang } = useLang()
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await login(email, password)
      localStorage.setItem('ucar_token', data.access_token)
      localStorage.setItem('ucar_user', JSON.stringify({
        role: data.role,
        full_name: data.full_name,
        institution_id: data.institution_id,
      }))
      window.dispatchEvent(new Event('ucar_user_change'))
      setSelectedInstitution(null)
      navigate('/dashboard')
    } catch {
      setError(tx('Email ou mot de passe incorrect.', 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Background pattern */}
      <div style={styles.bgPattern} />

      {/* Left panel — branding */}
      <div style={styles.leftPanel}>
        <div style={styles.brandWrap}>
          <div style={styles.logoMark}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.15)" />
              <path d="M8 22 L16 10 L24 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <path d="M11 18 L21 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={styles.logoText}>UCAR Intelligence</span>
        </div>

        <div style={styles.heroContent}>
          <h1 style={styles.heroTitle}>
            {tx('La plateforme de pilotage universitaire de demain.', 'منصة قيادة جامعية للغد.')}
          </h1>
          <p style={styles.heroSub}>
            {tx('Centralisez, analysez et anticipez les données de 33 institutions — 30 000 étudiants, 3 000 personnels.', 'وحّد البيانات وحللها وتنبأ بمؤشرات 33 مؤسسة — 30,000 طالب و3,000 موظف.')}
          </p>

          <div style={styles.statGrid}>
            {[
              { value: '33', label: tx('Établissements', 'مؤسسة') },
              { value: '30k+', label: tx('Étudiants suivis', 'طلاب متابعون') },
              { value: '3k+', label: tx('Personnel', 'موظف') },
            ].map((s) => (
              <div key={s.label} style={styles.statCard}>
                <span style={styles.statValue}>{s.value}</span>
                <span style={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={styles.leftFooter}>{tx('Université de Carthage — HACK4UCAR 2025', 'جامعة قرطاج - HACK4UCAR 2025')}</p>
      </div>

      {/* Right panel — form */}
      <div style={styles.rightPanel}>
        <div style={styles.formCard}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button
              onClick={toggleLang}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1.5px solid #e2e8f0',
                background: 'white',
                color: '#374151',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {lang === 'fr' ? 'عربي' : 'FR'}
            </button>
          </div>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>{tx('Connexion', 'تسجيل الدخول')}</h2>
            <p style={styles.formSub}>{tx('Accédez à votre tableau de bord institutionnel', 'الوصول إلى لوحة القيادة المؤسسية')}</p>
          </div>

          {error && (
            <div style={styles.errorBanner}>
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>{tx('Adresse email', 'البريد الإلكتروني')}</label>
              <input
                id="email"
                type="email"
                placeholder="votre@ucar.rnu.tn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={styles.input}
                autoComplete="email"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>{tx('Mot de passe', 'كلمة المرور')}</label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.input}
                autoComplete="current-password"
              />
            </div>

            <button
              id="btn-login"
              type="submit"
              disabled={loading}
              style={styles.submitBtn}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span className="spinner" /> {tx('Connexion...', 'جار تسجيل الدخول...')}
                </span>
              ) : tx('Se connecter →', 'دخول ←')}
            </button>
          </form>

          <div style={styles.demoHint}>
            <p style={{ color: '#64748b', fontSize: '0.78rem', marginBottom: '6px', fontWeight: 600 }}>{tx('Comptes de démo :', 'حسابات تجريبية:')}</p>
            {[
              { email: 'president@ucar.rnu.tn',    role: tx('👑 Présidence UCAR', '👑 رئاسة UCAR') },
              { email: 'admin.fsegn@ucar.rnu.tn',  role: tx('🏛 Directeur FSEGN', '🏛 مدير FSEGN') },
              { email: 'admin.enstab@ucar.rnu.tn', role: tx('🏛 Directeur ENSTAB', '🏛 مدير ENSTAB') },
              { email: 'admin.essths@ucar.rnu.tn', role: tx('🏛 Directeur ESSTHS', '🏛 مدير ESSTHS') },
              { email: 'viewer.ihec@ucar.rnu.tn',  role: tx('👁 Observateur IHEC', '👁 مراقب IHEC') },
              { email: 'viewer.supcom@ucar.rnu.tn',role: tx('👁 Observateur SUPCOM', '👁 مراقب SUPCOM') },
            ].map((u) => (
              <button
                key={u.email}
                style={styles.demoBtn}
                onClick={() => { setEmail(u.email); setPassword('demo1234') }}
              >
                <span style={{ fontWeight: 600 }}>{u.email}</span>
                <span style={{ color: '#94a3b8' }}>— {u.role}</span>
              </button>
            ))}
            <p style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '6px' }}>{tx('Mot de passe universel : ', 'كلمة المرور الموحدة: ')}<code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>demo1234</code></p>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: 'Inter, sans-serif',
    position: 'relative',
    overflow: 'hidden',
  },
  bgPattern: {
    position: 'fixed',
    inset: 0,
    background: `
      radial-gradient(ellipse 80% 60% at 20% 50%, rgba(29, 83, 148, 0.06) 0%, transparent 70%),
      #f0f4f8
    `,
    zIndex: 0,
  },
  leftPanel: {
    width: '48%',
    background: 'linear-gradient(145deg, rgb(20, 58, 105) 0%, rgb(29, 83, 148) 50%, rgb(43, 111, 190) 100%)',
    padding: '48px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  brandWrap: {
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  logoMark: { display: 'flex' },
  logoText: {
    color: 'white', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em',
  },
  heroContent: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '24px' },
  heroTitle: {
    color: 'white',
    fontSize: '2.2rem',
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: '-0.03em',
    maxWidth: '420px',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: '1rem',
    lineHeight: 1.6,
    maxWidth: '380px',
  },
  statGrid: { display: 'flex', gap: '16px', marginTop: '8px' },
  statCard: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  statValue: { color: 'white', fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' },
  statLabel: { color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', fontWeight: 500 },
  leftFooter: { color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' },
  rightPanel: {
    width: '52%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    position: 'relative',
    zIndex: 1,
  },
  formCard: {
    width: '100%',
    maxWidth: '400px',
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
  },
  formHeader: { marginBottom: '28px' },
  formTitle: { fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.03em' },
  formSub: { color: '#64748b', marginTop: '6px', fontSize: '0.875rem' },
  errorBanner: {
    background: 'rgba(231, 76, 60, 0.08)',
    border: '1px solid rgba(231, 76, 60, 0.25)',
    color: '#c0392b',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '0.82rem', fontWeight: 600, color: '#374151' },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
    transition: 'border-color 150ms, box-shadow 150ms',
    fontFamily: 'Inter, sans-serif',
  },
  submitBtn: {
    marginTop: '8px',
    padding: '12px',
    background: 'rgb(29, 83, 148)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 150ms, transform 100ms',
    fontFamily: 'Inter, sans-serif',
    letterSpacing: '0.01em',
  },
  demoHint: {
    marginTop: '24px',
    padding: '14px',
    background: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  demoBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    padding: '4px 0',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    fontFamily: 'Inter, sans-serif',
    color: '#475569',
    textAlign: 'left',
    flexWrap: 'wrap',
    transition: 'color 100ms',
  },
}
