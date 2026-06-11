'use client'

import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'

interface VenueMapProps {
  lat: number
  lng: number
  venueName: string
  appleMapsUrl?: string  // kept for backward compat, no longer used directly
}

function buildMapUrls(lat: number, lng: number, name: string) {
  const q = encodeURIComponent(name)
  const ll = `${lat},${lng}`
  return {
    apple:  `maps://maps.apple.com/?q=${q}&ll=${ll}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${ll}&destination_place_id=`,
    waze:   `https://waze.com/ul?ll=${ll}&navigate=yes&q=${q}`,
  }
}

function MapsSheet({
  lat, lng, venueName, onClose,
}: {
  lat: number; lng: number; venueName: string; onClose: () => void
}) {
  const urls = buildMapUrls(lat, lng, venueName)

  const options = [
    {
      label: 'Apple Maps',
      url: urls.apple,
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
      ),
      color: '#888',
    },
    {
      label: 'Google Maps',
      url: urls.google,
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#4285F4"/>
          <circle cx="12" cy="9" r="2.5" fill="white"/>
        </svg>
      ),
      color: '#4285F4',
    },
    {
      label: 'Waze',
      url: urls.waze,
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#33CCFF">
          <path d="M20.54 6.63C19.4 4.05 16.96 2.25 14.1 2.03 11.24 1.8 8.55 3.17 7.04 5.56c-1.52 2.4-1.52 5.44-.01 7.84l4.44 7.13c.28.45.77.72 1.29.72s1.01-.27 1.29-.72l4.44-7.13c1.03-1.65 1.29-3.71.05-6.77z"/>
        </svg>
      ),
      color: '#33CCFF',
    },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl pb-safe"
        style={{
          background: 'rgba(12,12,20,0.98)',
          border: '1px solid rgba(255,255,255,0.1)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-4">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Venue name */}
        <div className="px-5 pb-4 border-b border-white/10">
          <p className="text-white/40 text-xs mb-0.5">Get directions to</p>
          <p className="text-white font-bold text-base leading-tight">{venueName}</p>
        </div>

        {/* Options */}
        <div className="px-4 py-3 flex flex-col gap-2">
          {options.map(opt => (
            <a
              key={opt.label}
              href={opt.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${opt.color}18`, border: `1px solid ${opt.color}30` }}>
                <span style={{ color: opt.color }}>{opt.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{opt.label}</p>
                <p className="text-white/30 text-xs mt-0.5">Open in {opt.label}</p>
              </div>
              <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>

        {/* Cancel */}
        <div className="px-4 pb-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-sm font-bold text-white/50 hover:text-white/70 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

export default function VenueMap({ lat, lng, venueName }: VenueMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leafletMap = useRef<any>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return
    let unmounted = false

    import('leaflet').then(L => {
      if (unmounted || !mapRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({ iconUrl: '', shadowUrl: '', iconRetinaUrl: '' })

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(({ tap: false } as any)),
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(map)

      const icon = L.divIcon({
        className: '',
        html: `<div style="
          width:18px;height:18px;border-radius:50%;
          background:#C8FF00;border:3px solid #000;
          box-shadow:0 0 0 2px #C8FF00, 0 0 16px rgba(200,255,0,0.6);
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      })

      L.marker([lat, lng], { icon }).addTo(map)
      setTimeout(() => { if (!unmounted) map.invalidateSize() }, 50)
      leafletMap.current = map
    })

    return () => {
      unmounted = true
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return (
    <>
      <button
        onClick={() => setSheetOpen(true)}
        className="block w-full relative rounded-2xl overflow-hidden text-left"
        style={{ height: 160, border: '1px solid rgba(255,255,255,0.08)' }}
        aria-label={`Get directions to ${venueName}`}
      >
        <div ref={mapRef} style={{ height: '100%', width: '100%', pointerEvents: 'none' }} />
        <div className="absolute inset-0 flex items-end justify-end p-3 pointer-events-none">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.75)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.25)', backdropFilter: 'blur(8px)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            Get Directions
          </div>
        </div>
      </button>

      {sheetOpen && (
        <MapsSheet
          lat={lat}
          lng={lng}
          venueName={venueName}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </>
  )
}
