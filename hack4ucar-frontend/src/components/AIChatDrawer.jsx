import { useState, useRef, useEffect } from 'react'
import { X, Send, Sparkles, RotateCcw } from 'lucide-react'
import { sendChat } from '../api/client'

const SUGGESTED = [
  'Quel est le taux de réussite moyen ?',
  'Quelles institutions ont des alertes critiques ?',
  'Montre-moi les risques budgétaires actuels',
  'Quelle institution a le plus d\'étudiants ?',
  'Explique la situation à l\'ENSTAB',
]

export default function AIChatDrawer({ open, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Bonjour ! Je suis UCAR Intelligence. Posez-moi n\'importe quelle question sur vos 33 institutions — KPIs, alertes, tendances.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 300) }, [open])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(text) {
    const question = (text || input).trim()
    if (!question || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: question }, { role: 'assistant', content: '', loading: true }])
    setLoading(true)
    try {
      const res = await sendChat(question)
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: res.response }
        return copy
      })
    } catch {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = { role: 'assistant', content: 'Erreur de connexion. Vérifiez que le backend est actif.' }
        return copy
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ ...S.drawer, transform: open ? 'translateX(0)' : 'translateX(100%)' }}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={S.headerIcon}><Sparkles size={16} /></div>
          <div>
            <div style={S.headerTitle}>UCAR Intelligence IA</div>
            <div style={S.headerSub}>Claude Sonnet · Analyse prédictive</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={S.iconBtn} onClick={() => setMessages([{ role: 'assistant', content: 'Conversation réinitialisée.' }])}>
            <RotateCcw size={14} />
          </button>
          <button style={S.iconBtn} onClick={onClose}><X size={15} /></button>
        </div>
      </div>

      {/* Suggested prompts */}
      {messages.length <= 1 && (
        <div style={{ padding: '14px 14px 0', flexShrink: 0 }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Suggestions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {SUGGESTED.map((s) => (
              <button key={s} style={S.chip} onClick={() => handleSend(s)}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div style={S.messages}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          return (
            <div key={i} style={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: '8px' }}>
              {!isUser && <div style={S.aiAvatar}><Sparkles size={12} /></div>}
              <div style={{ ...S.bubble, ...(isUser ? S.bubbleUser : S.bubbleAI) }}>
                {msg.loading ? '⏳ Analyse en cours…' : msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={S.inputBar}>
        <input
          ref={inputRef}
          style={S.chatInput}
          placeholder="Posez votre question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={loading}
        />
        <button style={{ ...S.sendBtn, opacity: (!input.trim() || loading) ? 0.45 : 1 }} onClick={() => handleSend()} disabled={!input.trim() || loading}>
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

const S = {
  drawer: { position: 'fixed', top: 0, right: 0, width: '400px', height: '100vh', background: 'white', boxShadow: '-4px 0 40px rgba(0,0,0,0.12)', zIndex: 100, display: 'flex', flexDirection: 'column', transition: 'transform 350ms cubic-bezier(0.4,0,0.2,1)' },
  header: { padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgb(20, 58, 105)' },
  headerIcon: { width: '32px', height: '32px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' },
  headerTitle: { color: 'white', fontWeight: 700, fontSize: '0.88rem' },
  headerSub: { color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem', marginTop: '2px' },
  iconBtn: { width: '28px', height: '28px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  chip: { padding: '8px 12px', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.78rem', color: '#374151', cursor: 'pointer', textAlign: 'left', fontFamily: 'Inter, sans-serif', lineHeight: 1.4 },
  messages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  aiAvatar: { width: '26px', height: '26px', background: 'rgb(29, 83, 148)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 },
  bubble: { maxWidth: '83%', padding: '9px 13px', borderRadius: '12px', fontSize: '0.82rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  bubbleAI: { background: '#f0f4f8', color: '#1a1a2e', borderBottomLeftRadius: '4px', border: '1px solid #e2e8f0' },
  bubbleUser: { background: 'rgb(29, 83, 148)', color: 'white', borderBottomRightRadius: '4px' },
  inputBar: { padding: '12px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, background: '#fafbff' },
  chatInput: { flex: 1, padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.82rem', outline: 'none', fontFamily: 'Inter, sans-serif', background: 'white', color: '#0f172a' },
  sendBtn: { width: '36px', height: '36px', background: 'rgb(29, 83, 148)', color: 'white', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
}
