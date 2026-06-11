'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { Event } from '@/lib/mockData'
import Link from 'next/link'

export interface SceneMapProps {
  events: Event[]
  userLat: number
  userLng: number
  onSelectEvent: (event: Event) => void
  selectedEventId: string | null
}

const GENRE_COLORS: Record<string, string> = {
  House: '#C8FF00',
  Techno: '#A78BFA',
  Bass: '#F97316',
  Trance: '#22D3EE',
  DNB: '#F472B6',
  Electronic: '#60A5FA',
  default: '#ffffff',
}

function getGenreColor(genres: string[]): string {
  for (const g of genres) {
    if (GENRE_COLORS[g]) return GENRE_COLORS[g]
  }
  return GENRE_COLORS.default
}

// ── Venue grouping ────────────────────────────────────────────────────────────

interface VenueGroup {
  key: string
  lat: number
  lng: number
  venueName: string
  events: Event[]
}

function latlngDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function groupByVenue(events: Event[]): VenueGroup[] {
  const map = new Map<string, VenueGroup>()
  for (const event of events) {
    if (event.lat == null || event.lng == null || isNaN(event.lat) || isNaN(event.lng)) continue
    // Round to 4dp (~11m) so events at the same address share a key
    const coordKey = `${event.lat.toFixed(4)},${event.lng.toFixed(4)}`

    // Also check if a group with the same venue name exists within 300m — merges
    // duplicate TM venue IDs that refer to the same physical location
    const nameKey = event.venue.toLowerCase().trim()
    let mergeTarget: VenueGroup | undefined
    for (const group of map.values()) {
      if (group.venueName.toLowerCase().trim() === nameKey) {
        const dist = latlngDistanceM(event.lat, event.lng, group.lat, group.lng)
        if (dist <= 300) { mergeTarget = group; break }
      }
    }

    if (mergeTarget) {
      mergeTarget.events.push(event)
    } else if (!map.has(coordKey)) {
      map.set(coordKey, { key: coordKey, lat: event.lat, lng: event.lng, venueName: event.venue, events: [event] })
    } else {
      map.get(coordKey)!.events.push(event)
    }
  }
  const groups = Array.from(map.values())
  // Sort events within each venue by date ascending
  for (const group of groups) {
    group.events.sort((a: Event, b: Event) => a.date.localeCompare(b.date))
  }
  return groups
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SceneMap({ events, userLat, userLng, onSelectEvent, selectedEventId }: SceneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMap = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [expandedVenue, setExpandedVenue] = useState<VenueGroup | null>(null)
  const [showGenres, setShowGenres] = useState(false)

  // Initialize map once
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return
    let unmounted = false

    import('leaflet').then(L => {
      if (unmounted) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' })

      const map = L.map(mapRef.current!, {
        center: [userLat, userLng],
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(({ tap: false } as any)),
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '',
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)

      leafletMap.current = { map, L }
      setTimeout(() => { if (!unmounted) map.invalidateSize() }, 100)
      setMapReady(true)
    })

    return () => {
      unmounted = true
      if (leafletMap.current) {
        leafletMap.current.map.remove()
        leafletMap.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update user marker
  useEffect(() => {
    if (!leafletMap.current || !mapReady) return
    const { map, L } = leafletMap.current
    if (userMarkerRef.current) userMarkerRef.current.remove()

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid #C8FF00;box-shadow:0 0 16px #C8FF00,0 0 32px rgba(200,255,0,0.4);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    })

    userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(map)
    map.setView([userLat, userLng])
  }, [userLat, userLng, mapReady])

  // Update venue markers
  useEffect(() => {
    if (!leafletMap.current || !mapReady) return
    const { map, L } = leafletMap.current

    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    const venues = groupByVenue(events)
    // Cap at 80 venue groups to prevent Leaflet DOM explosion
    const cappedVenues = venues.slice(0, 80)

    cappedVenues.forEach(venue => {
      const count = venue.events.length
      const isSelected = venue.events.some(e => e.id === selectedEventId)
      const color = getGenreColor(venue.events[0].genre)
      // A venue is a "festival" if any event is multi-day
      const isFestival = venue.events.some(e => e.date_end && e.date_end !== e.date)

      const size = Math.min(14 + (count - 1) * 3, 28)
      const anchor = size / 2

      let html: string
      if (isFestival) {
        // Festival — rotated diamond with ⚡ inside
        const diamondSize = size + 6
        html = `<div style="
          position:relative;width:${diamondSize}px;height:${diamondSize}px;
          display:flex;align-items:center;justify-content:center;
        ">
          <div style="
            position:absolute;inset:0;
            background:${color};
            border:2px solid ${isSelected ? '#fff' : 'rgba(0,0,0,0.5)'};
            transform:rotate(45deg);
            box-shadow:0 0 ${isSelected ? 16 : 8}px ${color}, 0 0 ${isSelected ? 28 : 14}px ${color}60;
          "></div>
          <span style="position:relative;z-index:1;font-size:${diamondSize >= 24 ? 11 : 9}px;line-height:1;">⚡</span>
        </div>`
      } else if (count === 1) {
        // Single event — simple dot
        html = `<div style="
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};
          border:2px solid ${isSelected ? '#fff' : 'rgba(0,0,0,0.5)'};
          box-shadow:0 0 ${isSelected ? 12 : 6}px ${color};
        "></div>`
      } else {
        // Multi-event club — dot with count badge
        html = `<div style="
          position:relative;
          width:${size}px;height:${size}px;border-radius:50%;
          background:${color};
          border:2px solid ${isSelected ? '#fff' : 'rgba(0,0,0,0.6)'};
          box-shadow:0 0 ${isSelected ? 14 : 8}px ${color}, 0 0 ${isSelected ? 24 : 14}px ${color}40;
          display:flex;align-items:center;justify-content:center;
        ">
          <span style="
            color:#000;font-size:${size >= 22 ? 10 : 9}px;font-weight:900;
            line-height:1;letter-spacing:-0.5px;
          ">${count}</span>
        </div>`
      }

      const markerSize = isFestival ? size + 6 : size
      const markerAnchor = markerSize / 2
      const icon = L.divIcon({
        className: '',
        html,
        iconSize: [markerSize, markerSize],
        iconAnchor: [markerAnchor, markerAnchor],
      })

      const marker = L.marker([venue.lat, venue.lng], { icon })
        .addTo(map)
        .on('click', () => {
          if (count === 1) {
            setExpandedVenue(null)
            onSelectEvent(venue.events[0])
          } else {
            setExpandedVenue(prev => prev?.key === venue.key ? null : venue)
          }
        })

      markersRef.current.push(marker)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, selectedEventId, mapReady])

  return (
    <>
      <style>{`
        .leaflet-container { background: #050505 !important; }
        .leaflet-control-zoom a { background: rgba(0,0,0,0.9) !important; border-color: rgba(255,255,255,0.15) !important; color: rgba(255,255,255,0.8) !important; }
        .leaflet-control-zoom a:hover { background: rgba(200,255,0,0.1) !important; color: #C8FF00 !important; }
        @media (min-width: 1024px) {
          .scene-legend { left: auto !important; right: 12px !important; bottom: 80px !important; }
        }
      `}</style>

      <div style={{ position: 'relative', height: '100%', width: '100%' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%', background: '#050505' }} />

        {/* Map legend */}
        <div className="scene-legend" style={{
          position: 'absolute', bottom: 48, left: 12, zIndex: 900,
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 10,
          padding: '7px 10px',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          minWidth: 140,
        }}>
          {/* Festival */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 12, height: 12, background: '#C8FF00', transform: 'rotate(45deg)', flexShrink: 0, boxShadow: '0 0 6px #C8FF00' }} />
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>Festival</span>
          </div>
          {/* Club / Event */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#C8FF00', flexShrink: 0, boxShadow: '0 0 5px #C8FF00' }} />
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>Event / Club Night</span>
          </div>
          {/* You */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', border: '2px solid #C8FF00', flexShrink: 0, boxShadow: '0 0 6px #C8FF00' }} />
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '0.02em' }}>You</span>
          </div>

          {/* Genre toggle */}
          <button
            onClick={() => setShowGenres(v => !v)}
            style={{
              marginTop: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer', width: '100%',
              borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 6,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Genres</span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, transition: 'transform 0.2s', display: 'inline-block', transform: showGenres ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
          </button>

          {/* Genre color swatches — shown when expanded */}
          {showGenres && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 1 }}>
              {(Object.entries(GENRE_COLORS).filter(([k]) => k !== 'default') as [string, string][]).map(([genre, color]) => (
                <div key={genre} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 5px ${color}` }} />
                  <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 600 }}>{genre}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Venue bottom sheet — slides up when a multi-event marker is tapped */}
        {expandedVenue && (
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
              background: 'rgba(8,8,12,0.97)',
              borderTop: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px 16px 0 0',
              maxHeight: '55%',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Handle + header */}
            <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 8px' }} />
            </div>
            <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#fff', fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>{expandedVenue.venueName}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                  {expandedVenue.events.length} upcoming show{expandedVenue.events.length !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => setExpandedVenue(null)}
                style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Event list */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 16px' }}>
              {expandedVenue.events.map(event => {
                const color = getGenreColor(event.genre)
                const isSelected = event.id === selectedEventId
                return (
                  <Link
                    key={event.id}
                    href={`/events/${encodeURIComponent(event.id)}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px',
                      borderRadius: 12,
                      marginBottom: 6,
                      background: isSelected ? 'rgba(200,255,0,0.08)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isSelected ? 'rgba(200,255,0,0.25)' : 'rgba(255,255,255,0.07)'}`,
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      onSelectEvent(event)
                      setExpandedVenue(null)
                    }}
                  >
                    {/* Genre dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: color, flexShrink: 0,
                      boxShadow: `0 0 6px ${color}`,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                        {formatDate(event.date)}{event.time && event.time !== 'TBA' ? ` · ${event.time}` : ''}
                      </div>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14, flexShrink: 0 }}>›</div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
