import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force'
import {
  Upload, Database, CheckCircle2, AlertTriangle, Cpu, FileText,
  Play, Wifi, WifiOff, RefreshCw, ChevronRight, X, Folder,
  FolderOpen, Sparkles, Building2, Zap, Clock, Eye, Image,
  Mail, Inbox, MailCheck, MailX, Settings2, Radio,
} from 'lucide-react'
import {
  etlUploadFile, etlUploadBatch, etlGetJob,
  etlListJobs, etlGetScenarios, etlDemoTrigger, getRecentAlerts,
  etlEmailStatus, etlEmailEvents, etlEmailSimulate,
} from '../api/client'
import { useLang } from '../contexts/LangContext'

// ── CSS keyframes injected once ───────────────────────────────────────────────
const STYLES_ID = 'ingest-keyframes'
if (!document.getElementById(STYLES_ID)) {
  const s = document.createElement('style')
  s.id = STYLES_ID
  s.textContent = `
    @keyframes ingestFadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
    @keyframes ingestPulse  { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
    @keyframes ingestSpin   { to { transform:rotate(360deg); } }
    @keyframes ingestSlideIn{ from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
    @keyframes ingestGlow   { 0%,100% { box-shadow:0 0 0 0 rgba(29,83,148,0.0); } 50% { box-shadow:0 0 0 8px rgba(29,83,148,0.12); } }
    @keyframes ingestRow    { from { opacity:0; background:#dcfce7; transform:translateY(-6px); } to { opacity:1; background:white; transform:translateY(0); } }
    @keyframes ingestFly    { 0% { opacity:1; transform:translateY(0) scale(1); } 60% { opacity:0.7; transform:translateY(-40px) scale(0.7); } 100% { opacity:0; transform:translateY(-80px) scale(0.3); } }
    @keyframes ingestPacket { 0% { left:0%; opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { left:100%; opacity:0; } }
    @keyframes ingestBlink  { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
  `
  document.head.appendChild(s)
}

const DOC_TYPE_KEYWORDS = [
  ['academic', 'academic'], ['grade', 'academic'], ['note', 'academic'], ['score', 'academic'],
  ['finance', 'finance'], ['budget', 'finance'], ['comptab', 'finance'], ['depense', 'finance'],
  ['_hr_', 'hr'], ['_rh_', 'hr'], ['staff', 'hr'], ['employe', 'hr'], ['personnel', 'hr'],
  ['esg', 'esg'], ['environnement', 'esg'], ['energie', 'esg'],
  ['research', 'research'], ['recherche', 'research'], ['labo', 'research'],
  ['employment', 'employment'], ['emploi', 'employment'], ['diplome', 'employment'],
  ['infra', 'infrastructure'], ['infrastructure', 'infrastructure'], ['batiment', 'infrastructure'],
]

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff']

function detectDocType(filename) {
  const name = filename.toLowerCase()
  for (const [kw, type] of DOC_TYPE_KEYWORDS) {
    if (name.includes(kw)) return type
  }
  // For images without domain keywords, default to academic
  // (Groq VLM will extract and structure whatever is in the image)
  return 'academic'
}

function isImageFile(filename) {
  const ext = '.' + filename.split('.').pop().toLowerCase()
  return IMAGE_EXTS.includes(ext)
}

const INSTITUTIONS = [
  { code: 'EPT',    label: 'EPT — École Polytechnique de Tunis' },
  { code: 'INSAT',  label: 'INSAT — Institut National Sciences Appliquées' },
  { code: 'SUPCOM', label: 'SupCom — École Supérieure des Communications' },
  { code: 'IHEC',   label: 'IHEC — Institut Hautes Études Commerciales' },
  { code: 'FSB',    label: 'FSB — Faculté des Sciences de Bizerte' },
  { code: 'ESAC',   label: 'ESAC — École Supérieure des Arts et Créations' },
]

const PIPELINE_STEPS = [
  { icon: Upload,       label: 'Réception fichier',     desc: 'Téléversement & détection format' },
  { icon: Eye,          label: 'Analyse & OCR',          desc: 'Extraction du contenu structuré' },
  { icon: CheckCircle2, label: 'Validation données',     desc: 'Vérification règles métier' },
  { icon: Cpu,          label: 'Calcul indicateurs KPI', desc: 'Agrégation & formules statistiques' },
  { icon: Database,     label: 'Chargement base',        desc: 'Écriture PostgreSQL + alertes IA' },
]

const DOMAIN_LABELS = {
  grades: 'Académique', academic: 'Académique', finance: 'Finance', budget: 'Finance',
  hr: 'Ressources Humaines', esg: 'ESG / Env.', research: 'Recherche',
  employment: 'Employabilité', infrastructure: 'Infrastructure', partnership: 'Partenariats',
}

const STATUS_META = {
  queued:       { color: '#64748b', label: 'En file', dot: '#94a3b8' },
  processing:   { color: '#2563eb', label: 'En cours', dot: '#3b82f6' },
  validated:    { color: '#16a34a', label: 'Validé',   dot: '#22c55e' },
  needs_review: { color: '#d97706', label: 'Révision', dot: '#f59e0b' },
  stored:       { color: '#0ea5e9', label: 'Chargé',   dot: '#38bdf8' },
  failed:       { color: '#dc2626', label: 'Erreur',   dot: '#ef4444' },
}

export default function DataIngestionPage() {
  const { lang } = useLang()
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  const [tab, setTab]                   = useState('manual')
  const [isDragging, setIsDragging]     = useState(false)
  const [institution, setInstitution]   = useState('EPT')
  const [period, setPeriod]             = useState('S1_2025')
  const [jobs, setJobs]                 = useState([])
  const [activeJob, setActiveJob]       = useState(null)
  const [pipelineStage, setPipelineStage] = useState(-1)
  const [flyingCount, setFlyingCount]   = useState(0)
  const [etlOnline, setEtlOnline]       = useState(null)
  const [demoScenarios, setDemoScenarios] = useState([])
  const [demoRunning, setDemoRunning]   = useState(null)
  const [demoPacket, setDemoPacket]     = useState(false)
  const [recentRows, setRecentRows]     = useState([])
  const [newRowId, setNewRowId]         = useState(null)
  const [pendingFiles, setPendingFiles] = useState([])   // [{id,file,docType}]
  const [batchTotal, setBatchTotal]     = useState(0)
  const [batchDone, setBatchDone]       = useState(0)
  const fileInputRef   = useRef(null)
  const pollRef        = useRef(null)
  const batchPollRefs  = useRef({})

  // ── Bootstrap ─────────────────────────────────────────────────
  useEffect(() => {
    loadJobs()
    checkEtl()
    etlGetScenarios()
      .then((d) => setDemoScenarios(d.scenarios || []))
      .catch(() => {})
    const t = setInterval(loadJobs, 5000)
    return () => clearInterval(t)
  }, [])

  async function checkEtl() {
    try {
      await etlListJobs(1)
      setEtlOnline(true)
    } catch { setEtlOnline(false) }
  }

  async function loadJobs() {
    try {
      const list = await etlListJobs(15)
      setJobs(list)
      setEtlOnline(true)
      // Rebuild recentRows from the API so navigation doesn't wipe the graph
      setRecentRows(
        list
          .filter(j => j.status === 'stored' || j.status === 'failed')
          .slice(0, 12)
          .map(j => ({
            id: j.id,
            institution: j.institution,
            domain: DOMAIN_LABELS[j.document_type] || j.document_type,
            records: j.records_count > 0 ? j.records_count : '—',
            status: j.status,
            ts: j.updated_at
              ? new Date(j.updated_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
              : '—',
          }))
      )
    } catch { setEtlOnline(false) }
  }

  // ── File selection → pending list (no upload yet) ─────────────
  function handleFiles(fileList) {
    const files = Array.from(fileList)
    if (!files.length) return
    setPendingFiles((prev) => {
      const existingNames = new Set(prev.map((p) => p.file.name))
      const fresh = files
        .filter((f) => !existingNames.has(f.name))
        .map((f, i) => ({ id: `${Date.now()}_${i}_${f.name}`, file: f, docType: detectDocType(f.name) }))
      return [...prev, ...fresh]
    })
  }

  // ── Launch: upload each pending file individually in parallel ──
  async function launchUpload() {
    if (!pendingFiles.length) return
    const toUpload = [...pendingFiles]
    setPendingFiles([])
    setFlyingCount(toUpload.length)
    setTimeout(() => setFlyingCount(0), 900)
    setPipelineStage(0)
    setBatchTotal(toUpload.length)
    setBatchDone(0)
    setActiveJob(null)

    const results = await Promise.all(
      toUpload.map(({ file, docType }) =>
        etlUploadFile(file, institution, docType)
          .then((r) => ({ ok: true, jobId: r.file_id || r.job_id }))
          .catch(() => ({ ok: false }))
      )
    )
    const jobIds = results.filter((r) => r.ok).map((r) => r.jobId)
    if (jobIds.length) startBatchWatch(jobIds)
    loadJobs()
  }

  // ── Watch multiple jobs simultaneously ────────────────────────
  function startBatchWatch(jobIds) {
    Object.values(batchPollRefs.current).forEach(clearInterval)
    batchPollRefs.current = {}
    clearInterval(pollRef.current)

    const stageMap = { queued: 0, processing: 1, validated: 2, needs_review: 2, stored: 5, failed: -1 }
    let maxStage = 0
    let doneCount = 0

    jobIds.forEach((jobId) => {
      let stage = 0
      const iv = setInterval(async () => {
        try {
          const job = await etlGetJob(jobId)
          const s = stageMap[job.status] ?? stage
          if (s !== stage) {
            stage = s
            if (s > maxStage) { maxStage = s; setPipelineStage(s); setActiveJob(job) }
          }
          if (s === 5 || s === -1) {
            clearInterval(batchPollRefs.current[jobId])
            delete batchPollRefs.current[jobId]
            doneCount++
            setBatchDone(doneCount)
            if (s === 5) setTimeout(() => addRecentRow(job), 400)
          }
        } catch {
          clearInterval(batchPollRefs.current[jobId])
          delete batchPollRefs.current[jobId]
        }
      }, 1200)
      batchPollRefs.current[jobId] = iv
    })
  }

  // ── Single-job watch (demo mode) ──────────────────────────────
  function startPipelineWatch(jobId) {
    clearInterval(pollRef.current)
    setBatchTotal(1); setBatchDone(0)
    let stage = 0
    const stageMap = { queued: 0, processing: 1, validated: 2, needs_review: 2, stored: 5, failed: -1 }
    pollRef.current = setInterval(async () => {
      try {
        const job = await etlGetJob(jobId)
        setActiveJob(job)
        const s = stageMap[job.status] ?? stage
        if (s !== stage) { stage = s; setPipelineStage(s) }
        if (s === 5) {
          setBatchDone(1)
          setTimeout(() => { addRecentRow(job); clearInterval(pollRef.current) }, 600)
        }
        if (s === -1) clearInterval(pollRef.current)
      } catch { clearInterval(pollRef.current) }
    }, 1200)
  }

  function addRecentRow(job) {
    const id = job.id || Date.now()
    setNewRowId(id)
    setRecentRows((prev) => [{
      id,
      institution: job.institution,
      domain: DOMAIN_LABELS[job.document_type] || job.document_type,
      records: job.extracted_payload?.length ?? '—',
      status: job.status,
      ts: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }, ...prev].slice(0, 12))
    setTimeout(() => setNewRowId(null), 2500)
  }

  // ── Drag & Drop ────────────────────────────────────────────────
  const onDragOver  = (e) => { e.preventDefault(); setIsDragging(true) }
  const onDragLeave = ()  => setIsDragging(false)
  const onDrop      = (e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files) }

  // ── Demo mode ─────────────────────────────────────────────────
  async function runDemo(scenario) {
    setDemoRunning(scenario.id)
    setDemoPacket(false)
    setPipelineStage(0)
    setTimeout(() => setDemoPacket(true), 400)

    try {
      const res = await etlDemoTrigger(scenario.id)
      const jobId = res.job_id
      setTimeout(() => {
        setDemoPacket(false)
        startPipelineWatch(jobId)
        loadJobs()
      }, 1800)
    } catch (e) {
      console.error('Demo trigger failed', e)
      setPipelineStage(-1)
    } finally {
      setTimeout(() => setDemoRunning(null), 4000)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'ingestFadeUp 0.35s ease both' }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={styles.h1}>
            <Database size={22} color="rgb(29,83,148)" />
            {tx("Centre d'Ingestion de Données", 'مركز استيراد البيانات')}
          </h1>
          <p style={styles.subtitle}>
            {tx('Importez les données institutionnelles — traitement automatique par l\'IA', 'استورد بيانات المؤسسات - معالجة تلقائية بالذكاء الاصطناعي')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <EtlStatus online={etlOnline} />
          <button onClick={() => { loadJobs(); checkEtl() }} style={styles.refreshBtn}>
            <RefreshCw size={14} /> {tx('Actualiser', 'تحديث')}
          </button>
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div style={styles.tabs}>
        <TabBtn active={tab === 'manual'} onClick={() => setTab('manual')} icon={<Upload size={15} />}>
          {tx('Import Manuel', 'استيراد يدوي')}
        </TabBtn>
        <TabBtn active={tab === 'demo'} onClick={() => setTab('demo')} icon={<Zap size={15} />}>
          {tx('Mode Démo Hackathon', 'وضع عرض الهاكاثون')}
        </TabBtn>
        <TabBtn active={tab === 'email'} onClick={() => setTab('email')} icon={<Mail size={15} />}>
          {tx('Ingestion Email', 'استيراد البريد')}
        </TabBtn>
      </div>

      {/* ── Main content ───────────────────────────────────────── */}
      {tab === 'manual' ? (
        <ManualTab
          isDragging={isDragging}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          fileInputRef={fileInputRef}
          handleFiles={handleFiles}
          institution={institution}
          setInstitution={setInstitution}
          period={period}
          setPeriod={setPeriod}
          flyingCount={flyingCount}
          jobs={jobs}
          pipelineStage={pipelineStage}
          activeJob={activeJob}
          recentRows={recentRows}
          newRowId={newRowId}
          pendingFiles={pendingFiles}
          setPendingFiles={setPendingFiles}
          launchUpload={launchUpload}
          batchTotal={batchTotal}
          batchDone={batchDone}
          lang={lang}
        />
      ) : tab === 'demo' ? (
        <DemoTab
          scenarios={demoScenarios}
          demoRunning={demoRunning}
          demoPacket={demoPacket}
          pipelineStage={pipelineStage}
          activeJob={activeJob}
          recentRows={recentRows}
          newRowId={newRowId}
          onRun={runDemo}
          lang={lang}
        />
      ) : (
        <EmailTab lang={lang} />
      )}
    </div>
  )
}

// ── Manual Upload Tab ──────────────────────────────────────────────────────────
function ManualTab({ isDragging, onDragOver, onDragLeave, onDrop, fileInputRef, handleFiles,
                     institution, setInstitution, period, setPeriod,
                     flyingCount, jobs, pipelineStage, activeJob, recentRows, newRowId,
                     pendingFiles, setPendingFiles, launchUpload, batchTotal, batchDone }) {
  const { lang } = useLang()
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  return (
    <div style={styles.twoCol}>
      {/* Left column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Drop zone — shrinks when files are pending */}
        <div
          style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneActive : {}),
                   ...(pendingFiles.length > 0 ? { padding: '18px', minHeight: '100px' } : {}) }}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" multiple accept=".csv,.xlsx,.pdf,.json,.txt,.png,.jpg,.jpeg,.webp"
            style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />

          {/* Flying file particles */}
          {flyingCount > 0 && Array.from({ length: Math.min(flyingCount, 5) }).map((_, i) => (
            <div key={i} style={{ ...styles.flyParticle, left: `${20 + i * 15}%`, animationDelay: `${i * 80}ms` }}>
              {flyingCount === 1 && fileInputRef.current?.files?.[0] && isImageFile(fileInputRef.current.files[0].name)
                ? <Image size={18} color="rgb(29,83,148)" />
                : <FileText size={18} color="rgb(29,83,148)" />}
            </div>
          ))}

          <div style={styles.folderWrap}>
            {isDragging ? <FolderOpen size={48} color="rgb(29,83,148)" /> : <Folder size={48} color="rgb(29,83,148)" />}
          </div>

          <div style={styles.dropTitle}>
            {isDragging ? tx('Relâchez pour importer', 'أفلت للاستيراد') : tx('Déposez vos fichiers ici', 'أسقط ملفاتك هنا')}
          </div>
          <div style={styles.dropSub}>
            {tx('ou ', 'أو ')}<span style={{ color: 'rgb(29,83,148)', fontWeight: 600 }}>{tx('cliquez pour sélectionner', 'انقر للاختيار')}</span>
          </div>
          <div style={styles.dropFormats}>
            {tx('CSV · Excel · PDF · JSON · PNG · JPG — lot ou fichier unique', 'CSV · Excel · PDF · JSON · PNG · JPG - دفعة أو ملف واحد')}
          </div>
        </div>

        {/* Config row */}
        <div style={styles.configRow}>
          <div style={{ flex: 2 }}>
            <label style={styles.label}>{tx('Institution', 'المؤسسة')}</label>
            <select value={institution} onChange={(e) => setInstitution(e.target.value)} style={styles.select}>
              {INSTITUTIONS.map((i) => (
                <option key={i.code} value={i.code}>{i.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>{tx('Période', 'الفترة')}</label>
            <input value={period} onChange={(e) => setPeriod(e.target.value)}
              placeholder="S1_2025" style={styles.input} />
          </div>
        </div>

        {/* Pending files list */}
        {pendingFiles.length > 0 && (
          <PendingFilesList
            files={pendingFiles}
            onChange={(id, docType) =>
              setPendingFiles((prev) => prev.map((p) => p.id === id ? { ...p, docType } : p))
            }
            onRemove={(id) => setPendingFiles((prev) => prev.filter((p) => p.id !== id))}
            onLaunch={launchUpload}
          />
        )}

        {/* Jobs list */}
        <JobsList jobs={jobs} />
      </div>

      {/* Right column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <PipelineViz stage={pipelineStage} job={activeJob} batchTotal={batchTotal} batchDone={batchDone} />
        <LiveFeed rows={recentRows} newRowId={newRowId} />
      </div>
    </div>
  )
}

// ── Demo Tab ──────────────────────────────────────────────────────────────────
function DemoTab({ scenarios, demoRunning, demoPacket, pipelineStage, activeJob, recentRows, newRowId, onRun }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Flow diagram */}
      <div style={styles.flowCard}>
        <div style={styles.flowTitle}>
          <Sparkles size={16} color="rgb(29,83,148)" />
          Simulation du flux de données en conditions réelles
        </div>
        <div style={styles.flowDiagram}>
          <FlowNode icon="🏫" label="Système Institution" sub="Sources disparates" color="#e0f2fe" />
          <FlowArrow active={demoPacket} />
          <FlowNode icon="⚙️" label="Moteur ETL" sub="Traitement IA" color="#ede9fe" active={demoPacket} />
          <FlowArrow active={pipelineStage === 5} />
          <FlowNode icon="🏢" label="Plateforme UCAR" sub="Dashboard live" color="#dcfce7" active={pipelineStage === 5} />
        </div>
      </div>

      <div style={styles.twoCol}>
        {/* Scenario cards */}
        <div>
          <div style={styles.sectionTitle}>Scénarios disponibles</div>
          <div style={styles.scenarioGrid}>
            {scenarios.length === 0
              ? Array.from({ length: 6 }).map((_, i) => <ScenarioSkeleton key={i} />)
              : scenarios.map((s) => (
                  <ScenarioCard
                    key={s.id}
                    scenario={s}
                    running={demoRunning === s.id}
                    onRun={() => onRun(s)}
                    disabled={!!demoRunning}
                  />
                ))
            }
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PipelineViz stage={pipelineStage} job={activeJob} />
          <LiveFeed rows={recentRows} newRowId={newRowId} />
        </div>
      </div>
    </div>
  )
}

// ── Pending Files List ────────────────────────────────────────────────────────
const DOC_TYPE_OPTIONS = [
  { value: 'academic',       label: 'Académique (notes)' },
  { value: 'finance',        label: 'Finance (budget)' },
  { value: 'hr',             label: 'Ressources Humaines' },
  { value: 'esg',            label: 'ESG / Environnement' },
  { value: 'research',       label: 'Recherche' },
  { value: 'employment',     label: 'Emploi / Insertion' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'partnership',    label: 'Partenariats' },
]

function fileIcon(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  if (['png','jpg','jpeg','webp'].includes(ext)) return '🖼️'
  if (ext === 'pdf') return '📄'
  if (['xlsx','xls'].includes(ext)) return '📊'
  if (ext === 'json') return '📋'
  return '📝'
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

function PendingFilesList({ files, onChange, onRemove, onLaunch }) {
  return (
    <div style={{ background: 'white', borderRadius: '12px', border: '1.5px solid #e0f2fe',
                  padding: '14px 16px', animation: 'ingestFadeUp 0.3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.83rem', color: '#0f172a', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Upload size={14} color="rgb(29,83,148)" />
          {files.length} fichier{files.length > 1 ? 's' : ''} prêt{files.length > 1 ? 's' : ''} à importer
        </div>
        <button
          onClick={onLaunch}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 16px',
                   background: 'rgb(29,83,148)', color: 'white', border: 'none', borderRadius: '8px',
                   fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
          <Zap size={13} /> Lancer l'import
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {files.map((pf) => (
          <div key={pf.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto',
                                    gap: '10px', alignItems: 'center', padding: '8px 10px',
                                    background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            {/* Icon + name */}
            <span style={{ fontSize: '1rem' }}>{fileIcon(pf.file.name)}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#0f172a',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {pf.file.name}
              </div>
              <div style={{ fontSize: '0.67rem', color: '#94a3b8' }}>{fmtSize(pf.file.size)}</div>
            </div>
            {/* Type selector */}
            <select
              value={pf.docType}
              onChange={(e) => onChange(pf.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '0.73rem', padding: '4px 6px', borderRadius: '6px',
                       border: '1.5px solid #e2e8f0', background: 'white', color: '#0f172a',
                       fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}>
              {DOC_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* Remove */}
            <button onClick={() => onRemove(pf.id)}
              style={{ width: '22px', height: '22px', borderRadius: '50%', border: 'none',
                       background: '#fee2e2', color: '#dc2626', cursor: 'pointer',
                       display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={11} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Pipeline Visualization ────────────────────────────────────────────────────
function PipelineViz({ stage, job, batchTotal = 0, batchDone = 0 }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        <Cpu size={15} color="rgb(29,83,148)" /> Pipeline de traitement
        {batchTotal > 1 && (
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700,
                         color: batchDone === batchTotal ? '#16a34a' : 'rgb(29,83,148)',
                         background: batchDone === batchTotal ? '#dcfce7' : '#eff6ff',
                         padding: '2px 10px', borderRadius: '20px' }}>
            {batchDone}/{batchTotal} fichiers
          </span>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
        {PIPELINE_STEPS.map((step, i) => {
          const done    = stage > i
          const active  = stage === i
          const pending = stage < i

          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Connector line */}
              {i > 0 && (
                <div style={{ width: '2px', height: '8px', background: done ? '#22c55e' : '#e2e8f0',
                              marginLeft: '15px', marginTop: '-6px', marginBottom: '0', position: 'absolute',
                              transform: `translateY(-${14}px)` }} />
              )}
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#dcfce7' : active ? 'rgb(29,83,148)' : '#f1f5f9',
                border: `2px solid ${done ? '#22c55e' : active ? 'rgb(29,83,148)' : '#e2e8f0'}`,
                animation: active ? 'ingestGlow 1.5s ease-in-out infinite' : 'none',
                transition: 'all 0.4s ease',
              }}>
                {done
                  ? <CheckCircle2 size={14} color="#16a34a" />
                  : <step.icon size={14} color={active ? 'white' : '#94a3b8'}
                      style={{ animation: active ? 'ingestPulse 1.2s ease-in-out infinite' : 'none' }} />
                }
              </div>

              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '0.8rem', fontWeight: 600,
                  color: done ? '#16a34a' : active ? 'rgb(29,83,148)' : '#94a3b8',
                  transition: 'color 0.3s ease',
                }}>
                  {step.label}
                  {active && <span style={{ marginLeft: '6px', fontSize: '0.7rem', animation: 'ingestPulse 1s ease-in-out infinite' }}>…</span>}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#cbd5e1', marginTop: '1px' }}>{step.desc}</div>
              </div>

              <div style={{
                width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                background: done ? '#22c55e' : active ? '#3b82f6' : '#e2e8f0',
                animation: active ? 'ingestBlink 1s ease-in-out infinite' : 'none',
                transition: 'background 0.3s ease',
              }} />
            </div>
          )
        })}
      </div>

      {/* Batch progress bar */}
      {batchTotal > 1 && batchDone < batchTotal && stage > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '99px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '99px', background: 'rgb(29,83,148)',
                          width: `${(batchDone / batchTotal) * 100}%`,
                          transition: 'width 0.5s ease' }} />
          </div>
          <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '4px', textAlign: 'center' }}>
            {batchDone} traité{batchDone > 1 ? 's' : ''} sur {batchTotal}…
          </div>
        </div>
      )}

      {/* Result summary — shown after job completes */}
      {job && stage >= 5 && (
        <div style={{ marginTop: '14px', padding: '14px', background: '#f0fdf4',
                      borderRadius: '10px', border: '1px solid #86efac', animation: 'ingestFadeUp 0.4s ease both' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#15803d', marginBottom: '10px',
                        display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> Ingestion terminée avec succès
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            {[
              ['Institution', job.institution || '—'],
              ['Domaine', DOMAIN_LABELS[job.document_type] || job.document_type || '—'],
              ['Enregistrements', `${job.extracted_payload?.length ?? '—'} lignes`],
              ['Qualité extraction', job.extraction_quality != null ? `${Math.round(job.extraction_quality > 1 ? job.extraction_quality : job.extraction_quality * 100)}%` : '—'],
              ['Anomalies', job.anomalies?.length ? `${job.anomalies.length} signalée(s)` : 'Aucune'],
              ['Statut BDD', 'Chargé ✓'],
            ].map(([k, v]) => (
              <div key={k} style={{ fontSize: '0.72rem' }}>
                <span style={{ color: '#64748b' }}>{k} </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{v}</span>
              </div>
            ))}
          </div>
          {job.extracted_payload?.length > 0 && (
            <details style={{ marginTop: '10px' }}>
              <summary style={{ fontSize: '0.72rem', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}>
                Aperçu des données ({job.extracted_payload.length} lignes)
              </summary>
              <div style={{ marginTop: '8px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.65rem' }}>
                  <thead>
                    <tr>
                      {Object.keys(job.extracted_payload[0] || {}).slice(0, 6).map((h) => (
                        <th key={h} style={{ padding: '4px 6px', background: '#e0f2fe',
                                            color: '#0369a1', fontWeight: 700, textAlign: 'left',
                                            borderRadius: '4px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {job.extracted_payload.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).slice(0, 6).map((v, j) => (
                          <td key={j} style={{ padding: '3px 6px', color: '#334155',
                                              borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                            {String(v ?? '').slice(0, 20)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {job.extracted_payload.length > 5 && (
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', textAlign: 'center' }}>
                    + {job.extracted_payload.length - 5} lignes supplémentaires dans la base
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Anomalies warning (only while not yet stored) */}
      {job?.anomalies?.length > 0 && stage < 5 && (
        <div style={{ marginTop: '12px', padding: '10px 12px', background: '#fffbeb',
                      borderRadius: '8px', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <AlertTriangle size={12} /> {job.anomalies.length} anomalie(s) détectée(s) — révision recommandée
          </div>
        </div>
      )}
    </div>
  )
}

// ── Domain colour palette ──────────────────────────────────────────────────────
const DOMAIN_COLORS = {
  'Académique':         '#2563eb',
  'Finance':            '#059669',
  'Ressources Humaines':'#7c3aed',
  'ESG / Env.':         '#16a34a',
  'Recherche':          '#0891b2',
  'Employabilité':      '#d97706',
  'Infrastructure':     '#dc2626',
  'Partenariats':       '#9333ea',
}
function domainColor(domain) { return DOMAIN_COLORS[domain] || 'rgb(29,83,148)' }

// ── Force-directed network graph ───────────────────────────────────────────────
function NetworkGraph({ rows, newRowId }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)   // { x, y, node }
  const [positions, setPositions] = useState([]) // [{ id, x, y }]
  const W = 420, H = 260

  // Build nodes + links from rows
  const { nodes, links } = useMemo(() => {
    const institutionSet = {}
    rows.forEach(r => { institutionSet[r.institution] = true })

    const instNodes = Object.keys(institutionSet).map(code => ({
      id: `inst_${code}`, type: 'institution', label: code,
      r: 22, color: 'rgb(29,83,148)', textColor: 'white',
    }))

    const fileNodes = rows.map(r => ({
      id: r.id,
      type: 'file',
      label: r.domain,
      institution: r.institution,
      records: r.records,
      status: r.status,
      ts: r.ts,
      isNew: r.id === newRowId,
      r: Math.max(10, Math.min(18, typeof r.records === 'number' ? 8 + r.records * 0.15 : 10)),
      color: r.status === 'stored' ? domainColor(r.domain) : '#ef4444',
      textColor: 'white',
    }))

    const links = rows.map(r => ({
      source: `inst_${r.institution}`,
      target: r.id,
    }))

    return { nodes: [...instNodes, ...fileNodes], links }
  }, [rows, newRowId])

  // Run D3 force simulation, capture final positions
  useEffect(() => {
    if (!nodes.length) return
    const sim = forceSimulation(nodes.map(n => ({ ...n })))
      .force('link', forceLink(links.map(l => ({ ...l }))).id(d => d.id).distance(70).strength(1))
      .force('charge', forceManyBody().strength(-160))
      .force('center', forceCenter(W / 2, H / 2))
      .force('collide', forceCollide(d => d.r + 8))
      .stop()

    // Run synchronously for 300 ticks then snapshot
    for (let i = 0; i < 300; i++) sim.tick()
    setPositions(sim.nodes().map(n => ({
      id: n.id, x: Math.max(n.r + 4, Math.min(W - n.r - 4, n.x)),
      y: Math.max(n.r + 4, Math.min(H - n.r - 4, n.y)),
    })))
  }, [nodes.length, links.length])

  const posMap = useMemo(() => {
    const m = {}
    positions.forEach(p => { m[p.id] = p })
    return m
  }, [positions])

  if (!rows.length) return null

  return (
    <div style={{ position: 'relative', marginTop: '12px' }}>
      <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
        Graphe de connexion — données en direct
      </div>
      <svg ref={svgRef} width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'visible' }}>

        {/* Links */}
        {links.map((l, i) => {
          const s = posMap[l.source], t = posMap[l.target]
          if (!s || !t) return null
          const fileNode = nodes.find(n => n.id === l.target)
          const isNew = fileNode?.isNew
          return (
            <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke={isNew ? '#86efac' : '#cbd5e1'}
              strokeWidth={isNew ? 2 : 1.2}
              strokeDasharray={isNew ? 'none' : '5 3'}
              style={{ transition: 'stroke 0.5s' }}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(node => {
          const pos = posMap[node.id]
          if (!pos) return null
          const isInst = node.type === 'institution'
          const isNew = node.isNew
          const isHovered = tooltip?.node?.id === node.id
          return (
            <g key={node.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={e => {
                const rect = svgRef.current?.getBoundingClientRect()
                if (rect) setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, node })
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Glow ring for new nodes */}
              {isNew && (
                <circle cx={pos.x} cy={pos.y} r={node.r + 6}
                  fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.5"
                  style={{ animation: 'ingestGlow 1.5s ease infinite' }}
                />
              )}
              {/* Hover ring */}
              {isHovered && (
                <circle cx={pos.x} cy={pos.y} r={node.r + 5}
                  fill="none" stroke={node.color} strokeWidth="2" opacity="0.35"
                />
              )}
              <circle cx={pos.x} cy={pos.y} r={isHovered ? node.r + 2 : node.r}
                fill={node.color}
                opacity={isHovered ? 1 : isInst ? 1 : 0.85}
                style={{ transition: 'r 0.15s, opacity 0.15s', filter: isHovered ? `drop-shadow(0 0 6px ${node.color}80)` : 'none' }}
              />
              {/* Label */}
              <text x={pos.x} y={pos.y + (isInst ? 5 : 4)} textAnchor="middle"
                fontSize={isInst ? 10 : 8} fontWeight={isInst ? 800 : 600}
                fill={node.textColor} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                {isInst ? node.label : node.label.split(' ')[0]}
              </text>
              {/* Records count for file nodes */}
              {!isInst && typeof node.records === 'number' && (
                <text x={pos.x} y={pos.y + node.r + 11} textAnchor="middle"
                  fontSize={7} fill="#64748b" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {node.records} enr.
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Floating tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: Math.min(tooltip.x + 12, W - 180),
          top: tooltip.y - 10,
          background: 'white',
          border: `1.5px solid ${tooltip.node.color}50`,
          borderRadius: '10px',
          padding: '10px 14px',
          boxShadow: `0 8px 24px ${tooltip.node.color}25`,
          fontSize: '0.72rem',
          minWidth: '170px',
          zIndex: 60,
          pointerEvents: 'none',
          animation: 'ingestFadeUp 0.12s ease both',
        }}>
          {tooltip.node.type === 'institution' ? (
            <>
              <div style={{ fontWeight: 800, color: 'rgb(29,83,148)', fontSize: '0.82rem', marginBottom: '4px' }}>
                🏛 {tooltip.node.label}
              </div>
              <div style={{ color: '#64748b' }}>
                {rows.filter(r => r.institution === tooltip.node.label).length} fichier(s) ingéré(s)
              </div>
              <div style={{ color: '#64748b', marginTop: '2px' }}>
                {rows.filter(r => r.institution === tooltip.node.label && r.status === 'stored').length} chargé(s) ·{' '}
                {rows.filter(r => r.institution === tooltip.node.label && r.status === 'failed').length} erreur(s)
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tooltip.node.color, flexShrink: 0 }} />
                <strong style={{ color: '#0f172a' }}>{tooltip.node.label}</strong>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px', color: '#64748b' }}>
                <span>Institution</span><strong style={{ color: '#0f172a' }}>{tooltip.node.institution}</strong>
                <span>Enreg.</span><strong style={{ color: tooltip.node.color }}>{typeof tooltip.node.records === 'number' ? tooltip.node.records : '—'}</strong>
                <span>Statut</span>
                <strong style={{ color: tooltip.node.status === 'stored' ? '#0ea5e9' : '#dc2626' }}>
                  {tooltip.node.status === 'stored' ? 'Chargé ✓' : 'Erreur ✗'}
                </strong>
                <span>Heure</span><strong style={{ color: '#475569' }}>{tooltip.node.ts}</strong>
              </div>
            </>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.67rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="rgb(29,83,148)" /></svg> Institution
        </span>
        <span style={{ fontSize: '0.67rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#059669" /></svg> Chargé
        </span>
        <span style={{ fontSize: '0.67rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="10" height="10"><circle cx="5" cy="5" r="5" fill="#ef4444" /></svg> Erreur
        </span>
        <span style={{ fontSize: '0.67rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <svg width="22" height="10"><line x1="0" y1="5" x2="22" y2="5" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 2" /></svg> Connexion
        </span>
      </div>
    </div>
  )
}

// ── Live DB Feed ───────────────────────────────────────────────────────────────
function LiveFeed({ rows, newRowId }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        <Database size={15} color="rgb(29,83,148)" />
        Données chargées — base de données en direct
        {newRowId && (
          <span style={{ marginLeft: 'auto', fontSize: '0.68rem', background: '#dcfce7',
                         color: '#16a34a', padding: '2px 8px', borderRadius: '20px',
                         fontWeight: 600, animation: 'ingestFadeUp 0.3s ease both' }}>
            ✓ Nouvelle ligne
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
          Aucune donnée chargée dans cette session.<br />
          <span style={{ fontSize: '0.72rem' }}>Les nouvelles entrées apparaîtront ici.</span>
        </div>
      ) : (
        <>
          <NetworkGraph rows={rows} newRowId={newRowId} />
          {/* Compact row list below the graph */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginTop: '10px' }}>
            {rows.map((row) => {
              const isNew = row.id === newRowId
              const color = domainColor(row.domain)
              return (
                <div key={row.id} style={{
                  display: 'grid', gridTemplateColumns: '8px 1fr 1fr auto auto',
                  gap: '8px', padding: '6px 10px', borderRadius: '7px', fontSize: '0.72rem',
                  alignItems: 'center',
                  animation: isNew ? 'ingestRow 1.2s ease both' : 'none',
                  background: isNew ? '#f0fdf4' : '#fafafa',
                  border: `1px solid ${isNew ? '#86efac' : '#f1f5f9'}`,
                  transition: 'border-color 0.5s',
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color }} />
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.institution}</span>
                  <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.domain}</span>
                  <StatusBadge status={row.status} />
                  <span style={{ color: '#cbd5e1', fontSize: '0.65rem' }}>{row.ts}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ── Jobs List ─────────────────────────────────────────────────────────────────
function JobsList({ jobs }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>
        <Clock size={15} color="rgb(29,83,148)" />
        Historique des traitements
      </div>
      {jobs.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
          Aucun traitement en cours.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
          {jobs.slice(0, 8).map((job) => (
            <div key={job.id} style={{ display: 'flex', alignItems: 'center', gap: '10px',
                                       padding: '8px 10px', borderRadius: '8px',
                                       background: '#fafafa', border: '1px solid #f1f5f9',
                                       animation: 'ingestSlideIn 0.3s ease both' }}>
              <FileText size={14} color="#94a3b8" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a',
                               whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {job.filename || job.id?.slice(0, 12) + '…'}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                  {job.institution} · {DOMAIN_LABELS[job.document_type] || job.document_type}
                </div>
              </div>
              <StatusBadge status={job.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Scenario Card ─────────────────────────────────────────────────────────────
function ScenarioCard({ scenario, running, onRun, disabled }) {
  const alertColor = scenario.alert ? '#dc2626' : '#16a34a'
  return (
    <div style={{
      ...styles.scenarioCard,
      opacity: disabled && !running ? 0.55 : 1,
      border: running ? '2px solid rgb(29,83,148)' : '1.5px solid #e2e8f0',
      animation: running ? 'ingestGlow 1.2s ease-in-out infinite' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{scenario.label}</div>
          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
            {scenario.institution} · {scenario.domain}
          </div>
        </div>
        {running && (
          <div style={{ width: '16px', height: '16px', border: '2px solid rgb(29,83,148)',
                        borderTopColor: 'transparent', borderRadius: '50%',
                        animation: 'ingestSpin 0.8s linear infinite', flexShrink: 0 }} />
        )}
      </div>

      {scenario.alert && (
        <div style={{ marginTop: '8px', fontSize: '0.68rem', color: alertColor,
                      background: '#fef2f2', padding: '4px 8px', borderRadius: '6px',
                      display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={10} /> {scenario.alert}
        </div>
      )}
      {!scenario.alert && (
        <div style={{ marginTop: '8px', fontSize: '0.68rem', color: '#16a34a',
                      background: '#f0fdf4', padding: '4px 8px', borderRadius: '6px' }}>
          ✓ Données propres — aucune alerte
        </div>
      )}

      <button
        onClick={onRun} disabled={disabled}
        style={{ ...styles.runBtn, background: running ? '#e0f2fe' : 'rgb(29,83,148)',
                 color: running ? 'rgb(29,83,148)' : 'white', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        {running ? <><span style={{ animation: 'ingestPulse 0.8s ease-in-out infinite' }}>⚡</span> En cours…</> : <><Play size={12} /> Lancer le scénario</>}
      </button>
    </div>
  )
}

function ScenarioSkeleton() {
  return (
    <div style={{ ...styles.scenarioCard, background: '#f8fafc' }}>
      {[60, 80, 40, 100].map((w, i) => (
        <div key={i} style={{ height: '10px', borderRadius: '4px', background: '#e2e8f0',
                               width: `${w}%`, marginBottom: '8px',
                               animation: 'ingestPulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

// ── Flow diagram helpers ───────────────────────────────────────────────────────
function FlowNode({ icon, label, sub, color, active }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  animation: active ? 'ingestGlow 1s ease-in-out infinite' : 'none' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem', transition: 'transform 0.3s ease',
                    transform: active ? 'scale(1.08)' : 'scale(1)' }}>
        {icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f172a' }}>{label}</div>
        <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{sub}</div>
      </div>
    </div>
  )
}

function FlowArrow({ active }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative',
                  height: '24px', minWidth: '60px' }}>
      <div style={{ width: '100%', height: '2px', background: active ? 'rgb(29,83,148)' : '#e2e8f0',
                    transition: 'background 0.4s ease', position: 'relative', overflow: 'visible' }}>
        {active && (
          <div style={{ position: 'absolute', top: '-5px', width: '12px', height: '12px',
                        borderRadius: '50%', background: 'rgb(29,83,148)',
                        animation: 'ingestPacket 1.4s ease-in-out infinite' }} />
        )}
      </div>
      <ChevronRight size={16} color={active ? 'rgb(29,83,148)' : '#e2e8f0'}
        style={{ position: 'absolute', right: '-8px', transition: 'color 0.4s ease' }} />
    </div>
  )
}

// ── Email Ingestion Tab ───────────────────────────────────────────────────────
function EmailTab({ lang }) {
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)

  const [status, setStatus]       = useState(null)   // email_service stats
  const [events, setEvents]       = useState([])      // SSE event feed
  const [connected, setConnected] = useState(false)
  const esRef = useRef(null)

  // Refresh status every 15 s
  useEffect(() => {
    const refresh = () => etlEmailStatus().then(setStatus).catch(() => {})
    refresh()
    const t = setInterval(refresh, 15000)
    return () => clearInterval(t)
  }, [])

  // SSE connection
  useEffect(() => {
    const es = etlEmailEvents()
    esRef.current = es

    es.onopen = () => setConnected(true)
    es.onerror = () => setConnected(false)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'connected') {
          setStatus(prev => ({ ...prev, ...data }))
          return
        }
        setEvents(prev => [{ ...data, _id: Date.now() }, ...prev].slice(0, 40))
      } catch { /* ignore parse errors */ }
    }

    return () => { es.close(); setConnected(false) }
  }, [])

  const isEnabled = status?.enabled === true

  // Simulate a demo event (injects a fake email_received event for demos)
  async function simulateDemo() {
    await etlEmailSimulate({
      type: 'email_received',
      from: 'directeur@ept.utm.tn',
      subject: 'EPT finance S1_2025 — rapport mensuel',
      institution: 'EPT',
      domain: 'finance',
      period: 'S1_2025',
      attachments: 1,
    })
    await etlEmailSimulate({
      type: 'processing_start',
      filename: 'budget_EPT_S1_2025.pdf',
      institution: 'EPT',
      domain: 'finance',
      period: 'S1_2025',
    })
    setTimeout(() => etlEmailSimulate({
      type: 'job_done',
      filename: 'budget_EPT_S1_2025.pdf',
      job_id: 'demo-' + Date.now(),
      institution: 'EPT',
      domain: 'finance',
      status: 'stored',
      records: 12,
      quality: 94,
    }), 2000)
  }

  const EVENT_ICON = {
    email_received:   <Mail size={14} color="#2563eb" />,
    processing_start: <Cpu size={14} color="#d97706" />,
    job_done:         <MailCheck size={14} color="#16a34a" />,
    job_error:        <MailX size={14} color="#dc2626" />,
    connected:        <Radio size={14} color="#16a34a" />,
  }

  const EVENT_COLOR = {
    email_received:   '#eff6ff',
    processing_start: '#fffbeb',
    job_done:         '#f0fdf4',
    job_error:        '#fef2f2',
    connected:        '#f0fdf4',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

      {/* Left — Config & Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Status card */}
        <div style={{ ...styles.card, border: `1.5px solid ${isEnabled ? '#bbf7d0' : '#e2e8f0'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={styles.cardTitle}>
              <Inbox size={16} color="rgb(29,83,148)" />
              {tx('Ingestion par Email', 'الاستيراد عبر البريد')}
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '3px 10px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 700,
              background: isEnabled ? '#dcfce7' : '#f1f5f9',
              color: isEnabled ? '#15803d' : '#64748b',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%',
                             background: isEnabled ? '#22c55e' : '#94a3b8',
                             animation: isEnabled ? 'ingestBlink 1.5s ease-in-out infinite' : 'none' }} />
              {isEnabled ? tx('Actif', 'نشط') : tx('Inactif', 'غير نشط')}
            </span>
          </div>

          {isEnabled ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Row label={tx('Boîte surveillée', 'البريد المراقب')} value={status?.inbox || '—'} />
              <Row label={tx('Serveur IMAP', 'خادم IMAP')}         value={status?.imap_host || '—'} />
              <Row label={tx('Intervalle', 'الفترة الزمنية')}      value={`${status?.poll_seconds ?? 30}s`} />
              <Row label={tx('Dernière vérif.', 'آخر تحقق')}
                   value={status?.last_checked ? new Date(status.last_checked).toLocaleTimeString('fr-FR') : '—'} />
              <Row label={tx('Emails traités', 'رسائل تمت معالجتها')}  value={status?.emails_processed ?? 0} />
              <Row label={tx('Pièces jointes', 'المرفقات المعالجة')} value={status?.attachments_processed ?? 0} />
              {status?.error && (
                <div style={{ padding: '8px 10px', borderRadius: '8px', background: '#fef2f2',
                              color: '#dc2626', fontSize: '0.72rem', display: 'flex', gap: '6px' }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
                  {status.error}
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.6 }}>
              {tx(
                'Activez l\'ingestion email en ajoutant ces variables dans votre fichier .env du ETL backend :',
                'فعّل استيراد البريد بإضافة هذه المتغيرات في ملف .env الخاص بـ ETL backend :'
              )}
              <pre style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '8px',
                            background: '#f8fafc', border: '1px solid #e2e8f0',
                            fontSize: '0.72rem', color: '#334155', overflowX: 'auto', lineHeight: 1.7 }}>
{`EMAIL_ENABLED=true
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_PORT=993
EMAIL_ADDRESS=votre@email.com
EMAIL_PASSWORD=mot_de_passe_app
EMAIL_POLL_SECONDS=30
EMAIL_INSTITUTION_DEFAULT=EPT
EMAIL_DOMAIN_DEFAULT=academic
EMAIL_PERIOD_DEFAULT=S1_2025`}
              </pre>
              <div style={{ marginTop: '8px', fontSize: '0.71rem', color: '#94a3b8' }}>
                {tx(
                  'Pour Gmail, utilisez un "Mot de passe d\'application" (pas votre mot de passe habituel).',
                  'لـ Gmail، استخدم "كلمة مرور التطبيق" وليس كلمتك السرية العادية.'
                )}
              </div>
            </div>
          )}
        </div>

        {/* Convention card */}
        <div style={styles.card}>
          <div style={{ ...styles.cardTitle, marginBottom: '12px' }}>
            <Settings2 size={15} color="rgb(29,83,148)" />
            {tx('Convention d\'objet email', 'تنسيق موضوع البريد')}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.7 }}>
            {tx(
              'Le système détecte automatiquement l\'institution, le domaine et la période à partir de l\'objet :',
              'يكتشف النظام تلقائياً المؤسسة والمجال والفترة من موضوع الرسالة :'
            )}
          </div>
          <pre style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '8px',
                        background: '#f8fafc', border: '1px solid #e2e8f0',
                        fontSize: '0.73rem', color: '#334155', lineHeight: 1.8 }}>
{`EPT finance S1_2025
INSAT academic 2024
FSB hr S2_2024
IHEC research 2024-2025`}
          </pre>
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              [tx('Institutions', 'المؤسسات'), 'EPT · INSAT · SUPCOM · IHEC · FSB · ESAC'],
              [tx('Domaines', 'المجالات'), 'academic · finance · hr · esg · research · employment · infrastructure · partnership'],
              [tx('Période', 'الفترة'), 'S1_2025 · S2_2024 · 2024 · 2024-2025'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: '8px', fontSize: '0.7rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600, minWidth: '70px' }}>{k}</span>
                <span style={{ color: '#94a3b8' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Demo button */}
        <button
          onClick={simulateDemo}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                   padding: '10px', borderRadius: '10px', border: '1.5px dashed #cbd5e1',
                   background: 'white', color: '#475569', fontSize: '0.8rem', fontWeight: 600,
                   cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
        >
          <Sparkles size={14} color="rgb(29,83,148)" />
          {tx('Simuler une réception email (démo)', 'محاكاة استقبال بريد (عرض توضيحي)')}
        </button>
      </div>

      {/* Right — Live event feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={styles.card}>
          <div style={{ ...styles.cardTitle, marginBottom: '14px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Radio size={15} color={connected ? '#16a34a' : '#94a3b8'} />
              {tx('Flux temps réel', 'التدفق الفوري')}
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 600,
                           color: connected ? '#16a34a' : '#94a3b8' }}>
              {connected ? tx('• Connecté', '• متصل') : tx('○ Déconnecté', '○ غير متصل')}
            </span>
          </div>

          {events.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center',
                          color: '#94a3b8', fontSize: '0.8rem' }}>
              <Mail size={32} color="#e2e8f0" style={{ marginBottom: '10px' }} />
              <div style={{ fontWeight: 600 }}>
                {tx('En attente d\'emails...', 'في انتظار رسائل البريد...')}
              </div>
              <div style={{ fontSize: '0.72rem', marginTop: '4px' }}>
                {tx(
                  'Les événements apparaîtront ici dès qu\'un email sera reçu',
                  'ستظهر الأحداث هنا فور استلام بريد إلكتروني'
                )}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto' }}>
              {events.map((ev) => (
                <EmailEvent key={ev._id} event={ev} icon={EVENT_ICON[ev.type]} bg={EVENT_COLOR[ev.type]} lang={lang} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.78rem' }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#0f172a', fontWeight: 600, wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  )
}

function EmailEvent({ event, icon, bg, lang }) {
  const tx = (fr, ar) => (lang === 'ar' ? ar : fr)
  const TYPE_LABEL = {
    email_received:   tx('Email reçu', 'بريد مستلم'),
    processing_start: tx('Traitement', 'جارٍ المعالجة'),
    job_done:         tx('Terminé', 'مكتمل'),
    job_error:        tx('Erreur', 'خطأ'),
    connected:        tx('Connecté', 'متصل'),
  }
  const time = event.ts ? new Date(event.ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''

  return (
    <div style={{ padding: '10px 12px', borderRadius: '10px', background: bg || '#f8fafc',
                  border: '1px solid #e2e8f0', fontSize: '0.76rem', animation: 'ingestSlideIn 0.3s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#0f172a' }}>
          {icon}
          {TYPE_LABEL[event.type] || event.type}
          {event.simulated && (
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 400 }}>(démo)</span>
          )}
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.68rem' }}>{time}</span>
      </div>

      {event.type === 'email_received' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#475569' }}>
          <div><span style={{ color: '#64748b' }}>De :</span> {event.from}</div>
          <div><span style={{ color: '#64748b' }}>Objet :</span> {event.subject}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            {event.institution && <Chip label={event.institution} color="#2563eb" />}
            {event.domain && <Chip label={event.domain} color="#7c3aed" />}
            {event.period && <Chip label={event.period} color="#0891b2" />}
            {event.attachments && <Chip label={`${event.attachments} pièce(s)`} color="#64748b" />}
          </div>
        </div>
      )}

      {event.type === 'processing_start' && (
        <div style={{ color: '#475569' }}>
          <span style={{ color: '#64748b' }}>Fichier :</span> {event.filename}
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            {event.institution && <Chip label={event.institution} color="#2563eb" />}
            {event.domain && <Chip label={event.domain} color="#7c3aed" />}
          </div>
        </div>
      )}

      {event.type === 'job_done' && (
        <div style={{ color: '#475569' }}>
          <div><span style={{ color: '#64748b' }}>Fichier :</span> {event.filename}</div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            <Chip label={`${event.records ?? 0} enreg.`} color="#16a34a" />
            {event.quality > 0 && <Chip label={`Qualité ${event.quality}%`} color="#0891b2" />}
            <Chip label={event.status} color="#64748b" />
          </div>
        </div>
      )}

      {event.type === 'job_error' && (
        <div style={{ color: '#dc2626', fontSize: '0.72rem' }}>
          {event.filename && <div>{event.filename}</div>}
          {event.error}
        </div>
      )}
    </div>
  )
}

function Chip({ label, color }) {
  return (
    <span style={{ padding: '1px 7px', borderRadius: '20px', fontSize: '0.65rem',
                   fontWeight: 600, background: `${color}18`, color }}>
      {label}
    </span>
  )
}

// ── Small reusable components ─────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { color: '#64748b', label: status, dot: '#94a3b8' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px',
                   padding: '2px 8px', borderRadius: '20px', fontSize: '0.68rem',
                   fontWeight: 600, background: `${meta.color}14`, color: meta.color,
                   whiteSpace: 'nowrap' }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.dot,
                     animation: status === 'processing' ? 'ingestBlink 1s ease-in-out infinite' : 'none' }} />
      {meta.label}
    </span>
  )
}

function EtlStatus({ online }) {
  if (online === null) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.73rem',
                  padding: '5px 10px', borderRadius: '20px',
                  background: online ? '#f0fdf4' : '#fef2f2',
                  color: online ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
      {online ? <Wifi size={12} /> : <WifiOff size={12} />}
      ETL {online ? 'connecté' : 'hors ligne'}
    </div>
  )
}

function TabBtn({ active, onClick, icon, children }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '9px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
      fontSize: '0.82rem', fontWeight: active ? 700 : 500, fontFamily: 'inherit',
      background: active ? 'rgb(29,83,148)' : 'white',
      color: active ? 'white' : '#64748b',
      boxShadow: active ? '0 2px 8px rgba(29,83,148,0.25)' : 'none',
      transition: 'all 0.2s ease',
    }}>
      {icon}{children}
    </button>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  h1: {
    fontSize: '1.4rem', fontWeight: 800, color: '#0f172a',
    letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px',
  },
  subtitle: { color: '#94a3b8', fontSize: '0.82rem', marginTop: '4px' },
  tabs: { display: 'flex', gap: '8px', background: 'white', padding: '6px',
          borderRadius: '12px', border: '1px solid #e2e8f0', alignSelf: 'flex-start' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' },
  dropZone: {
    border: '2px dashed #cbd5e1', borderRadius: '16px', padding: '40px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '10px', cursor: 'pointer', background: 'white', transition: 'all 0.2s ease',
    position: 'relative', overflow: 'hidden', minHeight: '200px',
    userSelect: 'none',
  },
  dropZoneActive: {
    border: '2px dashed rgb(29,83,148)', background: '#eff6ff',
    transform: 'scale(1.01)',
  },
  folderWrap: { transition: 'transform 0.2s ease' },
  dropTitle: { fontSize: '1rem', fontWeight: 700, color: '#0f172a' },
  dropSub:   { fontSize: '0.82rem', color: '#64748b' },
  dropFormats: { fontSize: '0.7rem', color: '#94a3b8', background: '#f8fafc',
                 padding: '4px 12px', borderRadius: '20px', marginTop: '4px' },
  flyParticle: {
    position: 'absolute', bottom: '40px', animation: 'ingestFly 0.8s ease-out both',
    pointerEvents: 'none',
  },
  configRow: { display: 'flex', gap: '12px' },
  label:  { fontSize: '0.72rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '5px' },
  select: { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
            fontSize: '0.8rem', color: '#0f172a', background: 'white', fontFamily: 'inherit', cursor: 'pointer' },
  input:  { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
            fontSize: '0.8rem', color: '#0f172a', boxSizing: 'border-box', fontFamily: 'inherit' },
  card: {
    background: 'white', borderRadius: '14px', padding: '16px 18px',
    border: '1px solid #e2e8f0',
  },
  cardTitle: {
    fontSize: '0.8rem', fontWeight: 700, color: '#0f172a',
    display: 'flex', alignItems: 'center', gap: '7px',
  },
  sectionTitle: { fontSize: '0.8rem', fontWeight: 700, color: '#64748b',
                  textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' },
  scenarioGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  scenarioCard: {
    background: 'white', borderRadius: '12px', padding: '14px', border: '1.5px solid #e2e8f0',
    display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s ease',
  },
  runBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
    padding: '8px 12px', borderRadius: '8px', border: 'none',
    fontSize: '0.75rem', fontWeight: 600, transition: 'all 0.2s ease', fontFamily: 'inherit',
  },
  flowCard: {
    background: 'white', borderRadius: '14px', padding: '20px 24px',
    border: '1px solid #e2e8f0',
  },
  flowTitle: {
    fontSize: '0.82rem', fontWeight: 700, color: '#0f172a',
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px',
  },
  flowDiagram: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0',
  },
  refreshBtn: {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px',
    border: '1.5px solid #e2e8f0', borderRadius: '8px', background: 'white',
    fontSize: '0.78rem', color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
  },
}
