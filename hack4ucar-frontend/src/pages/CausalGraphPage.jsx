import { useState, useEffect, useCallback } from 'react'
import ReactFlow, {
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { getCausalGraph, getCausalDetail } from '../api/client'
import CausalDetailPanel from '../components/CausalDetailPanel'
import { Network, Loader2, RotateCcw } from 'lucide-react'

const DOMAIN_COLOR = {
  academic: 'rgb(29,83,148)',
  finance:  'rgb(22,163,74)',
  hr:       'rgb(245,158,11)',
  external: '#94a3b8',
}

const DOMAIN_BG = {
  academic: 'rgba(29,83,148,0.10)',
  finance:  'rgba(22,163,74,0.10)',
  hr:       'rgba(245,158,11,0.10)',
  external: 'rgba(148,163,184,0.12)',
}

// Node positions scaled ~1.5x for full-canvas spread
const NODE_POSITIONS = {
  scholarship_delay:       { x: 300,  y: 0   },
  residence_occupancy:     { x: 830,  y: 0   },
  staff_turnover_rate:     { x: 50,   y: 150 },
  dropout_rate:            { x: 570,  y: 240 },
  avg_teaching_load_hours: { x: 930,  y: 240 },
  success_rate:            { x: 360,  y: 530 },
  budget_execution_rate:   { x: 960,  y: 530 },
  attendance_rate:         { x: 130,  y: 740 },
  absenteeism_rate:        { x: 600,  y: 670 },
}

const EXTRA_NODES = [
  { id: 'scholarship_delay',   label: 'Délai bourses',  domain: 'external' },
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

// highlight: null | 'incoming' | 'outgoing' | 'dim'
function buildEdge({ id, source, target, strength }, highlight = null) {
  const strong = Math.abs(strength) > 0.55
  const label = `${strength > 0 ? '+' : ''}${strength.toFixed(2)}`

  let lineColor, strokeWidth, animated, labelFill, labelBgOpacity

  if (highlight === 'incoming') {
    lineColor = '#dc2626'; strokeWidth = 2.5; animated = true
    labelFill = '#dc2626'; labelBgOpacity = 0.95
  } else if (highlight === 'outgoing') {
    lineColor = '#f59e0b'; strokeWidth = 2.5; animated = true
    labelFill = '#f59e0b'; labelBgOpacity = 0.95
  } else if (highlight === 'dim') {
    lineColor = '#e2e8f0'; strokeWidth = 1; animated = false
    labelFill = '#d1d5db'; labelBgOpacity = 0.6
  } else {
    lineColor = strong ? '#64748b' : '#cbd5e1'
    strokeWidth = strong ? 2 : 1.5
    animated = strong
    labelFill = strength < 0 ? '#dc2626' : '#16a34a'
    labelBgOpacity = 0.92
  }

  return {
    id, source, target, animated,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: lineColor, width: 14, height: 14 },
    style: { stroke: lineColor, strokeWidth },
    label,
    labelStyle: { fontSize: '0.62rem', fill: labelFill, fontWeight: 700, fontFamily: 'Inter, sans-serif' },
    labelBgStyle: { fill: 'white', fillOpacity: labelBgOpacity },
    labelBgPadding: [2, 4],
  }
}

const DEFAULT_EDGES = STATIC_EDGES.map((e) => buildEdge(e))

function makeFlowNodes(allNodes, selectedId = null) {
  return allNodes.map((n) => {
    const isSelected = n.id === selectedId
    const color = DOMAIN_COLOR[n.domain] || '#64748b'
    const bg = DOMAIN_BG[n.domain] || '#f8fafc'
    return {
      id: n.id,
      position: NODE_POSITIONS[n.id] || { x: 500, y: 400 },
      data: { label: n.label, domain: n.domain },
      style: {
        background: isSelected ? color : bg,
        color: isSelected ? 'white' : '#0f172a',
        border: `2px solid ${color}`,
        borderRadius: '10px',
        padding: '10px 14px',
        fontSize: '0.78rem',
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        width: 160,
        textAlign: 'center',
        cursor: 'pointer',
        opacity: 1,
        transition: 'opacity 0.15s ease, box-shadow 0.15s ease',
        boxShadow: isSelected ? `0 6px 20px ${color}55` : '0 1px 4px rgba(0,0,0,0.06)',
      },
    }
  })
}

export default function CausalGraphPage() {
  const [allNodes, setAllNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES)

  useEffect(() => {
    getCausalGraph()
      .then((data) => {
        const combined = [...data.nodes, ...EXTRA_NODES]
        setAllNodes(combined)
        setNodes(makeFlowNodes(combined))
      })
      .catch(() => {
        setAllNodes(EXTRA_NODES)
        setNodes(makeFlowNodes(EXTRA_NODES))
      })
      .finally(() => setLoading(false))
  }, [])

  const resetGraph = useCallback(() => {
    setSelectedId(null)
    setDetail(null)
    setDetailError(false)
    setEdges(DEFAULT_EDGES)
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: {
          ...n.style,
          background: DOMAIN_BG[n.data.domain] || '#f8fafc',
          color: '#0f172a',
          opacity: 1,
          animation: '',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        },
      }))
    )
  }, [])

  const handleNodeClick = useCallback(async (_, node) => {
    const id = node.id

    // Find connected node IDs
    const incomingIds = new Set(STATIC_EDGES.filter((e) => e.target === id).map((e) => e.source))
    const outgoingIds = new Set(STATIC_EDGES.filter((e) => e.source === id).map((e) => e.target))
    const connectedIds = new Set([...incomingIds, ...outgoingIds])

    // Apply node styles
    setSelectedId(id)
    setNodes((nds) =>
      nds.map((n) => {
        const color = DOMAIN_COLOR[n.data.domain] || '#64748b'
        const bg = DOMAIN_BG[n.data.domain] || '#f8fafc'
        if (n.id === id) {
          return {
            ...n,
            style: {
              ...n.style,
              background: color,
              color: 'white',
              opacity: 1,
              boxShadow: `0 0 0 4px ${color}33, 0 6px 24px ${color}55`,
              animation: 'nodeGlow 1.4s ease-in-out infinite alternate',
            },
          }
        }
        return {
          ...n,
          style: {
            ...n.style,
            background: bg,
            color: '#0f172a',
            opacity: connectedIds.has(n.id) ? 1 : 0.25,
            animation: '',
            boxShadow: connectedIds.has(n.id) ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
          },
        }
      })
    )

    // Apply edge highlighting
    setEdges(
      STATIC_EDGES.map((e) => {
        if (e.target === id) return buildEdge(e, 'incoming')
        if (e.source === id) return buildEdge(e, 'outgoing')
        return buildEdge(e, 'dim')
      })
    )

    // Load detail
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
  }, [])

  const showPanel = detail || detailLoading || detailError

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeInUp 0.3s ease both' }}>
      <style>{`@keyframes nodeGlow { from { box-shadow: 0 0 0 3px rgba(255,255,255,0.55), 0 6px 24px rgba(0,0,0,0.22); } to { box-shadow: 0 0 0 9px rgba(255,255,255,0.05), 0 10px 36px rgba(0,0,0,0.07); } }`}</style>

      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Network size={22} color="rgb(29,83,148)" /> Graphe Causal Interactif
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' }}>
          Explorez les relations causales entre indicateurs — cliquez sur un nœud pour afficher ses causes, effets et recommandations IA.
        </p>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        {/* Graph canvas */}
        <div style={{ flex: 1, background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', height: '580px', position: 'relative' }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '10px', color: '#94a3b8' }}>
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
              fitView
              fitViewOptions={{ padding: 0.18 }}
              nodesDraggable
              nodesConnectable={false}
              elementsSelectable
              style={{ width: '100%', height: '100%' }}
            >
              <Background color="#f1f5f9" gap={22} size={1} />
              <Controls showInteractive={false} style={{ bottom: 12, left: 12 }} />

              {/* Reset button — only when a node is selected */}
              {selectedId && (
                <Panel position="top-right" style={{ margin: '10px 10px 0 0' }}>
                  <button
                    onClick={resetGraph}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '0.76rem', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  >
                    <RotateCcw size={12} /> Réinitialiser
                  </button>
                </Panel>
              )}

              {/* Legend */}
              <Panel position="bottom-right" style={{ margin: '0 12px 12px 0' }}>
                <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '7px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="24" height="8" style={{ flexShrink: 0 }}><line x1="0" y1="4" x2="24" y2="4" stroke="#64748b" strokeWidth="2" /></svg>
                    <span style={{ fontSize: '0.7rem', color: '#374151' }}>Lien fort (&gt;0.55)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="24" height="8" style={{ flexShrink: 0 }}><line x1="0" y1="4" x2="24" y2="4" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="4 3" /></svg>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Lien faible</span>
                  </div>
                  <div style={{ height: '1px', background: '#f1f5f9' }} />
                  {[
                    { color: 'rgb(29,83,148)',  label: 'Académique' },
                    { color: 'rgb(22,163,74)',  label: 'Finance' },
                    { color: 'rgb(245,158,11)', label: 'RH' },
                    { color: '#94a3b8',         label: 'Externe' },
                  ].map(({ color, label }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: '0.7rem', color: '#374151' }}>{label}</span>
                    </div>
                  ))}
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
          <div style={{ width: '280px', flexShrink: 0, background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#94a3b8', height: '200px' }}>
            <Network size={28} color="#e2e8f0" />
            <p style={{ fontSize: '0.8rem', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              Sélectionnez un nœud pour explorer ses relations causales.
            </p>
          </div>
        )}
      </div>

      {/* Info footer */}
      <div style={{ padding: '12px 16px', background: 'rgba(29,83,148,0.04)', borderRadius: '10px', border: '1px solid rgba(29,83,148,0.12)', fontSize: '0.78rem', color: '#374151', lineHeight: 1.6 }}>
        Au clic sur un nœud : <span style={{ color: '#dc2626', fontWeight: 700 }}>arêtes entrantes en rouge</span>, <span style={{ color: '#f59e0b', fontWeight: 700 }}>arêtes sortantes en orange</span>. Les nœuds non connectés passent à <strong>25% d'opacité</strong>. Les coefficients en <span style={{ color: '#16a34a', fontWeight: 700 }}>vert</span> renforcent la cible, en <span style={{ color: '#dc2626', fontWeight: 700 }}>rouge</span> ils la réduisent.
      </div>
    </div>
  )
}
