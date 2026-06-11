'use client'

import { useState, useEffect, useRef, useCallback, useId } from 'react'
import Link from 'next/link'
import { mockEvents, Event } from '@/lib/mockData'
import { useUser, getLevel } from '@/lib/mockStore'
import { useAuth } from '@/lib/auth'
import SearchBar from '@/components/SearchBar'
import PullToRefresh from '@/components/PullToRefresh'
import { countryCodeToFlag } from '@/lib/internationalFestivals'

// Module-level cache — survives page navigation, expires after 5 minutes
let homeEventsCache: { events: Event[]; ts: number; lat?: number; lng?: number } | null = null
const HOME_CACHE_TTL_MS = 5 * 60 * 1000

const LOCATION_STORAGE_KEY = 'es_location_override'

// --- Date bucketing helpers ---
function getDateBucket(eventDate: string): 'tonight' | 'tomorrow' | 'thisWeek' | 'comingUp' | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const weekEnd = new Date(today)
  weekEnd.setDate(today.getDate() + 7)

  const d = new Date(eventDate + 'T00:00:00')
  if (d < today) return null // past events, skip
  if (d.getTime() === today.getTime()) return 'tonight'
  if (d.getTime() === tomorrow.getTime()) return 'tomorrow'
  if (d <= weekEnd) return 'thisWeek'
  return 'comingUp'
}

const SECTION_LABELS: Record<string, string> = {
  tonight: '⚡ Tonight',
  tomorrow: '🌙 Tomorrow',
  thisWeek: '📅 This Week',
  comingUp: '🚀 Coming Up',
}
const SECTION_ORDER = ['tonight', 'tomorrow', 'thisWeek', 'comingUp']

function formatMonth(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
}
function formatDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.getDate().toString()
}

// --- Skeleton loader ---
function SkeletonCard() {
  return (
    <div className="px-4 pb-3">
      <div className="rounded-2xl overflow-hidden skeleton" style={{ height: 180 }} />
    </div>
  )
}

// --- Feed card (poster format) ---
function FeedCard({ event, isSaved, onSave }: { event: Event; isSaved: boolean; onSave: () => void }) {
  const isFestival = !!(event.date_end && event.date_end !== event.date)
  const cardRef = useRef<HTMLDivElement>(null)

  const hash = event.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const palettes = [
    { from: '#7C3AED', to: '#2563EB' },
    { from: '#0891B2', to: '#065F46' },
    { from: '#DC2626', to: '#9333EA' },
    { from: '#D97706', to: '#B45309' },
    { from: '#059669', to: '#0891B2' },
    { from: '#7C3AED', to: '#DB2777' },
    { from: '#1D4ED8', to: '#0891B2' },
    { from: '#B45309', to: '#92400E' },
  ]
  const palette = palettes[hash % palettes.length]

  const dateLabel = isFestival && event.date_end && event.date_end !== event.date
    ? `${formatMonth(event.date)} ${formatDay(event.date)}–${formatDay(event.date_end)}`
    : `${formatMonth(event.date)} ${formatDay(event.date)}`


  return (
    <div className="px-4 pb-3" ref={cardRef}>
      <Link
        href={`/events/${event.id}`}
        onClick={() => sessionStorage.setItem('feedScrollY', String(window.scrollY))}
        className="block relative overflow-hidden rounded-2xl group active:scale-[0.98] transition-transform"
        style={{
          height: 172,
          boxShadow: isFestival
            ? '0 0 0 1px rgba(200,255,0,0.25), 0 8px 32px rgba(0,0,0,0.5), 0 0 40px rgba(200,255,0,0.06)'
            : '0 4px 24px rgba(0,0,0,0.45)',
        }}
      >
        {/* Thumbnail */}
        {event.imageUrl ? (
          <img loading="lazy" decoding="async" src={event.imageUrl} alt={event.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)` }}>
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />
          </div>
        )}

        {/* Cinematic gradient overlay — heavy at bottom for text legibility */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.08) 100%)'
        }} />

        {/* Festival: additional subtle green tint at top */}
        {isFestival && (
          <div className="absolute inset-0" style={{
            background: 'linear-gradient(to bottom, rgba(200,255,0,0.06) 0%, transparent 40%)'
          }} />
        )}

        {/* Top row: genre pills + bookmark */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <div className="flex gap-1.5 flex-wrap">
            {event.genre.slice(0, 2).map(g => (
              <span key={g}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(0,0,0,0.45)',
                  color: '#C8FF00',
                  border: '1px solid rgba(200,255,0,0.35)',
                  backdropFilter: 'blur(8px)',
                }}>
                {g}
              </span>
            ))}
            {event.country_code && (
              <span className="text-sm leading-none" title={event.country_name}
                style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }}>
                {countryCodeToFlag(event.country_code)}
              </span>
            )}
          </div>
          <button
            onClick={e => { e.preventDefault(); e.stopPropagation(); onSave() }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isSaved ? 'bg-[#C8FF00]/25 border border-[#C8FF00]/50' : 'bg-black/40 border border-white/20'
            }`}
            style={{ backdropFilter: 'blur(8px)' }}
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            <svg className="w-3.5 h-3.5" fill={isSaved ? '#C8FF00' : 'none'} viewBox="0 0 24 24"
              stroke={isSaved ? '#C8FF00' : 'rgba(255,255,255,0.8)'} strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
        </div>

        {/* Bottom: title + meta */}
        <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
          <p className="font-black text-white leading-tight text-base mb-1 drop-shadow-lg line-clamp-2">{event.name}</p>
          <div className="flex items-center justify-between gap-2">
            <p className="text-white/55 text-xs truncate">
              {event.venue}{event.city ? ` · ${event.city}` : ''}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {event.minPrice != null && (
                <span className="text-[10px] font-semibold text-white/40">
                  {event.minPrice === 0 ? 'Free' : `$${Number.isInteger(event.minPrice) ? event.minPrice : event.minPrice.toFixed(0)}`}
                </span>
              )}
              <span className="text-[11px] font-bold" style={{ color: isFestival ? '#C8FF00' : 'rgba(255,255,255,0.7)' }}>
                {dateLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Festival glow border inset */}
        {isFestival && (
          <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: 'inset 0 0 0 1.5px rgba(200,255,0,0.3)' }} />
        )}
      </Link>
    </div>
  )
}

// --- Featured Event Card ---
function FeaturedCard({ event, isSaved, onSave }: { event: Event; isSaved: boolean; onSave: () => void }) {

  const dateStr = (() => {
    const s = new Date(event.date + 'T00:00:00')
    if (event.date_end && event.date_end !== event.date) {
      const e = new Date(event.date_end + 'T00:00:00')
      const sameMonth = s.getMonth() === e.getMonth()
      return sameMonth
        ? s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) + '\u2013' + e.getDate() + ', ' + e.getFullYear()
        : s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' \u2013 ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return s.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  })()

  return (
    <div className="px-4 pt-2 pb-5">
      {/* Label row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: '#C8FF00' }} />
        <span className="text-[11px] font-black tracking-[0.18em] uppercase text-white/50">Featured Event</span>
      </div>

      <Link
        href={`/events/${event.id}`}
        onClick={() => sessionStorage.setItem('feedScrollY', String(window.scrollY))}
        className="block relative overflow-hidden rounded-2xl group active:scale-[0.99] transition-transform"
        style={{
          minHeight: 260,
          boxShadow: '0 0 0 1px rgba(200,255,0,0.2), 0 16px 48px rgba(0,0,0,0.6), 0 0 80px rgba(200,255,0,0.07)',
        }}
      >
        {/* Thumbnail */}
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #7C3AED, #2563EB)' }} />
        )}

        {/* Deep gradient overlay */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.1) 100%)'
        }} />

        {/* Ambient green glow at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-32" style={{
          background: 'linear-gradient(to top, rgba(200,255,0,0.08) 0%, transparent 100%)'
        }} />

        {/* Green inset border */}
        <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: 'inset 0 0 0 1px rgba(200,255,0,0.2)' }} />

        {/* Content */}
        <div className="relative z-10 p-5 flex flex-col justify-between" style={{ minHeight: 260 }}>
          {/* Genre pills */}
          <div className="flex gap-1.5 flex-wrap">
            {event.genre.slice(0, 3).map(g => (
              <span key={g} className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(200,255,0,0.4)', color: '#C8FF00', backdropFilter: 'blur(8px)' }}>
                {g}
              </span>
            ))}
          </div>

          {/* Bottom content */}
          <div>
            <h3 className="text-3xl font-black text-white leading-none mb-2 tracking-tight drop-shadow-2xl">{event.name}</h3>
            <p className="text-white/60 text-sm mb-4 font-medium">
              {dateStr} &nbsp;&middot;&nbsp; {event.venue}{event.city ? `, ${event.city}` : ''}
            </p>
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black transition-all group-hover:scale-[1.02] group-hover:shadow-[0_0_20px_rgba(200,255,0,0.4)]"
                style={{ background: '#C8FF00', color: '#000' }}>
                View Details
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
              <button
                onClick={e => { e.preventDefault(); e.stopPropagation(); onSave() }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${
                  isSaved ? 'bg-[#C8FF00]/20 border-[#C8FF00]/50' : 'bg-black/50 border-white/20 hover:border-white/50'
                }`}
                style={{ backdropFilter: 'blur(8px)' }}
              >
                <svg className="w-4 h-4" fill={isSaved ? '#C8FF00' : 'none'} viewBox="0 0 24 24" stroke={isSaved ? '#C8FF00' : 'white'} strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </Link>
    </div>
  )
}

function XPSection({ userXP }: { userXP: number }) {
  const actions = [
    { emoji: '📍', label: 'Check In',         xp: '+100' },
    { emoji: '🎪', label: 'Festival Review',   xp: '+10/cat' },
    { emoji: '🎟️', label: 'Submit Event',      xp: '+50'  },
    { emoji: '🎤', label: 'Artist Review',     xp: '+5/cat' },
    { emoji: '🔖', label: 'Save Event',        xp: '+10'  },
    { emoji: '🏟️', label: 'Venue Review',      xp: '+5/cat' },
  ]

  return (
    <div className="px-4 pt-5 pb-1">
      <div className="glass-green rounded-2xl p-4 relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(200,255,0,0.18) 0%, transparent 70%)' }} />

        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-end gap-1.5">
            <p className="text-[11px] font-black tracking-[0.15em] uppercase text-white/40 self-end mb-0.5">Your Score</p>
            <span className="text-2xl font-black leading-none" style={{
              background: 'linear-gradient(135deg, #C8FF00 0%, #A8D900 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              filter: 'drop-shadow(0 0 12px rgba(200,255,0,0.4))'
            }}>{userXP.toLocaleString()}</span>
            <span className="text-white/40 text-xs font-bold mb-0.5">XP</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/30 text-[10px] font-bold">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#C8FF00' }} />
            Rewards soon
          </div>
        </div>

        {/* Compact earn grid */}
        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest mb-2">Earn XP</p>
        <div className="grid grid-cols-2 gap-1.5">
          {actions.map(a => (
            <div key={a.label}
              className="rounded-xl px-3 py-2 flex items-center justify-between gap-2"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none flex-shrink-0">{a.emoji}</span>
                <span className="text-white/50 text-[11px] truncate">{a.label}</span>
              </div>
              <span className="text-[#C8FF00] text-[10px] font-black flex-shrink-0">{a.xp}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)' }} />
    </div>
  )
}

const COMING_UP_PAGE_SIZE = 30

/** Returns a live countdown string "Xh Ym" or "Xm Ys" until the given ISO timestamp, or null if it's in the past. */
function useCountdown(isoTarget: string | null) {
  const [display, setDisplay] = useState<string | null>(null)
  useEffect(() => {
    if (!isoTarget) { setDisplay(null); return }
    const update = () => {
      const diff = new Date(isoTarget).getTime() - Date.now()
      if (diff <= 0) { setDisplay(null); return }
      const totalSecs = Math.floor(diff / 1000)
      const h = Math.floor(totalSecs / 3600)
      const m = Math.floor((totalSecs % 3600) / 60)
      const s = totalSecs % 60
      if (h > 0) setDisplay(`${h}h ${m}m`)
      else setDisplay(`${m}m ${s}s`)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [isoTarget])
  return display
}

function LiveEventBanner({ event }: {
  event: { id: string; name: string; image_url: string | null; livestreams: { label: string; url: string }[]; starts_at: string | null }
}) {
  const countdown = useCountdown(event.starts_at)
  const isUpcoming = !!countdown  // countdown is non-null only while starts_at is still in the future

  return (
    <Link href={`/events/festival-${event.id}`}
      className="flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
      style={isUpcoming
        ? { background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }
        : { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }
      }>
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-xl overflow-hidden">
          {event.image_url
            ? <img src={event.image_url} alt={event.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-lg"
                style={{ background: isUpcoming ? 'rgba(234,179,8,0.2)' : 'rgba(239,68,68,0.2)' }}>
                {isUpcoming ? '📺' : '📺'}
              </div>}
        </div>
        {isUpcoming ? (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-400" />
          </span>
        ) : (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-bold text-sm truncate">{event.name}</p>
        {isUpcoming ? (
          <p className="text-xs font-semibold" style={{ color: '#EAB308' }}>
            🟡 Livestream starts in {countdown}
          </p>
        ) : (
          <p className="text-xs font-semibold" style={{ color: '#EF4444' }}>
            🔴 Live · {event.livestreams.length} stage{event.livestreams.length !== 1 ? 's' : ''} streaming now
          </p>
        )}
      </div>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        style={{ color: isUpcoming ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// --- Main page ---
export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [liveEvents, setLiveEvents] = useState<{ id: string; name: string; image_url: string | null; livestreams: { label: string; url: string; starts_at?: string }[]; starts_at: string | null }[]>([])
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [locationState, setLocationState] = useState<'requesting' | 'granted' | 'denied' | 'idle'>('idle')
  const [comingUpLimit, setComingUpLimit] = useState(COMING_UP_PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showFestivals, setShowFestivals] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [cityInput, setCityInput] = useState('')
  const [citySearching, setCitySearching] = useState(false)
  const [cityError, setCityError] = useState<string | null>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const { state, saveEvent } = useUser()
  const userXP = state.xp

  const loadEvents = useCallback(async (lat?: number, lng?: number, bust = false) => {
    // Check cache — skip if coords changed or bust requested
    if (!bust && homeEventsCache &&
        Date.now() - homeEventsCache.ts < HOME_CACHE_TTL_MS &&
        homeEventsCache.lat === lat && homeEventsCache.lng === lng) {
      setEvents(homeEventsCache.events)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const url = lat != null && lng != null
        ? `/api/events?lat=${lat}&lng=${lng}`
        : '/api/events'
      const res = await fetch(url)
      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      if (data.events && data.events.length > 0) {
        homeEventsCache = { events: data.events, ts: Date.now(), lat, lng }
        setEvents(data.events)
      }
    } catch {
      setEvents(mockEvents)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCitySearch = useCallback(async () => {
    if (!cityInput.trim()) return
    setCitySearching(true)
    setCityError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityInput.trim())}&format=json&limit=1`
      )
      const data = await res.json()
      if (!data?.[0]) { setCityError('City not found — try again'); return }
      const { lat, lon, address, display_name } = data[0]
      const label = address?.city || address?.town || address?.county || display_name.split(',')[0]
      const newLat = parseFloat(lat)
      const newLng = parseFloat(lon)
      const override = { lat: newLat, lng: newLng, label }
      localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(override))
      setLocationLabel(label)
      setLocationState('granted')
      setShowLocationModal(false)
      setCityInput('')
      homeEventsCache = null // bust cache so new city loads fresh
      loadEvents(newLat, newLng, true)
    } catch {
      setCityError('Something went wrong — try again')
    } finally {
      setCitySearching(false)
    }
  }, [cityInput, loadEvents])

  const clearLocationOverride = useCallback(() => {
    localStorage.removeItem(LOCATION_STORAGE_KEY)
    homeEventsCache = null
    setLocationLabel(null)
    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLocationState('granted')
        try {
          const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          const geoData = await geo.json()
          setLocationLabel(geoData.address?.city || geoData.address?.town || 'Your Location')
        } catch { setLocationLabel('Your Location') }
        loadEvents(latitude, longitude, true)
      },
      () => { setLocationState('denied'); setLocationLabel('Los Angeles'); loadEvents(34.0522, -118.2437, true) },
      { timeout: 8000 }
    )
  }, [loadEvents])

  useEffect(() => {
    // Check for a saved location override first
    const saved = localStorage.getItem(LOCATION_STORAGE_KEY)
    if (saved) {
      try {
        const { lat, lng, label } = JSON.parse(saved)
        setLocationLabel(label)
        setLocationState('granted')
        loadEvents(lat, lng)
        return
      } catch { localStorage.removeItem(LOCATION_STORAGE_KEY) }
    }

    if (!navigator.geolocation) {
      setLocationState('idle')
      loadEvents()
      return
    }

    setLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setLocationState('granted')
        try {
          const geo = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const geoData = await geo.json()
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.county || 'Your Location'
          setLocationLabel(city)
        } catch {
          setLocationLabel('Your Location')
        }
        loadEvents(latitude, longitude)
      },
      () => {
        setLocationState('denied')
        setLocationLabel('Los Angeles')
        loadEvents(34.0522, -118.2437)
      },
      { timeout: 8000 }
    )
  }, [loadEvents])

  // Fetch live events independently of geo filter
  useEffect(() => {
    fetch('/api/events/live')
      .then(r => r.json())
      .then(d => setLiveEvents(d.events || []))
      .catch(() => {})
  }, [])

  // Pull featured event (exclude from regular feed)
  const featuredEvent = events.find(e => e.featured && e.status === 'approved') ?? null

  // Helper — is this a festival?
  const isFestivalEvent = (e: Event) =>
    e.id.startsWith('festival-') || !!(e.date_end && e.date_end !== e.date)

  // Group events into buckets
  const buckets: Record<string, Event[]> = {
    tonight: [],
    tomorrow: [],
    thisWeek: [],
    comingUp: [],
  }

  events
    .filter(e => {
      if (e.status !== 'approved' || e.featured) return false
      const fest = isFestivalEvent(e)
      if (fest && !showFestivals) return false
      if (!fest && !showEvents) return false
      return true
    })
    .forEach(e => {
      const bucket = getDateBucket(e.date)
      if (bucket) buckets[bucket].push(e)
    })

  // Paginated Coming Up slice
  const comingUpVisible = buckets.comingUp.slice(0, comingUpLimit)
  const hasMore = comingUpLimit < buckets.comingUp.length

  // Infinite scroll — load 20 more when sentinel enters viewport
  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setComingUpLimit(prev => prev + COMING_UP_PAGE_SIZE)
  }, [loadingMore, hasMore])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting) loadMore() },
      { rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  // Reset limit when events reload OR when the filter changes
  useEffect(() => {
    setComingUpLimit(COMING_UP_PAGE_SIZE)
  }, [events, showFestivals, showEvents])

  // Restore scroll position when returning from an event detail page
  useEffect(() => {
    if (loading || events.length === 0) return
    const saved = sessionStorage.getItem('feedScrollY')
    if (!saved) return
    sessionStorage.removeItem('feedScrollY')
    // Double rAF ensures the browser has painted the list before we scroll
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.scrollTo({ top: parseInt(saved, 10), behavior: 'instant' })
      })
    })
  }, [loading, events.length])

  const visibleBuckets: Record<string, Event[]> = { ...buckets, comingUp: comingUpVisible }
  const activeSections = SECTION_ORDER.filter(s => visibleBuckets[s].length > 0)

  return (
    <PullToRefresh onRefresh={async () => { loadEvents(undefined, undefined, true) }} className="flex flex-col min-h-screen pb-20">
      {/* Slim brand header */}
      <div
        className="relative flex flex-col items-center justify-center"
        style={{ height: 180 }}
      >
        {/* Hero background */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
        />
        {/* Deep overlay with upward green ambient glow */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.85) 100%)' }} />
        <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(200,255,0,0.07) 0%, transparent 100%)' }} />
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center gap-1.5">
          <img src="/eslogo.webp" alt="Electric State" className="w-14 h-14 object-contain mb-1"
            style={{ filter: 'drop-shadow(0 0 16px rgba(200,255,0,0.4))' }} />
          <h1 className="text-2xl font-black text-white tracking-[0.08em] leading-none uppercase">Electric State</h1>
          <p className="text-xs font-black tracking-[0.3em] uppercase"
            style={{ color: 'rgba(200,255,0,0.7)' }}>Scene Passport</p>
          {/* Location pill — tappable */}
          <button
            onClick={() => { setCityInput(''); setCityError(null); setShowLocationModal(true) }}
            className="mt-2 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderColor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {locationState === 'requesting' ? (
              <>
                <svg className="w-3 h-3 animate-spin text-white/50" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-white/50">Detecting location…</span>
              </>
            ) : locationLabel ? (
              <>
                <svg className="w-3 h-3 text-[#C8FF00]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span className="text-white/80">{locationLabel}</span>
                <svg className="w-3 h-3 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.536-6.536a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
                </svg>
              </>
            ) : (
              <span className="text-white/40">Set location</span>
            )}
          </button>
        </div>
      </div>

      {/* Location modal */}
      {showLocationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowLocationModal(false) }}
        >
          <div
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-black text-lg">📍 Change Location</h3>
              <button onClick={() => setShowLocationModal(false)} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="e.g. Boston, Chicago, London…"
                value={cityInput}
                onChange={e => { setCityInput(e.target.value); setCityError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleCitySearch() }}
                className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              />
              <button
                onClick={handleCitySearch}
                disabled={citySearching || !cityInput.trim()}
                className="px-5 py-3 rounded-xl text-sm font-black transition-all disabled:opacity-40"
                style={{ background: '#C8FF00', color: '#000' }}
              >
                {citySearching ? '…' : 'Go'}
              </button>
            </div>
            {cityError && <p className="text-red-400 text-xs mt-2">{cityError}</p>}
            {localStorage.getItem(LOCATION_STORAGE_KEY) && (
              <button
                onClick={() => { setShowLocationModal(false); clearLocationOverride() }}
                className="mt-4 text-white/40 text-xs hover:text-white/70 transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                Use my current location instead
              </button>
            )}
          </div>
        </div>
      )}

      {/* Universal Search */}
      <div className="px-4 pt-4 pb-2">
        <SearchBar />
      </div>

      {/* Explore the Universe button — hidden until graph data is ready */}

      {/* 🔴 Live Now / 🟡 Upcoming banner — global, bypasses geo filter */}
      {liveEvents.length > 0 && (
        <div className="mx-4 mb-3 flex flex-col gap-2">
          {liveEvents.map(e => (
            <LiveEventBanner key={e.id} event={e} />
          ))}
        </div>
      )}

      {/* Featured Event */}
      {!loading && featuredEvent && (
        <FeaturedCard
          event={featuredEvent}
          isSaved={state.savedEvents.includes(featuredEvent.id)}
          onSave={() => saveEvent(featuredEvent)}
        />
      )}

      {/* XP Experiences */}
      <XPSection userXP={userXP} />

      {/* Feed filters */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        {[
          { key: 'festivals', label: 'Festivals', emoji: '🎪', active: showFestivals, toggle: () => { if (showEvents) setShowFestivals(v => !v) } },
          { key: 'events',    label: 'Events',    emoji: '⚡',    active: showEvents,    toggle: () => { if (showFestivals) setShowEvents(v => !v) } },
        ].map(f => (
          <button key={f.key} onClick={f.toggle}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all active:scale-95"
            style={f.active
              ? { background: 'rgba(200,255,0,0.12)', border: '1px solid rgba(200,255,0,0.4)', color: '#C8FF00', boxShadow: '0 0 12px rgba(200,255,0,0.15)' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}
          >
            <span>{f.emoji}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1">
        {loading ? (
          <div className="divide-y divide-white/5">
            {/* Skeleton section header */}
            <div className="px-4 pt-5 pb-2">
              <div className="h-5 w-28 bg-white/10 rounded animate-pulse" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : activeSections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <p className="text-4xl mb-3">🎶</p>
            <p className="text-white font-bold">No upcoming events</p>
            <p className="text-white/40 text-sm mt-1">Check back soon or explore all events</p>
            <Link href="/events" className="mt-4 text-[#C8FF00] text-sm hover:underline">
              Browse all events →
            </Link>
          </div>
        ) : (
          <div>
            {activeSections.map(sectionKey => (
              <div key={sectionKey}>
                {/* Section header */}
                <div className="px-4 pt-6 pb-3 flex items-center gap-3">
                  <h2 className="font-black text-white text-lg tracking-tight">{SECTION_LABELS[sectionKey]}</h2>
                  <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.08), transparent)' }} />
                </div>
                {/* Cards */}
                <div>
                  {visibleBuckets[sectionKey].map(event => (
                    <FeedCard
                      key={event.id}
                      event={event}
                      isSaved={state.savedEvents.includes(event.id)}
                      onSave={() => saveEvent(event)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="flex items-center justify-center py-8">
              {!hasMore && buckets.comingUp.length > 0 && (
                <p className="text-white/15 text-xs">You&apos;ve seen it all ⚡</p>
              )}
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}
