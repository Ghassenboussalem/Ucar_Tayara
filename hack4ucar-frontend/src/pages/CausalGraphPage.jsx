import { useState, useEffect, useCallback, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { getCausalGraph, getCausalDetail } from '../api/client'
import CausalDetailPanel from '../components/CausalDetailPanel'
import { Network, Loader2, RotateCcw, Sun, Moon } from 'lucide-react'

// ── Theme definitions ─────────────────────────────────────────────────────────
const THEME = {
  dark: {
    canvas:        '#060e1c',
    dot:           '#1a2744',
    legendBg:      'rgba(6,14,28,0.88)',
    legendBorder:  'rgba(255,255,255,0.07)',
    legendText:    '#64748b',
    resetBg:       'rgba(255,255,255,0.06)',
    resetBorder:   'rgba(255,255,255,0.12)',
    resetText:     '#e2e8f0',
    edgeStrong:    '#475569',
    edgeWeak:      '#1e2d40',
    edgeDim:       '#1a2744',
    labelBg:       '#0f1b2d',
    posLabel:      '#86efac',
    negLabel:      '#fca5a5',
    domainColor: {
      academic: '#60a5fa',
      finance:  '#4ade80',
      hr:       '#fbbf24',
      external: '#94a3b8',
    },
  },
  light: {
    canvas:        '#f8fafc',
    dot:           '#e2e8f0',
    legendBg:      'rgba(255,255,255,0.96)',
    legendBorder:  '#e2e8f0',
    legendText:    '#374151',
    resetBg:       'white',
    resetBorder:   '#e2e8f0',
    resetText:     '#374151',
    edgeStrong:    '#64748b',
    edgeWeak:      '#cbd5e1',
    edgeDim:       '#e8edf3',
    labelBg:       'white',
    posLabel:      '#16a34a',
    negLabel:      '#dc2626',
    domainColor: {
      academic: '#1d5394',
      finance:  '#16a34a',
      hr:       '#f59e0b',
      external: '#94a3b8',
    },
  },
}

function getDomainColor(domain, isDark) {
  return THEME[isDark ? 'dark' : 'light'].domainColor[domain] || '#94a3b8'
}

// ── Node positions ────────────────────────────────────────────────────────────
const NODE_POSITIONS = {
  scholarship_delay:       { x: 280,  y: 20   },
  residence_occupancy:     { x: 760,  y: 20   },
  staff_turnover_rate:     { x: 40,   y: 180  },
  dropout_rate:            { x: 530,  y: 240  },
  avg_teaching_load_hours: { x: 880,  y: 210  },
  success_rate:            { x: 320,  y: 500  },
  budget_execution_rate:   { x: 920,  y: 490  },
  attendance_rate:         { x: 110,  y: 680  },
  absenteeism_rate:        { x: 570,  y: 610  },
}

const EXTRA_NODES = [
  { id: 'scholarship_delay',   label: 'Délai Bourses',  domain: 'external' },
  { id: 'residence_occupancy', label: 'Résidences',     domain: 'external' },
  { id: 'staff_turnover_rate', label: 'Turnover RH',    domain: 'hr' },
]

const STATIC_EDGES = [
  { id: 'e1',  source: 'scholarship_delay',       target: 'dropout_rate',            strength:  0.72 },
  { id: 'e2',  source: 'residence_occupancy',      target: 'dropout_rate',            strength:  0.58 },
  { id: 'e6',  source: 'avg_teaching_load_hours',  target: 'absenteeism_rate',        strength:  0.67 },
  { id: 'e7',  source: 'staff_turnover_rate',      target: 'absenteeism_rate',        strength:  0.51 },
  { id: 'e8',  source: 'absenteeism_rate',         target: 'attendance_rate',         strength: -0.61 },
  { id: 'e3',  source: 'avg_teaching_load_hours',  target: 'dropout_rate',            strength:  0.44 },
  { id: 'e4',  source: 'dropout_rate',             target: 'success_rate',            strength: -0.81 },
  { id: 'e5',  source: 'attendance_rate',          target: 'success_rate',            strength:  0.69 },
  { id: 'e9',  source: 'avg_teaching_load_hours',  target: 'attendance_rate',         strength: -0.38 },
  { id: 'e10', source: 'budget_execution_rate',    target: 'avg_teaching_load_hours', strength:  0.43 },
]

// ── Custom node ───────────────────────────────────────────────────────────────
const HANDLE_STYLE = { background: 'transparent', border: 'none', width: 6, height: 6, minWidth: 6, minHeight: 6, opacity: 0 }

function CircleNode({ data }) {
  const { color, isDark, isSelected, isDimmed, label } = data

  const nodeBg = isSelected
    ? isDark
      ? `radial-gradient(circle at 38% 38%, ${color}ff, ${color}aa)`
      : color
    : isDark
      ? `radial-gradient(circle at 38% 38%, ${color}55, ${color}22)`
      : `${color}14`

  const nodeBorder = isDark
    ? `2.5px solid ${color}${isSelected ? 'ff' : '77'}`
    : `2px solid ${color}`

  const nodeShadow = isDark
    ? isSelected
      ? `0 0 0 6px ${color}33, 0 0 28px ${color}cc, 0 0 56px ${color}55`
      : `0 0 16px ${color}44`
    : isSelected
      ? `0 0 0 4px ${color}22, 0 6px 20px ${color}44`
      : `0 2px 10px ${color}22`

  return (
    <div style={{ width: 90, height: 90, position: 'relative' }}>
      <Handle type="target" position={Position.Top}    style={HANDLE_STYLE} />
      <Handle type="target" position={Position.Left}   style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
      <Handle type="source" position={Position.Right}  style={HANDLE_STYLE} />
      <div style={{
        width: '100%', height: '100%',
        borderRadius: '50%',
        background: nodeBg,
        border: nodeBorder,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        opacity: isDimmed ? (isDark ? 0.12 : 0.28) : 1,
        transition: 'all 0.25s ease',
        boxShadow: nodeShadow,
      }}>
        <span style={{
          fontSize: '0.57rem',
          fontWeight: 800,
          color: isSelected ? '#ffffff' : color,
          textAlign: 'center',
          lineHeight: 1.3,
          padding: '0 10px',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {label}
        </span>
      </div>
    </div>
  )
}

const NODE_TYPES = { circle: CircleNode }

// ── Edge builder ──────────────────────────────────────────────────────────────
function buildEdge({ id, source, target, strength }, highlight, isDark) {
  const t = THEME[isDark ? 'dark' : 'light']
  const strong = Math.abs(strength) > 0.55
  const label = `${strength > 0 ? '+' : ''}${strength.toFixed(2)}`

  let lineColor, strokeWidth, animated, labelFill, labelBg

  if (highlight === 'incoming') {
    lineColor = '#f87171'; strokeWidth = 3; animated = true
    labelFill = isDark ? '#fee2e2' : '#7f1d1d'; labelBg = isDark ? '#991b1b' : '#fef2f2'
  } else if (highlight === 'outgoing') {
    lineColor = '#fbbf24'; strokeWidth = 3; animated = true
    labelFill = isDark ? '#fef3c7' : '#78350f'; labelBg = isDark ? '#92400e' : '#fffbeb'
  } else if (highlight === 'dim') {
    lineColor = t.edgeDim; strokeWidth = 1; animated = false
    labelFill = isDark ? '#334155' : '#d1d5db'; labelBg = t.labelBg
  } else {
    lineColor = strong ? t.edgeStrong : t.edgeWeak
    strokeWidth = strong ? 2.5 : 1.5
    animated = strong
    labelFill = strength < 0 ? t.negLabel : t.posLabel
    labelBg = t.labelBg
  }

  return {
    id, source, target, animated,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: lineColor, width: 14, height: 14 },
    style: { stroke: lineColor, strokeWidth },
    label,
    labelStyle: { fontSize: '0.62rem', fill: labelFill, fontWeight: 700, fontFamily: 'Inter, sans-serif' },
    labelBgStyle: { fill: labelBg, fillOpacity: isDark ? 0.92 : 0.95 },
    labelBgPadding: [3, 5],
  }
}

function getDefaultEdges(isDark) {
  return STATIC_EDGES.map((e) => buildEdge(e, null, isDark))
}

function makeInitialNodes(allNodes, isDark) {
  return allNodes.map((n) => ({
    id: n.id,
    type: 'circle',
    position: NODE_POSITIONS[n.id] || { x: 500, y: 400 },
    data: {
      label: n.label,
      domain: n.domain,
      color: getDomainColor(n.domain, isDark),
      isDark,
      isSelected: false,
      isDimmed: false,
    },
    style: { background: 'transparent', border: 'none', padding: 0 },
  }))
}

// ── Page component ────────────────────────────────────────────────────────────
export default function CausalGraphPage() {
  const [isDark, setIsDark] = useState(true)
  const [allNodes, setAllNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState(getDefaultEdges(true))

  // Keep a ref to selectedId so theme-switch effect can read it without dependency
  const selectedIdRef = useRef(null)
  selectedIdRef.current = selectedId

  const theme = THEME[isDark ? 'dark' : 'light']

  useEffect(() => {
    getCausalGraph()
      .then((data) => {
        const combined = [...data.nodes, ...EXTRA_NODES]
        setAllNodes(combined)
        setNodes(makeInitialNodes(combined, true))
      })
      .catch(() => {
        setAllNodes(EXTRA_NODES)
        setNodes(makeInitialNodes(EXTRA_NODES, true))
      })
      .finally(() => setLoading(false))
  }, [])

  // Re-theme nodes + edges when dark/light toggles
  useEffect(() => {
    if (allNodes.length === 0) return
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, color: getDomainColor(n.data.domain, isDark), isDark },
    })))
    const selId = selectedIdRef.current
    setEdges(selId
      ? STATIC_EDGES.map((e) => {
          if (e.target === selId) return buildEdge(e, 'incoming', isDark)
          if (e.source === selId) return buildEdge(e, 'outgoing', isDark)
          return buildEdge(e, 'dim', isDark)
        })
      : getDefaultEdges(isDark)
    )
  }, [isDark]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetGraph = useCallback(() => {
    setSelectedId(null)
    setDetail(null)
    setDetailError(false)
    setEdges(getDefaultEdges(isDark))
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: { ...n.data, isSelected: false, isDimmed: false },
    })))
  }, [isDark])

  const handleNodeClick = useCallback(async (_, node) => {
    const id = node.id
    const incomingIds = new Set(STATIC_EDGES.filter((e) => e.target === id).map((e) => e.source))
    const outgoingIds = new Set(STATIC_EDGES.filter((e) => e.source === id).map((e) => e.target))
    const connectedIds = new Set([...incomingIds, ...outgoingIds])

    setSelectedId(id)
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        isSelected: n.id === id,
        isDimmed: n.id !== id && !connectedIds.has(n.id),
      },
    })))
    setEdges(STATIC_EDGES.map((e) => {
      if (e.target === id) return buildEdge(e, 'incoming', isDark)
      if (e.source === id) return buildEdge(e, 'outgoing', isDark)
      return buildEdge(e, 'dim', isDark)
    }))

    setDetailLoading(true)
    setDetail(null)
    setDetailError(false)
    try {
      const d = await getCausalDetail(id)
      if (!d || !d.label) throw new Error('empty')
      setDetail(d)
    } catch {
      setDetailError(true)
    } finally {
      setDetailLoading(false)
    }
  }, [isDark])

  const showPanel = detail || detailLoading || detailError

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 0.3s ease both' }}>
      <style>{`
        .react-flow__node-circle { background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; }
        .react-flow__controls { border-radius: 10px !important; overflow: hidden; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Network size={22} color="rgb(29,83,148)" /> Graphe Causal Interactif
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px', marginBottom: 0 }}>
            Explorez les relations causales entre indicateurs — cliquez sur un nœud pour afficher ses causes, effets et recommandations IA.
          </p>
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setIsDark((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 14px',
            background: isDark ? '#0f172a' : 'white',
            border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
            borderRadius: '10px',
            fontSize: '0.78rem', fontWeight: 600,
            color: isDark ? '#e2e8f0' : '#374151',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            flexShrink: 0,
            transition: 'all 0.2s ease',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          {isDark
            ? <><Sun size={15} color="#fbbf24" /> Mode clair</>
            : <><Moon size={15} color="rgb(29,83,148)" /> Mode sombre</>
          }
        </button>
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {[
          { label: 'Indicateurs',    value: allNodes.length || 9,  icon: '◉', color: '#60a5fa', sub: 'nœuds dans le graphe' },
          { label: 'Liens causaux',  value: STATIC_EDGES.length,   icon: '⟶', color: '#4ade80', sub: 'relations modélisées' },
          { label: 'Lien le + fort', value: '−0.81',               icon: '⚡', color: '#f87171', sub: 'Abandon → Réussite' },
        ].map((s) => (
          <div key={s.label} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width: 42, height: 42, borderRadius: '10px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '3px' }}>{s.label}</div>
              <div style={{ fontSize: '0.66rem', color: '#cbd5e1' }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Graph canvas */}
        <div style={{
          flex: 1,
          background: theme.canvas,
          borderRadius: '16px',
          border: isDark ? '1px solid #1a2744' : '1px solid #e2e8f0',
          overflow: 'hidden',
          height: '610px',
          position: 'relative',
          boxShadow: isDark ? '0 8px 40px rgba(0,0,0,0.35)' : '0 2px 16px rgba(0,0,0,0.06)',
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#475569' }}>
              <Loader2 size={20} style={{ animation: 'spin 0.7s linear infinite' }} />
              <span style={{ fontSize: '0.85rem' }}>Chargement du graphe…</span>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onPaneClick={resetGraph}
              nodeTypes={NODE_TYPES}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              style={{ width: '100%', height: '100%' }}
            >
              <Background color={theme.dot} gap={30} size={1.5} variant={BackgroundVariant.Dots} />
              <Controls showInteractive={false} style={{ bottom: 14, left: 14 }} />

              {selectedId && (
                <Panel position="top-right" style={{ margin: '12px 12px 0 0' }}>
                  <button
                    onClick={resetGraph}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '7px 13px',
                      background: theme.resetBg,
                      backdropFilter: isDark ? 'blur(10px)' : 'none',
                      border: `1px solid ${theme.resetBorder}`,
                      borderRadius: '8px',
                      fontSize: '0.76rem', fontWeight: 600, color: theme.resetText,
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
                    }}
                  >
                    <RotateCcw size={12} /> Réinitialiser
                  </button>
                </Panel>
              )}

              {/* Legend */}
              <Panel position="bottom-right" style={{ margin: '0 14px 14px 0' }}>
                <div style={{
                  background: theme.legendBg,
                  backdropFilter: isDark ? 'blur(10px)' : 'none',
                  border: `1px solid ${theme.legendBorder}`,
                  borderRadius: '11px',
                  padding: '11px 15px',
                  display: 'flex', flexDirection: 'column', gap: '7px',
                  boxShadow: isDark ? 'none' : '0 2px 10px rgba(0,0,0,0.06)',
                  transition: 'background 0.3s ease',
                }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: isDark ? '#475569' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>Domaine</div>
                  {[
                    { key: 'academic', label: 'Académique' },
                    { key: 'finance',  label: 'Finance' },
                    { key: 'hr',       label: 'RH' },
                    { key: 'external', label: 'Externe' },
                  ].map(({ key, label }) => {
                    const c = theme.domainColor[key]
                    return (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: isDark ? `0 0 7px ${c}` : 'none' }} />
                        <span style={{ fontSize: '0.7rem', color: theme.legendText }}>{label}</span>
                      </div>
                    )
                  })}
                  <div style={{ height: '1px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', margin: '3px 0' }} />
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', display: 'block' }} />
                      <span style={{ fontSize: '0.66rem', color: theme.legendText }}>Causes</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', display: 'block' }} />
                      <span style={{ fontSize: '0.66rem', color: theme.legendText }}>Effets</span>
                    </div>
                  </div>
                </div>
              </Panel>
            </ReactFlow>
          )}
        </div>

        {/* Side panel */}
        {showPanel ? (
          <CausalDetailPanel
            detail={detail}
            loading={detailLoading}
            error={detailError}
            onClose={resetGraph}
          />
        ) : (
          <div style={{
            width: '290px', flexShrink: 0,
            background: 'white', borderRadius: '14px',
            border: '1px solid #e2e8f0', padding: '28px 20px',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '12px', height: '210px',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Network size={22} color="#cbd5e1" />
            </div>
            <p style={{ fontSize: '0.79rem', textAlign: 'center', lineHeight: 1.55, margin: 0, color: '#94a3b8' }}>
              Cliquez sur un nœud pour explorer ses relations causales.
            </p>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div style={{ padding: '12px 16px', background: 'rgba(29,83,148,0.04)', borderRadius: '10px', border: '1px solid rgba(29,83,148,0.12)', fontSize: '0.78rem', color: '#374151', lineHeight: 1.6 }}>
        Clic sur un nœud : <span style={{ color: '#ef4444', fontWeight: 700 }}>arêtes entrantes en rouge</span>, <span style={{ color: '#f59e0b', fontWeight: 700 }}>arêtes sortantes en orange</span>. Nœuds non connectés en transparence. Coefficients en <span style={{ color: '#16a34a', fontWeight: 700 }}>vert</span> renforcent la cible, en <span style={{ color: '#dc2626', fontWeight: 700 }}>rouge</span> ils la réduisent.
      </div>
    </div>
  )
}
