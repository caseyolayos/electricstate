'use client'

import { useState, useEffect, useRef } from 'react'
import { useZoomLock } from '@/lib/useZoomLock'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { mockEvents, Event, Organizer } from '@/lib/mockData'
import { useUser } from '@/lib/mockStore'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const CommentsSection = dynamic(() => import('@/components/CommentsSection'), { ssr: false })
const TicketSection = dynamic(() => import('@/components/TicketSection'), { ssr: false })
const LiveStreamSection = dynamic(() => import('@/components/LiveStreamSection'), { ssr: false })

/** Extract a bare YouTube video ID from any common URL format or bare ID. */
function extractYouTubeId(input: string): string {
  if (!input) return ''
  const s = input.trim()
  // Already a bare 11-char ID (no slashes or dots)
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s
  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`)
    // youtube.com/watch?v=ID  or  youtube.com/embed/ID
    const v = url.searchParams.get('v')
    if (v) return v
    // youtu.be/ID  or  youtube.com/shorts/ID  or  youtube.com/embed/ID
    const parts = url.pathname.split('/').filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && /^[a-zA-Z0-9_-]{11}$/.test(last)) return last
  } catch {}
  return s // fallback: return as-is
}

function stripHtml(html: string): string {
  return html
    // Convert block-level tags and <br> to newlines before stripping
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6]|tr)>/gi, '\n')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
}

function formatDescription(text: string): string[] {
  const processed = stripHtml(text)
    // Treat **bold** markdown as section headers (add paragraph breaks around them)
    .replace(/\*\*([^*]+)\*\*/g, '\n\n$1\n\n')
    // Break after sentence-ending punctuation immediately followed by uppercase (e.g. "Ticket.Got")
    .replace(/([.!?])([A-Z])/g, '$1\n$2')
    // Break before multi-word ALL-CAPS section headers (e.g. "KNOW BEFORE YOU GO:", "STUBHUB/VIVID SEATS...")
    .replace(/([a-z0-9+,;'"\)]) *([A-Z]{2,}(?:[ /][A-Z][A-Z/\-]*)+:?)/g, '$1\n\n$2')
    // Break before single ALL-CAPS word followed by colon (e.g. "NOTE:", "WARNING:")
    .replace(/([a-z0-9+,;'"\)]) *([A-Z]{3,}:)/g, '$1\n\n$2')
    // Break when ALL-CAPS run (5+ chars) transitions directly into a capitalized word (e.g. "RESELLERSWe")
    // Using 5+ to avoid splitting short acronyms with lowercase suffixes like "RSVPs"
    .replace(/([A-Z]{5,})([A-Z][a-z])/g, '$1\n$2')
    // Break before dash-bullet items not immediately after a colon
    .replace(/([^:\n]) *(- )(?=[A-Z\d])/g, '$1\n$2')
    // Break after colon when immediately followed by a dash-bullet
    .replace(/(:\s*)(- )/g, '$1\n$2')

  return processed
    .split(/\n{2,}|\n/)
    .map(p => p.trim())
    .filter(Boolean)
}

function slugifyVenue(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()
  if (sameMonth) {
    return s.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) +
      '–' + e.getDate() + ', ' + e.getFullYear()
  }
  return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' – ' + e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const VOTE_CATEGORIES = [
  { key: 'food', label: 'Food & Drinks', emoji: '🍕' },
  { key: 'security', label: 'Security', emoji: '🛡️' },
  { key: 'bathrooms', label: 'Bathrooms', emoji: '🚻' },
  { key: 'parking', label: 'Parking', emoji: '🅿️' },
  { key: 'venue', label: 'Venue', emoji: '🏟️' },
  { key: 'bar_prices', label: 'Bar Prices', emoji: '🍺' },
  { key: 'sound', label: 'Sound Quality', emoji: '🔊' },
  { key: 'vibe', label: 'Overall Vibe', emoji: '✨' },
]

interface VoteData {
  avg: number
  count: number
}

// ── Organized By card ─────────────────────────────────────────────────────
function OrganizerCard({ organizer, organizerName }: { organizer?: Organizer; organizerName?: string }) {
  const displayName = organizer?.name || organizerName
  if (!displayName) return null

  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const inner = (
    <div className="flex items-center gap-3">
      {/* Logo / initials avatar */}
      <div className="flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center font-black text-sm"
        style={{ background: organizer?.logo_url ? 'transparent' : 'linear-gradient(135deg,rgba(200,255,0,0.25),rgba(200,255,0,0.08))', border: '1px solid rgba(200,255,0,0.2)' }}>
        {organizer?.logo_url
          ? <img src={organizer.logo_url} alt={displayName} className="w-full h-full object-cover" />
          : <span style={{ color: '#C8FF00' }}>{initials}</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-tight truncate">{displayName}</p>
        {organizer?.founded_year && (
          <p className="text-white/40 text-xs mt-0.5">Est. {organizer.founded_year}</p>
        )}
      </div>
      {organizer && (
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  )

  return (
    <div className="event-card p-5 mb-4">
      <h2 className="font-bold text-white/50 mb-3 text-sm uppercase tracking-wider">Organized By</h2>
      {organizer ? (
        <Link href={`/organizers/${organizer.slug}`} className="block rounded-xl p-3 transition-colors hover:bg-white/5 -mx-1" style={{ margin: '0 -4px' }}>
          {inner}
        </Link>
      ) : (
        <div className="rounded-xl p-3">{inner}</div>
      )}
    </div>
  )
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-xl transition-transform hover:scale-110 active:scale-95 px-0.5"
        >
          <span style={{ color: star <= (hover || value) ? '#C8FF00' : 'rgba(255,255,255,0.15)' }}>★</span>
        </button>
      ))}
    </div>
  )
}

function FestivalVoting({ eventId, user }: { eventId: string; user: { id?: string } | null }) {
  const festivalId = eventId.replace('festival-', '')
  const storageKey = `festival-votes-${eventId}`

  const [serverVotes, setServerVotes] = useState<Record<string, VoteData>>({})
  const [myVotes, setMyVotes] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [festivalSlug, setFestivalSlug] = useState<string | null>(null)
  const [xpToast, setXpToast] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/festivals/${festivalId}/votes`)
      .then(r => r.json())
      .then(d => {
        setServerVotes(d.votes || {})
        setFestivalSlug(d.slug || null)
      })
      .catch(() => {})

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setMyVotes(JSON.parse(stored))
    } catch {}
  }, [festivalId, storageKey])

  const handleVote = async (category: string, rating: number) => {
    setSaving(category)

    const newMyVotes = { ...myVotes, [category]: rating }
    setMyVotes(newMyVotes)
    localStorage.setItem(storageKey, JSON.stringify(newMyVotes))

    const existing = serverVotes[category]
    if (existing) {
      const prevRating = myVotes[category]
      if (prevRating) {
        const newTotal = (existing.avg * existing.count) - prevRating + rating
        setServerVotes(prev => ({
          ...prev,
          [category]: { avg: Math.round((newTotal / existing.count) * 10) / 10, count: existing.count }
        }))
      } else {
        const newCount = existing.count + 1
        const newAvg = ((existing.avg * existing.count) + rating) / newCount
        setServerVotes(prev => ({
          ...prev,
          [category]: { avg: Math.round(newAvg * 10) / 10, count: newCount }
        }))
      }
    } else {
      setServerVotes(prev => ({ ...prev, [category]: { avg: rating, count: 1 } }))
    }

    try {
      const res = await fetch(`/api/festivals/${festivalId}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, rating, userId: user?.id || null }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.xp_awarded > 0) {
          setXpToast(data.xp_awarded)
          setTimeout(() => setXpToast(null), 2500)
        }
      }
    } catch {}

    setSaving(null)
  }

  const totalVotes = Object.values(serverVotes).reduce((s, v) => s + v.count, 0)

  // Raver Score: average of all category averages, scaled 0-100
  const ratedCategories = Object.values(serverVotes).filter(v => v.count > 0)
  const raverScore = ratedCategories.length > 0
    ? Math.round((ratedCategories.reduce((s, v) => s + v.avg, 0) / ratedCategories.length) * 20)
    : null

  // Color: red (0) → yellow (50) → green (100) using HSL
  const scoreColor = raverScore !== null ? `hsl(${raverScore * 1.2}, 90%, 55%)` : 'rgba(255,255,255,0.2)'

  return (
    <div className="glass p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-white text-sm uppercase tracking-wider text-white/50">Community Ratings</h2>
          {totalVotes > 0 && (
            <p className="text-white/30 text-xs mt-0.5">{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} from the community</p>
          )}
        </div>
        {/* Raver Score */}
        <div className="flex flex-col items-center">
          <span
            className="text-3xl font-black leading-none"
            style={{ color: scoreColor }}
          >
            {raverScore !== null ? raverScore : '—'}
          </span>
          <span className="text-white/30 text-[10px] mt-0.5 font-bold uppercase tracking-wide">Raver Score</span>
        </div>
      </div>

      {/* Score bar */}
      {raverScore !== null && (
        <div className="mb-5">
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${raverScore}%`,
                background: `linear-gradient(90deg, #FF4444, ${scoreColor})`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white/20 text-[10px]">0</span>
            <span className="text-white/20 text-[10px]">100</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {VOTE_CATEGORIES.map(cat => {
          const server = serverVotes[cat.key]
          const myRating = myVotes[cat.key] || 0
          const isSavingThis = saving === cat.key

          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{cat.emoji}</span>
                  <span className="text-white text-sm font-medium">{cat.label}</span>
                </div>
                <span className="text-white/35 text-xs">
                  {server ? `${server.avg} ★ · ${server.count} ${server.count === 1 ? 'vote' : 'votes'}` : 'No votes yet'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating value={myRating} onChange={(v) => handleVote(cat.key, v)} />
                {isSavingThis && (
                  <span className="w-3 h-3 border border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin flex-shrink-0" />
                )}
                {myRating > 0 && !isSavingThis && (
                  <span className="text-[#C8FF00] text-[11px] font-medium">✓</span>
                )}
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-1 rounded-full transition-all duration-500"
                  style={{
                    width: server ? `${(server.avg / 5) * 100}%` : myRating ? `${(myRating / 5) * 100}%` : '0%',
                    background: (server?.avg || myRating) >= 4 ? '#C8FF00' : (server?.avg || myRating) >= 3 ? '#FFD700' : '#FF6B6B'
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {Object.keys(myVotes).length > 0 && (
        <p className="text-white/20 text-xs text-center mt-5">
          Your ratings are saved{user?.id ? ' and synced to your account' : ' locally · sign in to share globally'}
        </p>
      )}
      {festivalSlug && (
        <p className="text-white/15 text-[10px] text-center mt-1">
          Reviews carry over year after year · {festivalSlug}
        </p>
      )}

      {/* XP toast */}
      {xpToast !== null && (
        <div className="flex items-center justify-center gap-2 mt-3 animate-slide-up">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm shadow-[0_0_20px_rgba(200,255,0,0.4)]"
            style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000' }}>
            <span>⚡</span>
            +{xpToast} XP for your review!
          </div>
        </div>
      )}
    </div>
  )
}

export default function EventDetailPage({ initialEvent }: { initialEvent?: Event | null }) {
  const params = useParams()
  const router = useRouter()
  const { state, checkIn, saveEvent, toggleGoing } = useUser()
  const { user } = useAuth()
  const [showToast, setShowToast] = useState(false)
  const [checkInState, setCheckInState] = useState<'idle' | 'locating' | 'too-far' | 'error'>('idle')
  const [distanceMsg, setDistanceMsg] = useState<string | null>(null)

  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [event, setEvent] = useState<Event | null>(initialEvent ?? mockEvents.find(e => e.id === id) ?? null)
  const [loading, setLoading] = useState(!initialEvent && !mockEvents.find(e => e.id === id))
  const [festivalDates, setFestivalDates] = useState<string[]>([])
  const [countdown, setCountdown] = useState<string | null>(null)
  const [addressRevealed, setAddressRevealed] = useState(false)
  const [youtubeIds, setYoutubeIds] = useState<Record<string, string>>({})
  const [youtubeHeadlinerVideoId, setYoutubeHeadlinerVideoId] = useState<string | null>(null)
  const [youtubeFestivalVideoId, setYoutubeFestivalVideoId] = useState<string | null>(null)
  const [goingCount, setGoingCount] = useState<number | null>(null)
  const [goingAvatars, setGoingAvatars] = useState<Array<{id:string,display_name:string,username:string|null,avatar_emoji:string,avatar_url:string|null}>>([])
  const [weatherDays, setWeatherDays] = useState<Array<{ date: string; day: string; emoji: string; high: number; low: number; feelsLike: number; precip: number; wind: number; uv: number; sunset: string | null }> | null>(null)
  const [shareToast, setShareToast] = useState(false)
  const [lineupSearch, setLineupSearch] = useState('')
  const [lineupExpanded, setLineupExpanded] = useState(false)
  const [lineupDay, setLineupDay] = useState<string | null>(null)
  const [flyerUploading, setFlyerUploading] = useState(false)
  const [flyerError, setFlyerError] = useState<string | null>(null)
  const flyerInputRef = useRef<HTMLInputElement>(null)

  const isOwnEvent = !!user && !!event?.submitted_by && user.id === event.submitted_by
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lineupLightboxOpen, setLineupLightboxOpen] = useState(false)
  const [lineupZoom, setLineupZoom] = useState(1)
  const [lineupPan, setLineupPan] = useState({ x: 0, y: 0 })
  const lineupImgRef = useRef<HTMLImageElement>(null)
  const lineupPinchRef = useRef<{ dist: number; x: number; y: number } | null>(null)
  const lineupDragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)
  useZoomLock(lightboxOpen)  // unlock pinch-zoom while flyer lightbox is open
  useZoomLock(lineupLightboxOpen)
  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen])
  useEffect(() => {
    if (!lineupLightboxOpen) return
    setLineupZoom(1)
    setLineupPan({ x: 0, y: 0 })
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLineupLightboxOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lineupLightboxOpen])

  const handleFlyerUpdate = async (file: File) => {
    if (!event || !file) return
    const festivalId = event.id.replace('festival-', '')
    const supabase = createClient()
    if (!supabase) return
    setFlyerUploading(true)
    setFlyerError(null)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${festivalId}/flyer.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('event-flyers')
        .upload(path, file, { upsert: true })
      if (uploadError) {
        setFlyerError(`Upload failed: ${uploadError.message}`)
        return
      }
      const { data } = supabase.storage.from('event-flyers').getPublicUrl(path)
      const imageUrl = data.publicUrl
      const res = await fetch('/api/submit-event/flyer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: festivalId, imageUrl }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setFlyerError(`Saved photo but failed to link it: ${json.error || 'unknown error'}`)
        return
      }
      // Update hero image immediately without reload
      setEvent(prev => prev ? { ...prev, imageUrl } : prev)
    } catch (err) {
      setFlyerError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setFlyerUploading(false)
      if (flyerInputRef.current) flyerInputRef.current.value = ''
    }
  }

  useEffect(() => {
    if (event) return
    // Not in mock data — fetch from API (Ticketmaster or Eventbrite)
    async function fetchEvent() {
      try {
        const supabase = createClient()
        const token = supabase
          ? await supabase.auth.getSession().then((r: { data: { session: { access_token: string } | null } }) => r.data.session?.access_token ?? null)
          : null
        const headers: Record<string, string> = {}
        if (token) headers['Authorization'] = `Bearer ${token}`
        const res = await fetch(`/api/events/${encodeURIComponent(id)}`, { headers })
        if (res.ok) {
          const data = await res.json()
          if (data.event) setEvent(data.event)
        }
      } catch {
        // leave null
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [id, event])

  // Fire analytics view hit once per page load for festival events
  useEffect(() => {
    if (!event?.id?.startsWith('festival-')) return
    const festivalId = event.id.replace('festival-', '')
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: festivalId, type: 'view' }),
    }).catch(() => {})
  }, [event?.id])

  // Fire all event-dependent fetches in parallel once event is loaded
  useEffect(() => {
    if (!event) return

    if (event.id.startsWith('festival-')) {
      // ── Festival: parallel fetches ────────────────────────────────────────
      const festivalId = event.id.replace('festival-', '')
      const year = event.date ? new Date(event.date).getFullYear() : new Date().getFullYear()

      // YouTube preview — use pinned video if available, otherwise search
      const ytPromise = event.youtube_video_id
        ? Promise.resolve(setYoutubeFestivalVideoId(extractYouTubeId(event.youtube_video_id)))
        : fetch(`/api/youtube/festival?name=${encodeURIComponent(event.name)}&year=${year}`)
            .then(r => r.json())
            .then(d => { if (d.videoId) setYoutubeFestivalVideoId(d.videoId) })
            .catch(() => {})

      // Festival dates
      const datesPromise = fetch(`/api/festivals/${festivalId}/dates`)
        .then(r => r.json())
        .then(d => { if (d.dates?.length > 1) setFestivalDates(d.dates) })
        .catch(() => {})

      // Going count
      const goingPromise = fetch(`/api/festivals/${festivalId}/going`)
        .then(r => r.json())
        .then(d => { if (typeof d.count === 'number') setGoingCount(d.count); if (d.avatars) setGoingAvatars(d.avatars) })
        .catch(() => {})

      // Weather: show if the event end date is today or in the future (up to 14 days out)
      // Clamp start to today so we don't ask Open-Meteo for past dates it can't forecast
      let weatherPromise: Promise<void> = Promise.resolve()
      if (event.lat && event.lng && event.date) {
        const dateEnd = event.date_end ?? event.date
        const today = new Date()
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(today)
        const endDate = new Date(dateEnd + 'T23:59:59')
        const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / 86400000)
        if (daysUntilEnd >= 0 && daysUntilEnd <= 14) {
          // Start from today (or event start, whichever is later) so forecast API is happy
          const eventStart = new Date(event.date + 'T00:00:00')
          const effectiveStart = eventStart > today ? event.date : todayStr
          const maxEnd = new Date(today)
          maxEnd.setDate(maxEnd.getDate() + 14)
          const effectiveEnd = endDate < maxEnd ? dateEnd : maxEnd.toISOString().split('T')[0]
          weatherPromise = fetch(`/api/weather?lat=${event.lat}&lng=${event.lng}&start=${effectiveStart}&end=${effectiveEnd}`)
            .then(r => r.json())
            .then(d => { if (d.days?.length > 0) setWeatherDays(d.days) })
            .catch(() => {})
        }
      }

      Promise.all([ytPromise, datesPromise, goingPromise, weatherPromise])
    } else {
      // ── Non-festival: YouTube artist spotlight ───────────────────────────
      const artists = event.lineup?.filter(a => a && a !== 'Lineup TBA') || []
      if (artists.length === 0) return
      const genres = event.genre || []
      const genreParam = encodeURIComponent(genres.join(','))
      const headliner = artists[0]

      fetch(`/api/youtube/artist?artist=${encodeURIComponent(headliner)}&genres=${genreParam}`)
        .then(r => r.json())
        .then(d => { if (d.videoId) setYoutubeHeadlinerVideoId(d.videoId) })
        .catch(() => {})

      const map: Record<string, string> = {}
      artists.forEach(artist => {
        const isElectronic = genres.some((g: string) =>
          ['house', 'techno', 'electronic', 'edm', 'dnb', 'bass', 'trance', 'dance'].some(k =>
            g.toLowerCase().includes(k)
          )
        )
        const q = isElectronic ? `${artist} DJ set live` : `${artist} live performance`
        map[artist] = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`
      })
      setYoutubeIds(map)
    }
  }, [event])

  // Underground reveal countdown (timer — kept separate intentionally)
  useEffect(() => {
    if (!event?.reveal_at) return
    const revealTime = new Date(event.reveal_at).getTime()
    const tick = () => {
      const diff = revealTime - Date.now()
      if (diff <= 0) { setAddressRevealed(true); setCountdown(null); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`)
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [event?.reveal_at])

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="h-64 bg-white/5 animate-pulse" />
        <div className="px-4 max-w-2xl mx-auto -mt-8 relative z-10 space-y-4 pb-8">
          {[1,2,3].map(i => (
            <div key={i} className="glass p-5 animate-pulse">
              <div className="h-6 bg-white/10 rounded w-3/4 mb-2" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
        <p className="text-5xl mb-4">🎵</p>
        <h1 className="text-2xl font-black text-white mb-2">Event Not Found</h1>
        <p className="text-white/40 mb-6">This event doesn&apos;t exist or may have been removed.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000000' }}
        >
          Go Back
        </button>
      </div>
    )
  }

  const isCheckedIn = state.checkedInEvents.includes(event.id)
  const isSaved = state.savedEvents.includes(event.id)
  const isGoing = state.goingEvents?.includes(event.id) ?? false

  const handleCheckIn = async () => {
    if (isCheckedIn) return

    // Must be signed in
    if (!user) {
      setDistanceMsg('Sign in to check in and earn XP')
      setCheckInState('too-far')
      setTimeout(() => setCheckInState('idle'), 5000)
      return
    }

    // Must be within the event date range (client-side UX check — server validates authoritatively)
    const today = new Date()
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(today)
    const dateEnd = event.date_end ?? event.date
    if (todayStr < event.date || todayStr > dateEnd) {
      const eventDate = new Date(event.date + 'T00:00:00')
      const formatted = eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      setDistanceMsg(`Check-in opens on ${formatted} — the day of the event.`)
      setCheckInState('too-far')
      setTimeout(() => setCheckInState('idle'), 5000)
      return
    }

    setCheckInState('locating')
    setDistanceMsg(null)

    const doCheckIn = async (lat: number | null, lng: number | null) => {
      try {
        const { data: { session } } = await createClient()!.auth.getSession()
        const res = await fetch('/api/checkin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            eventId: event.id,
            lat,
            lng,
            eventName: event.name,
            venueName: event.venue,
            venueCity: event.city,
            eventDate: event.date,
          }),
        })

        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data.error === 'not_today') {
            setDistanceMsg(data.message ?? 'Check-in is not available today.')
            setCheckInState('too-far')
          } else if (data.error === 'too_far') {
            setDistanceMsg(data.message ?? "You're too far from the venue.")
            setCheckInState('too-far')
          } else if (data.error === 'already_checked_in') {
            setDistanceMsg('You already checked in to this event!')
            setCheckInState('too-far')
          } else {
            setDistanceMsg(data.message ?? 'Something went wrong. Please try again.')
            setCheckInState('error')
          }
          setTimeout(() => setCheckInState('idle'), 5000)
          return
        }

        // Success — update local state and show toast
        checkIn(event.id, event.genre, event.venue)
        setCheckInState('idle')
        setShowToast(true)
        setTimeout(() => setShowToast(false), 3000)
      } catch {
        setDistanceMsg('Something went wrong. Please try again.')
        setCheckInState('error')
        setTimeout(() => setCheckInState('idle'), 5000)
      }
    }

    if (!navigator.geolocation) {
      await doCheckIn(null, null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await doCheckIn(pos.coords.latitude, pos.coords.longitude)
      },
      async () => {
        // Location denied or unavailable — call API with null sentinel
        await doCheckIn(null, null)
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 30000 }
    )
  }

  const GENRE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    House:       { bg: 'rgba(200,255,0,0.12)',   border: 'rgba(200,255,0,0.3)',   text: '#C8FF00' },
    'Deep House': { bg: 'rgba(200,255,0,0.10)',  border: 'rgba(200,255,0,0.25)',  text: '#b8ef00' },
    Techno:      { bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.3)',  text: '#60A5FA' },
    'Tech House': { bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.25)', text: '#93C5FD' },
    Bass:        { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', text: '#A78BFA' },
    Dubstep:     { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.3)', text: '#A78BFA' },
    Drum:        { bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)', text: '#C4B5FD' },
    Trance:      { bg: 'rgba(34,211,238,0.12)',  border: 'rgba(34,211,238,0.3)',  text: '#22D3EE' },
    Ambient:     { bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.3)', text: '#94A3B8' },
    Disco:       { bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.3)',  text: '#FB923C' },
    Funk:        { bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.25)', text: '#FDBA74' },
    Electronic:  { bg: 'rgba(200,255,0,0.08)',   border: 'rgba(200,255,0,0.2)',   text: '#a0cc00' },
    DNB:         { bg: 'rgba(244,63,94,0.12)',   border: 'rgba(244,63,94,0.3)',   text: '#FB7185' },
    'Drum & Bass': { bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.3)',  text: '#FB7185' },
    Afro:        { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.3)',  text: '#FCD34D' },
    Melodic:     { bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.3)',  text: '#34D399' },
  }

  const sourceColors: Record<string, string> = {
    Verified: 'bg-[#C8FF00]/20 text-[#C8FF00] border-[#C8FF00]/30',
    'AI Found': 'bg-[#C8FF00]/20 text-purple-300 border-[#C8FF00]/30',
    'Community Submitted': 'bg-[#C8FF00]/20 text-[#C8FF00] border-[#C8FF00]/30',
  }

  return (
    <div className="min-h-screen">
      {/* Lightbox overlay */}
      {lightboxOpen && event.imageUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onClick={() => setLightboxOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.imageUrl}
            alt={event.name}
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ maxWidth: '92vw', maxHeight: '92vh' }}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Lineup Poster Lightbox */}
      {lineupLightboxOpen && event.lineupImageUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)' }}
          onClick={() => { if (lineupZoom <= 1) setLineupLightboxOpen(false) }}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            onClick={() => setLineupLightboxOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10"
            onClick={e => e.stopPropagation()}>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
              onClick={() => { setLineupZoom(z => Math.max(1, +(z - 0.5).toFixed(1))); if (lineupZoom - 0.5 <= 1) setLineupPan({ x: 0, y: 0 }) }}
            >−</button>
            <span className="text-white/60 text-sm font-mono w-12 text-center">{Math.round(lineupZoom * 100)}%</span>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xl transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)' }}
              onClick={() => setLineupZoom(z => Math.min(5, +(z + 0.5).toFixed(1)))}
            >+</button>
          </div>

          {/* Image container */}
          <div
            className="overflow-hidden w-full h-full flex items-center justify-center"
            onClick={e => e.stopPropagation()}
            onWheel={e => {
              e.preventDefault()
              setLineupZoom(z => {
                const next = Math.min(5, Math.max(1, +(z - e.deltaY * 0.002).toFixed(2)))
                if (next <= 1) setLineupPan({ x: 0, y: 0 })
                return next
              })
            }}
            onTouchStart={e => {
              if (e.touches.length === 2) {
                const dx = e.touches[1].clientX - e.touches[0].clientX
                const dy = e.touches[1].clientY - e.touches[0].clientY
                lineupPinchRef.current = { dist: Math.hypot(dx, dy), x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 }
              } else if (e.touches.length === 1 && lineupZoom > 1) {
                lineupDragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, panX: lineupPan.x, panY: lineupPan.y }
              }
            }}
            onTouchMove={e => {
              if (e.touches.length === 2 && lineupPinchRef.current) {
                const dx = e.touches[1].clientX - e.touches[0].clientX
                const dy = e.touches[1].clientY - e.touches[0].clientY
                const newDist = Math.hypot(dx, dy)
                const scale = newDist / lineupPinchRef.current.dist
                setLineupZoom(z => {
                  const next = Math.min(5, Math.max(1, +(z * scale).toFixed(2)))
                  if (next <= 1) setLineupPan({ x: 0, y: 0 })
                  return next
                })
                lineupPinchRef.current.dist = newDist
              } else if (e.touches.length === 1 && lineupDragRef.current && lineupZoom > 1) {
                const dx = e.touches[0].clientX - lineupDragRef.current.startX
                const dy = e.touches[0].clientY - lineupDragRef.current.startY
                setLineupPan({ x: lineupDragRef.current.panX + dx, y: lineupDragRef.current.panY + dy })
              }
            }}
            onTouchEnd={() => { lineupPinchRef.current = null; lineupDragRef.current = null }}
            onMouseDown={e => {
              if (lineupZoom > 1) {
                lineupDragRef.current = { startX: e.clientX, startY: e.clientY, panX: lineupPan.x, panY: lineupPan.y }
              }
            }}
            onMouseMove={e => {
              if (lineupDragRef.current && lineupZoom > 1) {
                setLineupPan({ x: lineupDragRef.current.panX + (e.clientX - lineupDragRef.current.startX), y: lineupDragRef.current.panY + (e.clientY - lineupDragRef.current.startY) })
              }
            }}
            onMouseUp={() => { lineupDragRef.current = null }}
            style={{ cursor: lineupZoom > 1 ? 'grab' : 'zoom-in' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={lineupImgRef}
              src={event.lineupImageUrl}
              alt={`${event.name} lineup poster`}
              style={{
                maxWidth: '92vw',
                maxHeight: '85vh',
                objectFit: 'contain',
                transform: `scale(${lineupZoom}) translate(${lineupPan.x / lineupZoom}px, ${lineupPan.y / lineupZoom}px)`,
                transition: lineupDragRef.current ? 'none' : 'transform 0.15s ease',
                transformOrigin: 'center center',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                borderRadius: lineupZoom > 1 ? '0' : '12px',
              }}
              draggable={false}
              onDoubleClick={() => {
                if (lineupZoom > 1) { setLineupZoom(1); setLineupPan({ x: 0, y: 0 }) }
                else setLineupZoom(2.5)
              }}
            />
          </div>

          {lineupZoom <= 1 && (
            <p className="absolute top-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">Pinch or scroll to zoom · Double-tap to fit</p>
          )}
        </div>
      )}

      {/* ── IMMERSIVE HERO ── */}
      <div
        className={`relative overflow-hidden ${!event.imageUrl ? `bg-gradient-to-br ${event.gradient}` : ''}`}
        style={{ minHeight: '420px' }}
      >
        {/* Background image */}
        {event.imageUrl && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${event.imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }}
          />
        )}

        {/* Layered gradients: dark top for nav, heavy fade at bottom to bleed into content */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.0) 45%, rgba(0,0,0,0.85) 75%, #050505 100%)' }} />

        {/* Subtle film-grain texture overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")', backgroundSize: '128px' }} />

        {/* Back button */}
        <button
          onClick={e => { e.stopPropagation(); router.back() }}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/80 hover:text-white transition-colors"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>

        {/* Source badge */}
        <div className="absolute top-4 right-4 z-10">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${sourceColors[event.source]}`}>
            {event.source}
          </span>
        </div>

        {/* Click to open lightbox */}
        {event.imageUrl && (
          <button className="absolute inset-0 w-full h-full cursor-zoom-in" style={{ zIndex: 1 }} onClick={() => setLightboxOpen(true)} aria-label="View full image" />
        )}

        {/* ── TITLE FLOATS ON HERO ── */}
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-6 z-10">
          {/* Genre pills — tertiary, small, at top of text block */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {event.genre.map(g => {
              const gc = GENRE_COLORS[g] ?? { bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.15)', text: 'rgba(255,255,255,0.5)' }
              return (
                <span key={g} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full" style={{ background: gc.bg, border: `1px solid ${gc.border}`, color: gc.text }}>{g}</span>
              )
            })}
          </div>

          {/* PRIMARY — event name */}
          <h1 className="font-black text-white leading-[1.05] mb-2" style={{ fontSize: 'clamp(1.75rem, 6vw, 2.75rem)', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
            {event.name}
          </h1>

          {/* SECONDARY — venue + city */}
          {event.event_type === 'underground' ? (
            <div className="flex items-center gap-2">
              {(addressRevealed || event.full_address) ? (
                <span className="text-white/75 text-sm font-medium">{event.full_address}</span>
              ) : (
                <span className="text-white/50 text-sm">🔒 {event.neighborhood ? `${event.neighborhood}, ` : ''}{event.city}</span>
              )}
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(200,255,0,0.15)', border: '1px solid rgba(200,255,0,0.3)', color: '#C8FF00' }}>UNDERGROUND</span>
            </div>
          ) : (
            <Link
              href={`/venues/${slugifyVenue(event.venue)}?name=${encodeURIComponent(event.venue)}&city=${encodeURIComponent(event.city)}${event.lat ? `&lat=${event.lat}&lng=${event.lng}` : ''}`}
              className="text-white/60 hover:text-white/90 transition-colors text-sm font-medium"
              onClick={e => e.stopPropagation()}
            >
              {event.venue} &nbsp;·&nbsp; {event.city}
            </Link>
          )}

          {/* Going count */}
          {goingCount !== null && goingCount > 0 && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex -space-x-2">
                {goingAvatars.slice(0, 4).map(a => (
                  a.avatar_url
                    ? <img key={a.id} src={a.avatar_url} alt={a.display_name} className="w-6 h-6 rounded-full border object-cover" style={{ borderColor: '#050505' }} />
                    : <div key={a.id} className="w-6 h-6 rounded-full border flex items-center justify-center text-[10px]" style={{ borderColor: '#050505', background: 'rgba(200,255,0,0.2)' }}>{a.avatar_emoji}</div>
                ))}
              </div>
              <span className="text-white/45 text-xs font-medium">{goingCount.toLocaleString()} going</span>
            </div>
          )}
        </div>

        {/* Organizer: update flyer button */}
        {isOwnEvent && event.id.startsWith('festival-') && (
          <>
            <input
              ref={flyerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFlyerUpdate(f) }}
            />
            <button
              onClick={() => flyerInputRef.current?.click()}
              disabled={flyerUploading}
              className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
              style={{ background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(8px)', border: '1px solid rgba(200,255,0,0.4)', color: '#C8FF00' }}
            >
              {flyerUploading ? (
                <><span className="w-3 h-3 border border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" /> Uploading…</>
              ) : (
                <>{event.imageUrl ? '🖼️ Update Flyer' : '🖼️ Add Flyer'}</>
              )}
            </button>
          </>
        )}

        {/* Flyer error toast */}
        {flyerError && (
          <div className="absolute bottom-4 left-4 right-16 px-3 py-2 rounded-xl text-xs text-red-300 border border-red-500/30" style={{ background: 'rgba(0,0,0,0.85)' }}>
            {flyerError}
          </div>
        )}
      </div>

      {/* Content — bleeds up into hero, no gap */}
      <div className="px-4 max-w-2xl mx-auto relative z-10 pb-8" style={{ marginTop: '-2px' }}>
        {/* Underground address reveal (only shown here if underground + not revealed in hero) */}
        {event.event_type === 'underground' && !addressRevealed && !event.full_address && countdown && (
          <div className="mb-4 px-4 py-3 rounded-2xl flex items-center gap-3" style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)' }}>
            <span className="text-[#C8FF00] text-sm">📍</span>
            <div>
              <p className="text-white/50 text-xs">Address reveals in</p>
              <p className="text-[#C8FF00] text-sm font-black tabular-nums">{countdown}</p>
            </div>
            {event.cover_charge && <p className="text-white/30 text-xs ml-auto">{event.cover_charge}</p>}
          </div>
        )}

        {/* Date/time */}
        <div className="event-card p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
              style={{ background: 'rgba(200,255,0,0.1)' }}>
              📅
            </div>
            <div>
              {festivalDates.length > 1 ? (
                <>
                  <p className="font-semibold text-white text-sm">
                    {formatDateRange(festivalDates[0], festivalDates[festivalDates.length - 1])}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {festivalDates.map(d => (
                      <span key={d} className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/40">
                        {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    ))}
                  </div>
                  <p className="text-white/40 text-xs mt-1.5">Multi-day festival</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-white text-sm">{formatDate(event.date)}</p>
                  {event.time && event.time !== 'TBA' && (
                    <p className="text-white/40 text-xs mt-0.5">{event.time} · Doors open</p>
                  )}
                </>
              )}
              {event.dates_confirmed === false && event.source !== 'Community Submitted' && (
                <p className="text-yellow-400/70 text-xs mt-2 flex items-center gap-1">
                  <span>⚠️</span> Estimated dates — not yet officially confirmed
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Festival Conditions */}
        {weatherDays && weatherDays.length > 0 && (() => {
          const maxHigh = Math.max(...weatherDays.map(d => d.high))
          const minLow = Math.min(...weatherDays.map(d => d.low))
          const maxPrecip = Math.max(...weatherDays.map(d => d.precip))
          const maxWind = Math.max(...weatherDays.map(d => d.wind))
          const maxUV = Math.max(...weatherDays.map(d => d.uv))
          const sunset = weatherDays[0]?.sunset

          // Build a natural-language summary
          const parts: string[] = []
          if (maxHigh >= 95) parts.push(`Expect extreme heat with highs up to ${maxHigh}°F — hydration is essential.`)
          else if (maxHigh >= 85) parts.push(`It\'ll be hot, with highs reaching ${maxHigh}°F.`)
          else if (maxHigh >= 70) parts.push(`Pleasant conditions with highs around ${maxHigh}°F.`)
          else parts.push(`Mild temps expected, topping out around ${maxHigh}°F.`)
          if (minLow <= 50) parts.push(`Nights will get cold (down to ${minLow}°F), so bring layers.`)
          else if (minLow <= 60) parts.push(`Evenings cool off to around ${minLow}°F.`)
          if (maxPrecip >= 60) parts.push(`Rain is likely — pack a poncho.`)
          else if (maxPrecip >= 30) parts.push(`There\'s a chance of rain, so stay aware of the forecast.`)
          if (maxWind >= 25) parts.push(`Strong winds expected (${maxWind} mph).`)
          if (maxUV >= 8) parts.push(`UV is very high — sunscreen is a must.`)
          else if (maxUV >= 6) parts.push(`UV will be high, so don\'t skip the SPF.`)
          if (sunset) parts.push(`Sunset around ${sunset}.`)
          const summary = parts.join(' ')

          return (
            <div className="event-card p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-white/50 text-sm uppercase tracking-wider">⛺ Festival Conditions</h2>
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-4">{summary}</p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {weatherDays.map(day => (
                  <div key={day.date} className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', minWidth: 68 }}>
                    <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">{day.day}</span>
                    <span className="text-2xl my-0.5">{day.emoji}</span>
                    <span className="text-white font-black text-sm">{day.high}°</span>
                    <span className="text-white/30 text-xs">{day.low}°</span>
                    {day.precip > 20 && (
                      <span className="text-blue-400/60 text-[10px] font-bold mt-0.5">{day.precip}%</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Check-in warning */}
        {checkInState === 'too-far' && distanceMsg && (
          <div className="mb-3 px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-300 text-sm text-center">
            {distanceMsg}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2.5 mb-4">
          {/* Check In — full width primary */}
          <button
            onClick={handleCheckIn}
            disabled={isCheckedIn || checkInState === 'locating'}
            className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              isCheckedIn
                ? 'bg-white/10 text-white/40 cursor-default'
                : checkInState === 'locating'
                ? 'bg-white/10 text-white/60 cursor-wait'
                : 'hover:shadow-[0_0_30px_rgba(200,255,0,0.5)] hover:scale-[1.02] active:scale-95'
            }`}
            style={!isCheckedIn && checkInState !== 'locating' ? { background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000000' } : {}}
          >
            {isCheckedIn ? '✓ Checked In' : checkInState === 'locating' ? '📍 Locating…' : '🎫 Check In · +100 XP'}
          </button>

          {/* Going — icon + label */}
          <button
            onClick={async () => {
              const newGoing = !isGoing
              toggleGoing(event)
              if (event.id.startsWith('festival-')) {
                const festivalId = event.id.replace('festival-', '')
                try {
                  await fetch(`/api/festivals/${festivalId}/going`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ going: newGoing, userId: user?.id ?? null }),
                  })
                  setGoingCount(prev => prev !== null ? Math.max(0, prev + (newGoing ? 1 : -1)) : null)
                } catch { /* non-blocking */ }
              }
            }}
            className={`w-12 h-12 rounded-xl text-lg border transition-all flex items-center justify-center ${
              isGoing
                ? 'border-[#C8FF00]/50 text-[#C8FF00] bg-[#C8FF00]/10'
                : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white'
            }`}
            title={isGoing ? 'Going' : "I'm Going"}
          >
            {isGoing ? '✅' : '📆'}
          </button>

          {/* Save */}
          <button
            onClick={() => saveEvent(event)}
            className={`w-12 h-12 rounded-xl text-lg border transition-all flex items-center justify-center ${
              isSaved
                ? 'border-[#C8FF00]/50 text-[#C8FF00] bg-[#C8FF00]/10'
                : 'border-white/20 text-white/50 hover:border-white/40 hover:text-white'
            }`}
          >
            {isSaved ? '♥' : '♡'}
          </button>

          <button
            onClick={async () => {
              const url = window.location.href
              const shareData = {
                title: event.name,
                text: `Check out ${event.name} on Electric State Passport ⚡`,
                url,
              }
              if (navigator.share) {
                try {
                  await navigator.share(shareData)
                } catch { /* dismissed */ }
              } else {
                try {
                  await navigator.clipboard.writeText(url)
                  setShareToast(true)
                  setTimeout(() => setShareToast(false), 2500)
                } catch { /* fallback */ }
              }
            }}
            className="w-12 h-12 rounded-xl text-lg border border-white/20 text-white/50 hover:border-white/40 hover:text-white transition-all flex items-center justify-center"
            title="Share"
          >
            🔗
          </button>
        </div>

        {/* Live Streams */}
        {event.livestreams && event.livestreams.length > 0 && (
          <LiveStreamSection streams={event.livestreams} />
        )}

        {/* Description */}
        <div className="event-card p-5 mb-4">
          <h2 className="font-bold text-white mb-2 text-sm uppercase tracking-wider text-white/50">About</h2>
          <div className="text-white/70 text-sm leading-relaxed space-y-3">
            {formatDescription(event.description).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        {/* Organized By */}
        {(event.organizer || event.organizer_name) && (
          <OrganizerCard organizer={event.organizer} organizerName={event.organizer_name} />
        )}

        {/* Lineup */}
        <div className="event-card p-5 mb-4">
          <h2 className="font-bold text-white mb-3 text-sm uppercase tracking-wider text-white/50">Lineup</h2>

          {/* Official lineup graphic — festivals only */}
          {event.lineupImageUrl && (
            <div className="mb-4">
              <p className="text-white/30 text-[10px] mb-2 uppercase tracking-wider">Official Lineup Poster</p>
              <div
                className="rounded-xl overflow-hidden border border-white/10 cursor-zoom-in relative group"
                onClick={() => setLineupLightboxOpen(true)}
              >
                <img
                  src={event.lineupImageUrl}
                  alt={`${event.name} official lineup`}
                  className="w-full h-auto object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                  style={{ background: 'rgba(0,0,0,0.35)' }}>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                    style={{ background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
                    Tap to zoom
                  </div>
                </div>
              </div>
              <p className="text-white/20 text-[10px] mt-2 text-center">Tap to open fullscreen</p>
            </div>
          )}
          {(() => {
            const allArtists = event.lineup.filter(a => a && a !== 'Lineup TBA')
            const days = event.lineupByDay
            const query = lineupSearch.toLowerCase().trim()

            // Day-by-day mode
            if (days?.length) {
              const activeDay = lineupDay ?? days[0].day
              const activeDayArtists = days.find(d => d.day === activeDay)?.artists ?? []
              const filtered = query
                ? days.flatMap(d => d.artists).filter(a => a.toLowerCase().includes(query))
                : activeDayArtists

              return (
                <div>
                  {/* Day tabs */}
                  {!query && (
                    <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-none">
                      {days.map(d => {
                        const shortDay = d.day.split(',')[0] // "Thursday"
                        const isActive = activeDay === d.day
                        return (
                          <button
                            key={d.day}
                            onClick={() => setLineupDay(d.day)}
                            className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                            style={isActive
                              ? { background: '#C8FF00', color: '#000' }
                              : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.08)' }
                            }>
                            {shortDay}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Search bar */}
                  <div className="relative mb-3">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
                    <input
                      type="text"
                      value={lineupSearch}
                      onChange={e => setLineupSearch(e.target.value)}
                      placeholder={query ? `Searching all ${allArtists.length} artists…` : `Search ${activeDayArtists.length} artists…`}
                      className="w-full pl-8 pr-4 py-2 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    />
                    {lineupSearch && (
                      <button onClick={() => setLineupSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">✕</button>
                    )}
                  </div>

                  {/* Artist pill grid */}
                  <div className="flex flex-wrap gap-1.5">
                    {filtered.map(artist => (
                      <Link key={artist} href={`/artists/${encodeURIComponent(artist)}`}
                        onClick={e => e.stopPropagation()}
                        className="px-3 py-1.5 rounded-full text-xs font-medium text-white/70 transition-all hover:text-white active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {artist}
                      </Link>
                    ))}
                  </div>

                  <p className="text-white/20 text-[10px] text-center mt-3">
                    {query ? `${filtered.length} results across all days` : `${activeDayArtists.length} artists · ${allArtists.length} total`}
                  </p>
                </div>
              )
            }

            // Original flat mode
            const isLarge = allArtists.length > 12
            const filtered = query ? allArtists.filter(a => a.toLowerCase().includes(query)) : allArtists
            const visible = (!lineupExpanded && !query) ? filtered.slice(0, 40) : filtered
            const hiddenCount = filtered.length - visible.length

            if (!isLarge) {
              return (
                <div className="flex flex-col gap-2">
                  {allArtists.map((artist, i) => (
                    <div key={artist} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #C8FF0020, #C8FF0020)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {i + 1}
                      </div>
                      <Link href={`/artists/${encodeURIComponent(artist)}`}
                        className="text-white font-medium text-sm flex-1 hover:text-[#C8FF00] transition-colors"
                        onClick={e => e.stopPropagation()}>
                        {artist}
                      </Link>
                    </div>
                  ))}
                </div>
              )
            }

            return (
              <div>
                <div className="relative mb-3">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
                  <input
                    type="text"
                    value={lineupSearch}
                    onChange={e => { setLineupSearch(e.target.value); setLineupExpanded(true) }}
                    placeholder={`Search ${allArtists.length} artists…`}
                    className="w-full pl-8 pr-4 py-2 rounded-xl text-sm text-white placeholder-white/25 outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                  {lineupSearch && (
                    <button onClick={() => setLineupSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xs">✕</button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {visible.map(artist => (
                    <Link key={artist} href={`/artists/${encodeURIComponent(artist)}`}
                      onClick={e => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-full text-xs font-medium text-white/70 transition-all hover:text-white active:scale-95"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      {artist}
                    </Link>
                  ))}
                </div>
                {hiddenCount > 0 && (
                  <button onClick={() => setLineupExpanded(true)}
                    className="mt-3 w-full py-2.5 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    Show {hiddenCount} more artists ↓
                  </button>
                )}
                {lineupExpanded && !query && (
                  <button onClick={() => setLineupExpanded(false)}
                    className="mt-2 w-full py-2 text-xs font-semibold text-white/30 hover:text-white/50 transition-colors">
                    Show less ↑
                  </button>
                )}
                <p className="text-white/20 text-[10px] text-center mt-3">{allArtists.length} artists total</p>
              </div>
            )
          })()}

        </div>

        {/* YouTube Artist Spotlight — headliner embed, non-festival only */}
        {!event.id.startsWith('festival-') && youtubeHeadlinerVideoId && (
          <div className="event-card p-5 mb-4">
            <h2 className="font-bold text-white mb-3 text-sm uppercase tracking-wider text-white/50 flex items-center gap-2">
              <svg width="14" height="10" viewBox="0 0 24 17" fill="#FF0000"><path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0S4.495 0 2.627.069a3.02 3.02 0 0 0-2.122 2.136C0 4.07 0 8.001 0 8.001s0 3.931.505 5.796a3.02 3.02 0 0 0 2.122 2.136C4.495 16.002 12 16.002 12 16.002s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136C24 11.932 24 8.001 24 8.001s0-3.931-.505-5.796zM9.609 11.001V5.001l6.264 3-6.264 3z"/></svg>
              <span className="text-white/50">Artist Spotlight</span>
            </h2>
            <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeHeadlinerVideoId}?rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Festival YouTube preview */}
        {event.id.startsWith('festival-') && youtubeFestivalVideoId && (
          <div className="event-card p-5 mb-4">
            <h2 className="font-bold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
              <svg width="14" height="10" viewBox="0 0 24 17" fill="#FF0000"><path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0S4.495 0 2.627.069a3.02 3.02 0 0 0-2.122 2.136C0 4.07 0 8.001 0 8.001s0 3.931.505 5.796a3.02 3.02 0 0 0 2.122 2.136C4.495 16.002 12 16.002 12 16.002s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136C24 11.932 24 8.001 24 8.001s0-3.931-.505-5.796zM9.609 11.001V5.001l6.264 3-6.264 3z"/></svg>
              <span className="text-white/50">Official Preview</span>
            </h2>
            <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeFestivalVideoId}?rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Festival community ratings */}
        {event.id.startsWith('festival-') && (
          <FestivalVoting eventId={event.id} user={user} />
        )}

        {/* Community discussion */}
        <CommentsSection
          eventId={event.id}
          currentUserId={user?.id}
        />

        {/* Platform ticket selector (organizer-submitted events with ticketing enabled) */}
        {event.id.startsWith('festival-') && (
          <TicketSection eventId={event.id} />
        )}

        {/* External ticket link (Ticketmaster / Eventbrite / manual link) */}
        {event.ticketLink && event.ticketLink !== '#' && (
          <a
            href={event.ticketLink}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border border-white/20 text-white hover:bg-white/5 transition-all mb-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            Get Tickets
          </a>
        )}
      </div>

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed bottom-40 md:bottom-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm shadow-lg" style={{ background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}>
            <span>🔗</span>
            Link copied!
          </div>
        </div>
      )}

      {/* XP Toast */}
      {showToast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="flex items-center gap-2 px-5 py-3 rounded-full font-bold text-sm shadow-[0_0_30px_rgba(200,255,0,0.5)]"
            style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000000' }}>
            <span>⚡</span>
            +100 XP Earned!
          </div>
        </div>
      )}
    </div>
  )
}
