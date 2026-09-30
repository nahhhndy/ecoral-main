'use client'
import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, useMapEvents, Marker, Popup, ZoomControl, useMap } from 'react-leaflet'
import { Icon, latLngBounds } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Layers, RefreshCw, AlertTriangle, Compass, Waves, Check, Satellite, Map as MapIcon } from 'lucide-react'
import { PredictionHistoryItem, PredictionResult } from '@/types'

export function getRiskCategory(prob: number) {
  if (prob >= 0.75) return { label: 'CRITICAL', color: '#E11D48', bg: 'rgba(225, 29, 72, 0.15)' }
  if (prob >= 0.50) return { label: 'HIGH', color: '#FF5A6E', bg: 'rgba(255, 90, 110, 0.15)' }
  if (prob >= 0.35) return { label: 'MODERATE', color: '#FFB547', bg: 'rgba(255, 181, 71, 0.15)' }
  return { label: 'LOW', color: '#27D980', bg: 'rgba(39, 217, 128, 0.15)' }
}

export function getRiskMarkerIcon(probability: number) {
  const cat = getRiskCategory(probability)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
      <circle cx="16" cy="16" r="12" fill="${cat.color}" fill-opacity="0.3">
        <animate attributeName="r" values="8;14;8" dur="2.5s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" values="0.5;0.1;0.5" dur="2.5s" repeatCount="indefinite"/>
      </circle>
      <circle cx="16" cy="16" r="8" fill="${cat.color}" stroke="#07131E" stroke-width="2"/>
      <circle cx="16" cy="16" r="3" fill="#F5FAFC"/>
    </svg>
  `
  return new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -14],
  })
}

const targetIcon = new Icon({
  iconUrl: `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
      <circle cx="18" cy="18" r="14" fill="#18C8FF" fill-opacity="0.35">
        <animate attributeName="r" values="8;16;8" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="fill-opacity" values="0.7;0.15;0.7" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <circle cx="18" cy="18" r="9" fill="#18C8FF" stroke="#07131E" stroke-width="2"/>
      <circle cx="18" cy="18" r="4" fill="#07131E"/>
    </svg>
  `)}`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
})

export type BasemapKey = 'dark' | 'ocean' | 'satellite' | 'osm' | 'carto'

export interface BasemapOption {
  key: BasemapKey
  label: string
  sublabel: string
  url: string
  referenceUrl?: string
  attribution: string
  maxZoom: number
  iconName: string
}

export const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    key: 'dark',
    label: 'Dark Ocean Canvas',
    sublabel: 'Esri Dark Gray & Marine Contours (Default)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
    iconName: 'waves',
  },
  {
    key: 'ocean',
    label: 'Ocean Bathymetry (NOAA)',
    sublabel: 'Underwater Depths, Trenches & Reef Shelves',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    referenceUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, GEBCO, NOAA, National Geographic',
    maxZoom: 13,
    iconName: 'compass',
  },
  {
    key: 'satellite',
    label: 'Satellite Reef Imagery',
    sublabel: 'High-Res Optical Satellite & Coastal Atolls',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
    iconName: 'satellite',
  },
  {
    key: 'osm',
    label: 'OpenStreetMap',
    sublabel: 'Open Global Marine & Coastal Cartography',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
    iconName: 'map',
  },
]

function MapBoundsController({
  predictions,
  selectedCoords,
}: {
  predictions: PredictionHistoryItem[]
  selectedCoords: { lat: number; lng: number } | null
}) {
  const map = useMap()
  const [initialFitted, setInitialFitted] = useState(false)

  // Fit initial viewport to observation markers if observations exist
  useEffect(() => {
    if (!initialFitted && predictions.length > 0) {
      if (predictions.length === 1) {
        map.flyTo([predictions[0].latitude, predictions[0].longitude], 7.5, { duration: 1.2 })
      } else {
        const bounds = latLngBounds(predictions.map((p) => [p.latitude, p.longitude]))
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8, animate: true, duration: 1.2 })
      }
      setInitialFitted(true)
    }
  }, [predictions, initialFitted, map])

  // Fly to target when user clicks map or selects a coordinate
  useEffect(() => {
    if (selectedCoords) {
      map.flyTo([selectedCoords.lat, selectedCoords.lng], Math.max(map.getZoom(), 7.5), { duration: 1.2 })
    }
  }, [selectedCoords, map])

  return null
}

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface EcoMapProps {
  onMapClick: (lat: number, lng: number) => void
  selectedCoords: { lat: number; lng: number } | null
  regionName?: string
  sst?: number
  predictions?: PredictionHistoryItem[]
  prediction?: PredictionResult | null
  currentPrediction?: PredictionResult | null
  onSelectPrediction?: (pred: PredictionHistoryItem) => void
}

export default function EcoMap({
  onMapClick,
  selectedCoords,
  regionName,
  sst,
  predictions = [],
  prediction,
  currentPrediction,
  onSelectPrediction,
}: EcoMapProps) {
  const activePrediction = currentPrediction || prediction

  // Basemap provider state
  const [selectedBasemap, setSelectedBasemap] = useState<BasemapKey>('dark')
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false)
  const [tilesLoading, setTilesLoading] = useState(true)
  const [tileErrorCount, setTileErrorCount] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)

  // Available basemaps including optional CARTO if key is configured in env
  const availableBasemaps = useMemo(() => {
    const list = [...BASEMAP_OPTIONS]
    const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY
    if (cartoKey) {
      list.push({
        key: 'carto',
        label: 'CARTO Dark Matter',
        sublabel: 'Authenticated CARTO Basemap',
        url: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?api_key=${cartoKey}`,
        attribution: '&copy; CARTO, &copy; OpenStreetMap contributors',
        maxZoom: 19,
        iconName: 'waves',
      })
    }
    return list
  }, [])

  const currentBasemap = useMemo(() => {
    return availableBasemaps.find((b) => b.key === selectedBasemap) || availableBasemaps[0]
  }, [availableBasemaps, selectedBasemap])

  const handleTileLoad = () => {
    setTilesLoading(false)
  }

  const handleTileLoading = () => {
    setTilesLoading(true)
  }

  const handleTileError = () => {
    setTileErrorCount((prev) => prev + 1)
  }

  const handleRetryTiles = () => {
    setTileErrorCount(0)
    setReloadKey((prev) => prev + 1)
    setTilesLoading(true)
  }

  const handleSwitchToFallback = () => {
    setSelectedBasemap('dark')
    setTileErrorCount(0)
    setReloadKey((prev) => prev + 1)
    setTilesLoading(true)
  }

  return (
    <div className="relative w-full h-full z-0 overflow-hidden bg-[#07131E]">
      <MapContainer
        center={[0, 120]}
        zoom={3}
        style={{ width: '100%', height: '100%', background: '#07131E' }}
        zoomControl={false}
      >
        {/* Main Base Tile Layer */}
        <TileLayer
          key={`base-${currentBasemap.key}-${reloadKey}`}
          url={currentBasemap.url}
          attribution={currentBasemap.attribution}
          maxZoom={currentBasemap.maxZoom}
          eventHandlers={{
            loading: handleTileLoading,
            load: handleTileLoad,
            tileerror: handleTileError,
          }}
        />

        {/* Optional Semi-Transparent Label / Reference Layer */}
        {currentBasemap.referenceUrl && (
          <TileLayer
            key={`ref-${currentBasemap.key}-${reloadKey}`}
            url={currentBasemap.referenceUrl}
            maxZoom={currentBasemap.maxZoom}
            opacity={0.85}
          />
        )}

        <ZoomControl position="bottomright" />
        <ClickHandler onMapClick={onMapClick} />
        <MapBoundsController predictions={predictions} selectedCoords={selectedCoords} />

        {/* PERSISTED DATABASE PREDICTION MARKERS */}
        {predictions.map((p) => {
          const cat = getRiskCategory(p.probability)
          const icon = getRiskMarkerIcon(p.probability)

          return (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onSelectPrediction) onSelectPrediction(p)
                  onMapClick(p.latitude, p.longitude)
                },
              }}
            >
              <Popup autoPan={true}>
                <div style={{ fontFamily: 'Inter, sans-serif', color: '#F5FAFC', background: '#0C1C2A', padding: '8px', minWidth: '220px' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#8FA6B8', fontWeight: 700, letterSpacing: '0.05em' }}>
                    Persisted Observation
                  </span>
                  <strong style={{ color: '#F5FAFC', fontSize: '13px', display: 'block', marginTop: '2px' }}>
                    {p.location_name || 'Ocean Telemetry Station'}
                  </strong>

                  <div style={{ fontSize: '11px', color: '#8FA6B8', fontFamily: 'monospace', margin: '4px 0' }}>
                    {p.latitude > 0 ? `${p.latitude.toFixed(2)}°N` : `${Math.abs(p.latitude).toFixed(2)}°S`},{' '}
                    {p.longitude > 0 ? `${p.longitude.toFixed(2)}°E` : `${Math.abs(p.longitude).toFixed(2)}°W`}{' '}
                    · <span style={{ color: '#18C8FF', fontWeight: 'bold' }}>{p.sea_surface_temperature}°C</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #24475F' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        color: cat.color,
                        backgroundColor: cat.bg,
                        border: `1px solid ${cat.color}40`,
                      }}
                    >
                      {cat.label} RISK
                    </span>
                    <span style={{ fontSize: '11px', color: '#F5FAFC', fontWeight: 'bold', marginLeft: 'auto' }}>
                      {(p.probability * 100).toFixed(1)}% Prob
                    </span>
                  </div>

                  <div style={{ fontSize: '10px', color: '#8FA6B8', marginTop: '6px' }}>
                    Model Confidence: <strong style={{ color: '#5EEAD4' }}>{(p.confidence * 100).toFixed(1)}%</strong>
                  </div>

                  {p.created_at && (
                    <div style={{ fontSize: '9px', color: '#8FA6B8', marginTop: '4px' }}>
                      Log Date: {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* CURRENTLY SELECTED TARGET LOCATION MARKER */}
        {selectedCoords && (
          <Marker position={[selectedCoords.lat, selectedCoords.lng]} icon={targetIcon}>
            <Popup autoPan={true}>
              <div style={{ fontFamily: 'Inter, sans-serif', color: '#F5FAFC', background: '#0C1C2A', padding: '8px', minWidth: '200px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#18C8FF', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Selected Target Location
                </span>
                <strong style={{ color: '#F5FAFC', fontSize: '13px', display: 'block', marginTop: '2px' }}>
                  {regionName || 'Ocean Coordinates'}
                </strong>
                <div style={{ fontSize: '11px', color: '#8FA6B8', fontFamily: 'monospace', margin: '4px 0' }}>
                  {selectedCoords.lat > 0 ? `${selectedCoords.lat.toFixed(4)}°N` : `${Math.abs(selectedCoords.lat).toFixed(4)}°S`},{' '}
                  {selectedCoords.lng > 0 ? `${selectedCoords.lng.toFixed(4)}°E` : `${Math.abs(selectedCoords.lng).toFixed(4)}°W`}
                  {sst !== undefined && <span style={{ color: '#18C8FF', marginLeft: '6px', fontWeight: 'bold' }}>· {sst}°C</span>}
                </div>

                {activePrediction ? (
                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid #24475F' }}>
                    {(() => {
                      const cat = getRiskCategory(activePrediction.probability)
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: cat.color,
                              backgroundColor: cat.bg,
                              border: `1px solid ${cat.color}40`,
                            }}
                          >
                            {cat.label} RISK
                          </span>
                          <span style={{ fontSize: '11px', color: '#F5FAFC', fontWeight: 'bold', marginLeft: 'auto' }}>
                            {(activePrediction.probability * 100).toFixed(1)}% Prob
                          </span>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px solid #24475F', fontSize: '10px', color: '#5EEAD4' }}>
                    Click &quot;Analyze Risk&quot; to run predictions.
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* FLOATING BASEMAP STYLE SWITCHER (Top Right) */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
        <div className="relative">
          <button
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-[#24475F] bg-[#0C1C2A]/90 hover:bg-[#122535] backdrop-blur-md shadow-2xl text-xs font-semibold text-[#F5FAFC] transition-all cursor-pointer"
            title="Switch Map Layers"
          >
            <Layers className="w-4 h-4 text-[#18C8FF]" />
            <span className="hidden sm:inline">{currentBasemap.label}</span>
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 top-12 w-64 p-2 rounded-xl border border-[#24475F] bg-[#0C1C2A]/95 backdrop-blur-md shadow-2xl space-y-1 z-50">
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8FA6B8] block">
                Select Basemap Layer
              </span>
              {availableBasemaps.map((b) => (
                <button
                  key={b.key}
                  onClick={() => {
                    setSelectedBasemap(b.key)
                    setIsLayerMenuOpen(false)
                    setTileErrorCount(0)
                    setTilesLoading(true)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    b.key === selectedBasemap
                      ? 'bg-[#18C8FF]/15 text-[#18C8FF] border border-[#18C8FF]/30 font-bold'
                      : 'text-[#8FA6B8] hover:text-[#F5FAFC] hover:bg-[#122535]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {b.iconName === 'compass' ? (
                      <Compass className="w-4 h-4 text-[#5EEAD4] shrink-0" />
                    ) : b.iconName === 'satellite' ? (
                      <Satellite className="w-4 h-4 text-[#FFB547] shrink-0" />
                    ) : b.iconName === 'map' ? (
                      <MapIcon className="w-4 h-4 text-[#27D980] shrink-0" />
                    ) : (
                      <Waves className="w-4 h-4 text-[#18C8FF] shrink-0" />
                    )}
                    <div>
                      <p className="leading-tight font-medium text-[#F5FAFC]">{b.label}</p>
                      <p className="text-[10px] text-[#8FA6B8] leading-tight mt-0.5">{b.sublabel}</p>
                    </div>
                  </div>
                  {b.key === selectedBasemap && <Check className="w-4 h-4 text-[#18C8FF] shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FLOATING TILE STATUS INDICATOR (Bottom Left) */}
      <div className="absolute bottom-4 left-4 z-[1000] pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#24475F]/60 bg-[#0C1C2A]/85 backdrop-blur-sm text-[11px] text-[#8FA6B8]">
          {tilesLoading ? (
            <>
              <RefreshCw className="w-3 h-3 text-[#18C8FF] animate-spin" />
              <span>Streaming ocean tiles...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#27D980] animate-pulse" />
              <span>{currentBasemap.label} · Online</span>
            </>
          )}
        </div>
      </div>

      {/* TILE ERROR NOTIFICATION BANNER */}
      {tileErrorCount > 4 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto max-w-md w-full px-4">
          <div className="p-3.5 rounded-xl border border-[#FF5A6E]/40 bg-[#0C1C2A]/95 backdrop-blur-md shadow-2xl flex items-center justify-between text-xs text-[#F5FAFC]">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#FF5A6E] shrink-0" />
              <div>
                <p className="font-bold text-[#FF5A6E]">Tile provider experiencing delays</p>
                <p className="text-[11px] text-[#8FA6B8]">Some geographic tiles failed to load.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleRetryTiles}
                className="px-2.5 py-1 rounded bg-[#122535] hover:bg-[#18C8FF]/20 text-[#18C8FF] font-semibold text-[11px] border border-[#24475F] cursor-pointer"
              >
                Retry
              </button>
              {selectedBasemap !== 'dark' && (
                <button
                  onClick={handleSwitchToFallback}
                  className="px-2.5 py-1 rounded bg-[#18C8FF] text-[#07131E] font-bold text-[11px] cursor-pointer hover:opacity-90"
                >
                  Switch to Dark
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
