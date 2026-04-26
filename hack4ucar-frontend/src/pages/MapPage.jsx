import 'leaflet/dist/leaflet.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'
import { useState, useEffect, useRef, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Tooltip, Popup, useMap } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { getInstitutions } from '../api/client'
import { MapPin, Search, ChevronRight, Navigation } from 'lucide-react'

const TUNISIA_CENTER = [33.8869, 9.5375]
const TUNISIA_ZOOM = 7

const INSTITUTION_COORDS = {
  // Bizerte governorate
  'FSB':    { lat: 37.2650, lng:  9.8760 },  // Jarzouna
  'ENITAB': { lat: 37.2083, lng:  9.8200 },  // Menzel Jemil
  'ISGB':   { lat: 37.2720, lng:  9.8640 },  // Bizerte centre
  'ISSATM': { lat: 37.0415, lng:  9.6650 },  // Mateur
  'ISSMB':  { lat: 37.1575, lng:  9.7900 },  // Menzel Bourguiba

  // Nabeul governorate
  'FSEGN':  { lat: 36.4561, lng: 10.7376 },  // Nabeul
  'IPEIN':  { lat: 36.4530, lng: 10.7350 },  // Nabeul
  'ISLN':   { lat: 36.3994, lng: 10.6131 },  // Hammamet
  'ISETH':  { lat: 36.5780, lng: 10.8600 },  // Korba

  // Zaghouan governorate
  'ISGZ':   { lat: 36.4029, lng: 10.1430 },  // Zaghouan city
  'ENSTAB': { lat: 36.7160, lng: 10.3780 },  // Borj Cedria
  'ISSTE':  { lat: 36.7130, lng: 10.3820 },  // Borj Cedria
  'ISTEUB': { lat: 36.7190, lng: 10.3750 },  // Borj Cedria

  // Ariana governorate — La Soukra cluster
  'ENIC':   { lat: 36.8620, lng: 10.1590 },
  'ESIAT':  { lat: 36.8600, lng: 10.1570 },
  'ISTIC':  { lat: 36.8640, lng: 10.1610 },
  'IPSETC': { lat: 36.8580, lng: 10.1550 },
  // Ariana — Raoued
  'ESAC':   { lat: 36.8940, lng: 10.1550 },
  'SUPCOM': { lat: 36.8910, lng: 10.1520 },
  // Ariana — La Rabta
  'INAT':   { lat: 36.8360, lng: 10.1780 },

  // Tunis governorate — centre/inner
  'FSJPST': { lat: 36.8190, lng: 10.1660 },  // Tunis centre
  'ESSA':   { lat: 36.8390, lng: 10.1620 },  // Bab Saadoun
  'INSAT':  { lat: 36.8420, lng: 10.2010 },  // Centre Urbain Nord
  'INTES':  { lat: 36.8240, lng: 10.1810 },  // Montfleury
  'IPEIEM': { lat: 36.8310, lng: 10.1700 },  // El Manar
  'ISCE':   { lat: 36.8100, lng: 10.0980 },  // Manouba
  // Tunis — northern suburbs (La Marsa / Carthage / Sidi Bou Said)
  'ENAU':   { lat: 36.8688, lng: 10.3468 },  // Sidi Bou Said
  'EPT':    { lat: 36.8760, lng: 10.3180 },  // La Marsa
  'IPEST':  { lat: 36.8740, lng: 10.3220 },  // La Marsa
  'IHEC':   { lat: 36.8470, lng: 10.3300 },  // Carthage
  'ISAMM':  { lat: 36.8500, lng: 10.3340 },  // Carthage Dermech
  'ISBAT':  { lat: 36.8330, lng: 10.3000 },  // Le Kram
  // Tunis — south-east
  'ESSTHS': { lat: 36.7420, lng: 10.3200 },  // Sidi Dhrif
}

const TYPE_COLOR = { faculte: '#3B82F6', ecole: '#F59E0B', institut: '#10B981' }
const TYPE_LABEL = { faculte: 'Faculté', ecole: 'École', institut: 'Institut' }
const TYPE_FILTERS = ['Tous', 'faculte', 'ecole', 'institut']

function getCoords(code) {
  const c = INSTITUTION_COORDS[code]
  return c ? [c.lat, c.lng] : [...TUNISIA_CENTER]
}

function getType(inst) {
  const t = (inst.type || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (t.includes('facult')) return 'faculte'
  if (t.includes('cole')) return 'ecole'
  return 'institut'
}

function createMarkerIcon(type, selected = false) {
  const color = TYPE_COLOR[type] || '#64748b'
  const size = selected ? 18 : 14
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 5)],
  })
}

function MapController({ mapRef, flyTo }) {
  const map = useMap()
  useEffect(() => { mapRef.current = map }, [map, mapRef])
  useEffect(() => {
    if (!flyTo) return
    map.flyTo(flyTo.coords, 14, { duration: 0.8 })
  }, [flyTo, map])
  return null
}

export default function MapPage() {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const markerRefs = useRef({})
  const [institutions, setInstitutions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('Tous')
  const [selectedId, setSelectedId] = useState(null)
  const [flyTo, setFlyTo] = useState(null)

  useEffect(() => {
    getInstitutions()
      .then(setInstitutions)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = institutions.filter((inst) => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      inst.name_fr.toLowerCase().includes(q) ||
      (inst.code || '').toLowerCase().includes(q) ||
      (inst.governorate || '').toLowerCase().includes(q)
    const matchType = typeFilter === 'Tous' || getType(inst) === typeFilter
    return matchSearch && matchType
  })

  const flyToInstitution = useCallback((inst) => {
    const coords = getCoords(inst.code)
    setSelectedId(inst.id)
    setFlyTo({ coords, id: inst.id, ts: Date.now() })
    setTimeout(() => {
      try { markerRefs.current[inst.id]?.openPopup() } catch (_) {}
    }, 950)
  }, [])

  return (
    <>
      <style>{`@media (max-width: 768px) { .map-left-panel { display: none !important; } }`}</style>
      <div style={{ margin: '-28px -32px', height: 'calc(100vh - 70px)', display: 'flex', overflow: 'hidden' }}>

        {/* ── Left panel ── */}
        <div className="map-left-panel" style={{ width: '280px', flexShrink: 0, background: 'white', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
              <MapPin size={16} color="rgb(29,83,148)" />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Carte des institutions</span>
            </div>
            <span style={{ fontSize: '0.71rem', color: '#94a3b8' }}>{institutions.length} établissements</span>
          </div>

          {/* Search + type filter */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, code, gouvernorat…"
                style={{ width: '100%', padding: '7px 10px 7px 26px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.76rem', fontFamily: 'Inter, sans-serif', outline: 'none', background: '#fafbff', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {TYPE_FILTERS.map((t) => (
                <button key={t} onClick={() => setTypeFilter(t)}
                  style={{ flex: 1, padding: '4px 0', borderRadius: '6px', border: 'none', background: typeFilter === t ? 'rgb(29,83,148)' : '#f1f5f9', color: typeFilter === t ? 'white' : '#64748b', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'all 120ms' }}>
                  {t === 'Tous' ? 'Tous' : TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Institution list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '28px', fontSize: '0.78rem' }}>Chargement…</p>
            ) : filtered.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#cbd5e1', padding: '28px', fontSize: '0.75rem' }}>Aucun résultat</p>
            ) : filtered.map((inst) => {
              const type = getType(inst)
              const isSelected = inst.id === selectedId
              return (
                <div key={inst.id}
                  onClick={() => flyToInstitution(inst)}
                  style={{ padding: '9px 14px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer', background: isSelected ? 'rgba(29,83,148,0.04)' : 'white', borderLeft: `3px solid ${isSelected ? 'rgb(29,83,148)' : 'transparent'}`, transition: 'background 120ms' }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafbff' }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'white' }}
                >
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: TYPE_COLOR[type], flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.77rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inst.name_fr}</div>
                    <div style={{ fontSize: '0.67rem', color: '#94a3b8', marginTop: '1px' }}>
                      {inst.code}{inst.governorate ? ` · ${inst.governorate}` : ''}
                    </div>
                  </div>
                  <ChevronRight size={11} color="#cbd5e1" style={{ flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Map area ── */}
        <div style={{ flex: 1, position: 'relative' }}>
          <MapContainer
            center={TUNISIA_CENTER}
            zoom={TUNISIA_ZOOM}
            style={{ width: '100%', height: '100%' }}
            zoomControl
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapController mapRef={mapRef} flyTo={flyTo} />
            <MarkerClusterGroup chunkedLoading>
              {institutions.map((inst) => {
                const type = getType(inst)
                const coords = getCoords(inst.code)
                const isSelected = inst.id === selectedId
                return (
                  <Marker
                    key={inst.id}
                    position={coords}
                    icon={createMarkerIcon(type, isSelected)}
                    ref={(el) => { if (el) markerRefs.current[inst.id] = el }}
                    eventHandlers={{ click: () => setSelectedId(inst.id) }}
                  >
                    <Tooltip direction="top" offset={[0, -8]}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.74rem', fontWeight: 600 }}>
                        {inst.name_fr} · {inst.code}
                      </span>
                    </Tooltip>
                    <Popup>
                      <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '215px', padding: '2px 0' }}>
                        {/* Code badge + type */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: '6px', background: TYPE_COLOR[type] + '1a', color: TYPE_COLOR[type], fontSize: '0.7rem', fontWeight: 700 }}>
                            {inst.code}
                          </span>
                          <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{TYPE_LABEL[type]}</span>
                        </div>
                        {/* Name */}
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.3, marginBottom: '8px' }}>
                          {inst.name_fr}
                        </div>
                        {/* Tags */}
                        <div style={{ display: 'flex', gap: '5px', marginBottom: '8px', flexWrap: 'wrap' }}>
                          {inst.governorate && (
                            <span style={{ padding: '2px 7px', borderRadius: '5px', background: '#f1f5f9', color: '#64748b', fontSize: '0.67rem', fontWeight: 600 }}>{inst.governorate}</span>
                          )}
                          <span style={{ padding: '2px 7px', borderRadius: '5px', background: TYPE_COLOR[type] + '15', color: TYPE_COLOR[type], fontSize: '0.67rem', fontWeight: 600 }}>{TYPE_LABEL[type]}</span>
                        </div>
                        {/* Stats */}
                        {inst.student_capacity > 0 && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '3px' }}>
                            Étudiants : <strong>{(inst.student_capacity).toLocaleString('fr-FR')}</strong>
                          </div>
                        )}
                        {inst.director_name && (
                          <div style={{ fontSize: '0.71rem', color: '#94a3b8', marginBottom: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Dir. : {inst.director_name}
                          </div>
                        )}
                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => navigate(`/institutions/${inst.id}`)}
                            style={{ flex: 1, padding: '6px 10px', background: 'rgb(29,83,148)', color: 'white', border: 'none', borderRadius: '7px', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            Voir le détail →
                          </button>
                          <button
                            onClick={() => { mapRef.current?.closePopup(); mapRef.current?.setView(coords, 14) }}
                            style={{ padding: '6px 10px', background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: '7px', fontSize: '0.73rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
                            Centrer
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )
              })}
            </MarkerClusterGroup>
          </MapContainer>

          {/* "Centrer sur la Tunisie" button */}
          <button
            onClick={() => mapRef.current?.setView(TUNISIA_CENTER, TUNISIA_ZOOM)}
            style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'Inter, sans-serif', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
          >
            <Navigation size={13} /> Centrer sur la Tunisie
          </button>
        </div>
      </div>
    </>
  )
}
