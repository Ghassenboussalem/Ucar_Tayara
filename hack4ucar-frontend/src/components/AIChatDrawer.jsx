import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Send, Sparkles, RotateCcw, ChevronRight, Database, FileText, BarChart2, Bell, Building2, LayoutDashboard, Wrench } from 'lucide-react'
import { sendChat, ingestPdfs } from '../api/client'
import { X, Send, Sparkles, RotateCcw, Loader2 } from 'lucide-react'
import { sendChat } from '../api/client'

const SUGGESTED = [
  "Quelles institutions ont des alertes critiques en ce moment ?",
  "Compare les taux de réussite de toutes les institutions et dis-moi qui est en tête",
  "Prévis le taux d'abandon du réseau pour S2 2026 avec Prophet",
  "Quelle est la réglementation sur les examens et les rattrapages ?",
  "Donne-moi un diagnostic stratégique de l'INSAT avec recommandations",
  "Quelle institution a le pire absentéisme RH et pourquoi c'est risqué ?",
]

const PAGE_ICONS = {
  dashboard: LayoutDashboard,
  institutions: Building2,
  institution_detail: Building2,
  alerts: Bell,
  reports: FileText,
  analytics: BarChart2,
}

const TOOL_LABELS = {
  search_knowledge_base: { label: 'Base documentaire', icon: FileText },
  get_institutions_list: { label: 'Liste des institutions', icon: Building2 },
  get_institution_kpis: { label: 'KPIs institution', icon: BarChart2 },
  get_alerts: { label: 'Alertes', icon: Bell },
  get_network_stats: { label: 'Stats réseau', icon: Database },
  navigate_to_page: { label: 'Navigation', icon: ChevronRight },
}

const AGENT_META = {
  AlertInvestigatorAgent: { label: 'Investigateur Alertes', color: '#dc2626' },
  ForecastAgent:          { label: 'Prévisions', color: '#7c3aed' },
  BenchmarkAgent:         { label: 'Benchmark', color: '#0891b2' },
  StrategicAdvisorAgent:  { label: 'Conseiller Stratégique', color: '#059669' },
  ToolUseAgent:           { label: 'Agent Données', color: 'rgb(29,83,148)' },
}

function ToolBadge({ tool }) {
  const meta = TOOL_LABELS[tool] || { label: tool, icon: Wrench }
  const Icon = meta.icon
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 7px', borderRadius: '99px', background: 'rgba(29,83,148,0.08)', color: 'rgb(29,83,148)', fontSize: '0.68rem', fontWeight: 600 }}>
      <Icon size={10} />
      {meta.label}
    </span>
  )
}

function NavButton({ navigation, onClick }) {
  if (!navigation) return null
  const Icon = PAGE_ICONS[navigation.page] || ChevronRight
  return (
    <div style={{ marginTop: '10px', padding: '10px 12px', background: 'rgba(29,83,148,0.05)', border: '1.5px solid rgba(29,83,148,0.2)', borderRadius: '10px' }}>
      <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '6px', lineHeight: 1.4 }}>
        {navigation.reason}
      </p>
      <button
        onClick={onClick}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'rgb(29,83,148)', color: 'white', border: 'none', borderRadius: '7px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
      >
        <Icon size={13} />
        Aller à la page
        <ChevronRight size={12} />
      </button>
    </div>
  )
}

function Message({ msg, onNavigate }) {
  const isUser = msg.role === 'user'
  const agentMeta = !isUser && msg.agent_used ? (AGENT_META[msg.agent_used] || { label: msg.agent_used, color: '#64748b' }) : null

  return (
    <div style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start', gap: '8px' }}>
      {!isUser && (
        <div style={{ width: '26px', height: '26px', background: agentMeta ? agentMeta.color : 'rgb(29,83,148)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0, marginTop: '2px' }}>
          <Sparkles size={12} />
        </div>
      )}
      <div style={{ maxWidth: '83%', display: 'flex', flexDirection: 'column', gap: '5px' }}>

        {/* Agent badge */}
        {agentMeta && (
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: agentMeta.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            🤖 {agentMeta.label}
          </span>
        )}

        {/* Tool activity row */}
        {!isUser && msg.actions && msg.actions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {msg.actions.map((t, i) => <ToolBadge key={i} tool={t} />)}
          </div>
        )}

        {/* Bubble */}
        <div style={{
          padding: '9px 13px',
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          fontSize: '0.82rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...(isUser
            ? { background: 'rgb(29,83,148)', color: 'white' }
            : msg.blocked
              ? { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
              : { background: '#f0f4f8', color: '#1a1a2e', border: '1px solid #e2e8f0' }),
        }}>
          {msg.loading
            ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8' }}>
                <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</span>
                Analyse en cours…
              </span>
            : msg.blocked
              ? `🛡️ ${msg.content}`
              : msg.content}
        </div>

        {/* Navigation button */}
        {!isUser && msg.navigation && (
          <NavButton navigation={msg.navigation} onClick={() => onNavigate(msg.navigation.route)} />
        )}
      </div>
    </div>
  )
}

export default function AIChatDrawer({ open, onClose }) {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Bonjour ! Je suis UCAR Intelligence — votre assistant IA avec accès complet aux données et documents du réseau.\n\nJe peux interroger les KPIs de chaque institution, analyser les alertes, chercher dans les textes réglementaires et vous guider vers les bonnes pages.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ingesting, setIngesting] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Build history from current messages (exclude loading placeholders)
  function buildHistory() {
    return messages
      .filter((m) => !m.loading && m.content)
      .map((m) => ({ role: m.role, content: m.content }))
  }

  async function handleSend(text) {
    const question = (text || input).trim()
    if (!question || loading) return
    setInput('')

    const placeholder = { role: 'assistant', content: '', loading: true }
    setMessages((prev) => [...prev, { role: 'user', content: question }, placeholder])
    setLoading(true)

    try {
      const history = buildHistory()
      const res = await sendChat(question, history)
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: res.response,
          navigation: res.navigation || null,
          actions: res.actions || [],
          agent_used: res.agent_used || null,
          blocked: res.blocked || false,
        }
        return copy
      })
    } catch {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'Erreur de connexion. Vérifiez que le backend est actif.',
        }
        return copy
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleIngestPdfs() {
    setIngesting(true)
    try {
      const res = await ingestPdfs()
      let content
      if (res.errors?.length && res.ingested === 0 && res.total_docs === 0) {
        // RAG deps missing or directory empty
        content = `⚠️ Base documentaire indisponible\n${res.message || ''}\n${res.errors.join('\n')}\n\nPour activer le RAG :\n  pip install chromadb sentence-transformers pypdf\nPuis déposez vos PDFs dans D:\\Ucar_dataset\\rag_dataset\\`
      } else {
        content = `Base documentaire mise à jour ✅\n- ${res.ingested} nouveaux fragments indexés\n- ${res.skipped} déjà présents\n- ${res.total_docs} fragments au total${res.errors?.length ? `\n⚠️ Fichiers ignorés: ${res.errors.join(', ')}` : ''}`
      }
      setMessages((prev) => [...prev, { role: 'assistant', content }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: "Erreur de connexion au backend. Vérifiez que le serveur est actif." }])
    } finally {
      setIngesting(false)
    }
  }

  function handleReset() {
    setMessages([{
      role: 'assistant',
      content: "Conversation réinitialisée. Comment puis-je vous aider ?",
    }])
  }

  function handleNavigate(route) {
    navigate(route)
    onClose()
  }

  const showSuggested = messages.length <= 1

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 99 }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, width: '440px', height: '100vh',
        background: 'white', boxShadow: '-4px 0 40px rgba(0,0,0,0.14)',
        zIndex: 100, display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)',
      }}>

        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgb(20,58,105)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ color: 'white', fontWeight: 700, fontSize: '0.88rem' }}>UCAR Intelligence IA</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem', marginTop: '1px' }}>
                Agent · RAG · Base de données
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              title="Indexer les PDFs"
              onClick={handleIngestPdfs}
              disabled={ingesting}
              style={{ ...S.iconBtn, opacity: ingesting ? 0.5 : 1 }}
            >
              <Database size={13} />
            </button>
            <button title="Réinitialiser" onClick={handleReset} style={S.iconBtn}>
              <RotateCcw size={13} />
            </button>
            <button onClick={onClose} style={S.iconBtn}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Suggested prompts */}
        {showSuggested && (
          <div style={{ padding: '12px 14px 0', flexShrink: 0 }}>
            <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              Suggestions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {SUGGESTED.map((s) => (
                <button key={s} style={S.chip} onClick={() => handleSend(s)}>{s}</button>
              ))}
      {/* Messages */}
      <div style={S.messages}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <div key={i} style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px' }}>
              {!isUser && <div style={S.aiAvatar}><Sparkles size={12} /></div>}
              <div style={{ ...S.bubble, ...(isUser ? S.bubbleUser : S.bubbleAI) }}>
                {msg.loading ? <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> Analyse en cours…</span> : msg.content}
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} onNavigate={handleNavigate} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{ padding: '12px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', alignItems: 'flex-end', flexShrink: 0, background: '#fafbff' }}>
          <textarea
            ref={inputRef}
            style={{ ...S.chatInput, resize: 'none', minHeight: '38px', maxHeight: '100px', overflowY: 'auto' }}
            placeholder="Posez votre question…"
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = e.target.scrollHeight + 'px'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
            }}
            disabled={loading}
          />
          <button
            style={{ ...S.sendBtn, opacity: (!input.trim() || loading) ? 0.45 : 1, flexShrink: 0 }}
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </>
  )
}

const S = {
  iconBtn: {
    width: '28px', height: '28px', background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
    color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  },
  chip: {
    padding: '7px 11px', background: '#f8fafc', border: '1.5px solid #e2e8f0',
    borderRadius: '8px', fontSize: '0.78rem', color: '#374151', cursor: 'pointer',
    textAlign: 'left', fontFamily: 'Inter, sans-serif', lineHeight: 1.4,
  },
  chatInput: {
    flex: 1, padding: '9px 12px', borderRadius: '8px',
    border: '1.5px solid #e2e8f0', fontSize: '0.82rem', outline: 'none',
    fontFamily: 'Inter, sans-serif', background: 'white', color: '#0f172a',
    lineHeight: 1.5,
  },
  sendBtn: {
    width: '36px', height: '36px', background: 'rgb(29,83,148)', color: 'white',
    border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
}
