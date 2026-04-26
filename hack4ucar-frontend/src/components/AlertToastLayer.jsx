import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getRecentAlerts } from '../api/client'
import { Bell, X, AlertTriangle, Info, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../contexts/LangContext'

const POLL_MS = 8000

export default function AlertToastLayer() {
  const [toasts, setToasts] = useState([])
  const seenIds = useRef(new Set())
  const navigate = useNavigate()
  const { t, isRTL } = useLang()

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const alerts = await getRecentAlerts(20)
        if (cancelled) return
        const fresh = alerts.filter(
          (a) => !seenIds.current.has(a.id) && !a.is_resolved
        )
        if (fresh.length) {
          fresh.forEach((a) => seenIds.current.add(a.id))
          setToasts((prev) => [
            ...fresh.slice(0, 3).map((a) => ({ ...a, _ts: Date.now() })),
            ...prev,
          ].slice(0, 6))
        }
      } catch { /* offline / not authed */ }
    }

    // Seed seen IDs on mount so we only show truly new ones
    getRecentAlerts(50)
      .then((a) => a.forEach((x) => seenIds.current.add(x.id)))
      .catch(() => {})

    const timer = setInterval(poll, POLL_MS)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  // Auto-dismiss after 8 s
  useEffect(() => {
    if (!toasts.length) return
    const t = setTimeout(() => {
      setToasts((prev) => prev.slice(0, -1))
    }, 8000)
    return () => clearTimeout(t)
  }, [toasts])

  if (!toasts.length) return null

  const layerStyle = {
    ...styles.layer,
    right: isRTL ? 'auto' : '20px',
    left: isRTL ? '20px' : 'auto',
  }

  return createPortal(
    <div style={layerStyle}>
      {toasts.map((toast, i) => (
        <Toast
          key={toast.id}
          toast={toast}
          index={i}
          t={t}
          isRTL={isRTL}
          onDismiss={() => dismiss(toast.id)}
          onNavigate={() => { dismiss(toast.id); navigate('/alerts') }}
        />
      ))}
    </div>,
    document.body
  )
}

function Toast({ toast, index, onDismiss, onNavigate, t, isRTL }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50 + index * 120)
    return () => clearTimeout(t)
  }, [index])

  const { color, bg, icon: Icon } = severityStyle(toast.severity)

  return (
    <div
      style={{
        ...styles.toast,
        transform: visible ? 'translateX(0)' : (isRTL ? 'translateX(-420px)' : 'translateX(420px)'),
        opacity: visible ? 1 : 0,
        borderInlineStart: `4px solid ${color}`,
      }}
    >
      <div style={{ ...styles.toastIcon, background: bg }}>
        <Icon size={15} color={color} />
      </div>
      <div style={styles.toastBody}>
        <div style={styles.toastTitle}>{toast.title}</div>
        <div style={styles.toastDesc}>
          {toast.description?.slice(0, 80)}{toast.description?.length > 80 ? '…' : ''}
        </div>
        <div style={styles.toastMeta}>
          {domainLabel(toast.domain, t)} · {severityLabel(toast.severity, t)}
        </div>
      </div>
      <div style={styles.toastActions}>
        <button style={styles.toastNav} onClick={onNavigate} title={t('alert.view_alerts')}>
          <ChevronRight size={14} />
        </button>
        <button style={styles.toastClose} onClick={onDismiss} title={t('alert.close')}>
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

function severityStyle(severity) {
  if (severity === 'critical') return { color: '#dc2626', bg: '#fef2f2', icon: AlertTriangle }
  if (severity === 'warning')  return { color: '#d97706', bg: '#fffbeb', icon: Bell }
  return { color: '#2563eb', bg: '#eff6ff', icon: Info }
}

function domainLabel(d, t) {
  const m = {
    academic: t('domain.academic'),
    finance: t('domain.finance'),
    hr: t('domain.hr'),
    esg: t('domain.esg'),
    research: t('domain.research'),
    employment: t('domain.employment'),
    infrastructure: t('domain.infrastructure'),
    partnership: t('domain.partnership'),
  }
  return m[d] || d || t('domain.general')
}

function severityLabel(severity, t) {
  if (severity === 'critical') return t('sev.critical')
  if (severity === 'warning') return t('sev.warning')
  return t('sev.info')
}

const styles = {
  layer: {
    position: 'fixed',
    top: '80px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    pointerEvents: 'none',
    width: '380px',
  },
  toast: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '14px 14px 14px 16px',
    transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
    pointerEvents: 'all',
    cursor: 'default',
    minWidth: '320px',
  },
  toastIcon: {
    width: '32px', height: '32px',
    borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  toastBody: { flex: 1, minWidth: 0 },
  toastTitle: {
    fontWeight: 700,
    fontSize: '0.82rem',
    color: '#0f172a',
    lineHeight: 1.3,
    marginBottom: '3px',
  },
  toastDesc: {
    fontSize: '0.73rem',
    color: '#64748b',
    lineHeight: 1.4,
    marginBottom: '5px',
  },
  toastMeta: {
    fontSize: '0.68rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  toastActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flexShrink: 0,
  },
  toastNav: {
    width: '24px', height: '24px',
    borderRadius: '6px',
    background: '#f1f5f9',
    border: 'none',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#64748b',
    transition: 'background 150ms',
  },
  toastClose: {
    width: '24px', height: '24px',
    borderRadius: '6px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#94a3b8',
    transition: 'background 150ms',
  },
}
