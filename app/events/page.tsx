'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Event } from '@/lib/mockData'

const SceneMap = dynamic(() => import('@/components/SceneMap'), {
  ssr: false,
  loading: () => <div className="flex-1 bg-[#050505] animate-pulse" />,
})

// Module-level cache — survives page navigation within the same session
let eventsCache: { events: Event[]; lat: number; lng: number; ts: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const LOADING_MESSAGES = [
  'Locating the function…',
  'Looking for the afters…',
  'Chasing the lights…',
  'Loading scene…',
  'Scanning the underground…',
  'Tuning into the scene…',
  'Unlocking tonight…',
  'Signal acquired…',
  'Mapping the movement…',
  'Finding the hidden spots…',
  'Opening the portal…',
  'Tracking the basslines…',
  'Decoding the nightlife…',
]

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>(eventsCache?.events ?? [])
  const [loading, setLoading] = useState(!eventsCache)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const [userLat, setUserLat] = useState(34.0522)
  const [userLng, setUserLng] = useState(-118.2437)
  const [locationLabel, setLocationLabel] = useState('')
  const [activeGenre, setActiveGenre] = useState('All')
  const [loadingMessage] = useState(() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)])

  useEffect(() => {
    async function loadEvents(lat: number, lng: number) {
      // Serve from cache if fresh and close enough to cached location (~5km)
      if (eventsCache && Date.now() - eventsCache.ts < CACHE_TTL_MS) {
        const dist = Math.hypot(lat - eventsCache.lat, lng - eventsCache.lng)
        if (dist < 0.05) {
          setEvents(eventsCache.events)
          setLoading(false)
          return
        }
      }
      try {
        const res = await fetch(`/api/events?lat=${lat}&lng=${lng}`)
        if (!res.ok) throw new Error('API error')
        const data = await res.json()
        const allEvents: Event[] = data.events ?? []
        const filtered = allEvents.filter((e: Event) => e.lat != null && e.lng != null && !isNaN(e.lat) && !isNaN(e.lng))
        eventsCache = { events: filtered, lat, lng, ts: Date.now() }
        setEvents(filtered)
      } catch {
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    // Respect the location override set on the homepage first
    try {
      const saved = localStorage.getItem('es_location_override')
      if (saved) {
        const { lat, lng, label } = JSON.parse(saved)
        setUserLat(lat)
        setUserLng(lng)
        setLocationLabel(label)
        loadEvents(lat, lng)
        return
      }
    } catch { /* ignore bad storage */ }

    if (!navigator.geolocation) {
      loadEvents(userLat, userLng)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLat(latitude)
        setUserLng(longitude)
        try {
          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const geoData = await geo.json()
          const city =
            geoData.address?.city ||
            geoData.address?.town ||
            geoData.address?.county ||
            'Your Location'
          setLocationLabel(city)
        } catch {
          setLocationLabel('Your Location')
        }
        loadEvents(latitude, longitude)
      },
      () => {
        setLocationLabel('Los Angeles')
        loadEvents(userLat, userLng)
      },
      { timeout: 8000 }
    )
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEvents = events.filter(
    (e) => activeGenre === 'All' || e.genre.includes(activeGenre)
  )

  // Auto-scroll sidebar to selected event when map marker is clicked
  useEffect(() => {
    if (!selectedEvent) return
    const item = itemRefs.current[selectedEvent.id]
    const list = listRef.current
    if (!item || !list) return
    const itemTop = item.offsetTop
    const itemBottom = itemTop + item.offsetHeight
    const listTop = list.scrollTop
    const listBottom = listTop + list.clientHeight
    const isVisible = itemTop >= listTop && itemBottom <= listBottom
    if (!isVisible) {
      list.scrollTo({ top: itemTop - list.clientHeight / 2 + item.offsetHeight / 2, behavior: 'smooth' })
    }
  }, [selectedEvent])

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-[#C8FF00]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-white/30 text-sm">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed left-0 right-0 top-0 bottom-20 md:top-16 md:bottom-0 lg:left-64 lg:top-0 flex flex-col">
      {/* Top overlay: title + location + genre filters — hidden on desktop (panel handles it) */}
      <div
        className="lg:hidden absolute top-0 left-0 right-0 z-[1000] px-4 pt-3 pb-2 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, transparent 100%)' }}
      >
        <div className="pointer-events-auto">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">Scene Map</h1>
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-pulse" />
                  LIVE
                </div>
              </div>
              <p className="text-white/40 text-xs mt-0.5">
                {locationLabel || 'Detecting location…'} · {filteredEvents.length} events
              </p>
            </div>
          </div>

          {/* Genre filter chips - horizontal scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['All', 'House', 'Techno', 'Bass', 'Trance', 'DNB', 'Electronic'].map((genre) => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeGenre === genre
                    ? 'text-black shadow-[0_0_10px_rgba(200,255,0,0.4)]'
                    : 'text-white/60 border border-white/10'
                }`}
                style={
                  activeGenre === genre
                    ? { background: '#C8FF00' }
                    : { background: 'rgba(255,255,255,0.05)' }
                }
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Map fills remaining space */}
      <div className="flex-1 relative">
        {/* Desktop event list panel */}
        <div className="hidden lg:flex flex-col absolute left-0 top-0 bottom-0 w-80 z-[500] border-r border-white/10"
          style={{ background: 'rgba(5,5,5,0.95)' }}>
          {/* Panel header: search + genre filters */}
          <div className="px-4 pt-4 pb-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-base font-black text-white">Scene Map</h2>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C8FF00]/10 text-[#C8FF00] border border-[#C8FF00]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF00] animate-pulse" />
                LIVE
              </div>
            </div>
            <p className="text-white/30 text-xs mb-3">
              {locationLabel || 'Detecting location…'} · {filteredEvents.length} events
            </p>
            {/* Genre chips */}
            <div className="flex flex-wrap gap-1.5">
              {['All', 'House', 'Techno', 'Bass', 'Trance', 'DNB', 'Electronic'].map((genre) => (
                <button
                  key={genre}
                  onClick={() => setActiveGenre(genre)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                    activeGenre === genre
                      ? 'text-black shadow-[0_0_8px_rgba(200,255,0,0.3)]'
                      : 'text-white/50 border border-white/10'
                  }`}
                  style={
                    activeGenre === genre
                      ? { background: '#C8FF00' }
                      : { background: 'rgba(255,255,255,0.04)' }
                  }
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable event list */}
          <div ref={listRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
            {filteredEvents.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-white/20 text-sm">No events found</p>
              </div>
            ) : (
              <ul className="flex flex-col">
                {filteredEvents.map((event) => {
                  const isSelected = selectedEvent?.id === event.id
                  return (
                    <li key={event.id} ref={el => { itemRefs.current[event.id] = el }}>
                      <Link
                        href={`/events/${event.id}`}
                        onClick={() => setSelectedEvent(event)}
                        className={`flex gap-3 px-4 py-3 transition-colors border-b border-white/5 ${
                          isSelected
                            ? 'bg-[#C8FF00]/5 border-l-2 border-l-[#C8FF00]'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          {event.imageUrl ? (
                            <img
                              loading="lazy"
                              decoding="async"
                              src={event.imageUrl}
                              className="w-full h-full object-cover"
                              alt={event.name}
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${event.gradient}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold text-sm truncate ${
                            isSelected ? 'text-[#C8FF00]' : 'text-white'
                          }`}>{event.name}</p>
                          <p className="text-white/40 text-xs mt-0.5 truncate">{event.venue}</p>
                          <p className="text-white/30 text-xs">
                            {new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {event.genre.slice(0, 2).map((g) => (
                              <span
                                key={g}
                                className="px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}
                              >
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        <SceneMap
          events={filteredEvents}
          userLat={userLat}
          userLng={userLng}
          onSelectEvent={setSelectedEvent}
          selectedEventId={selectedEvent?.id ?? null}
        />
      </div>

      {/* Bottom event sheet — mobile only */}
      {selectedEvent && (
        <div className="lg:hidden absolute bottom-4 left-4 right-4 z-[1000] animate-slide-up">
          <div className="glass rounded-2xl overflow-hidden border border-white/15">
            <Link
              href={`/events/${selectedEvent.id}`}
              className="flex gap-3 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                {selectedEvent.imageUrl ? (
                  <img
                    src={selectedEvent.imageUrl}
                    className="w-full h-full object-cover"
                    alt={selectedEvent.name}
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${selectedEvent.gradient}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate">{selectedEvent.name}</p>
                <p className="text-white/50 text-xs mt-0.5">
                  {selectedEvent.venue} · {selectedEvent.city}
                </p>
                <div className="flex gap-1 mt-1.5">
                  {selectedEvent.genre.slice(0, 2).map((g) => (
                    <span
                      key={g}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: 'rgba(200,255,0,0.15)', color: '#C8FF00' }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end justify-between flex-shrink-0">
                <svg
                  className="w-4 h-4 text-white/30"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <div className="text-right">
                  <p className="text-[#C8FF00] text-[10px] font-bold">
                    {new Date(selectedEvent.date + 'T00:00:00')
                      .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      .toUpperCase()}
                  </p>
                </div>
              </div>
            </Link>
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/20 transition-all text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
