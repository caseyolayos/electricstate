'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/mockStore'
import { mockEvents, STAMPS } from '@/lib/mockData'
import StampCard from '@/components/StampCard'
import XPBar from '@/components/XPBar'
import PassportHeader from '@/components/PassportHeader'
import Link from 'next/link'
import { Event } from '@/lib/mockData'
import MyTickets from '@/components/MyTickets'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

interface CheckInRecord {
  event_id: string
  event_name: string | null
  venue_name: string | null
  venue_city: string | null
  event_date: string | null
  xp_awarded: number | null
}

const STAMP_COLORS = ['#C8FF00', '#A78BFA', '#F97316', '#22D3EE', '#F472B6']
const STAMP_ROTATIONS = [-2, 1.5, -1, 2, -1.5]

// Custom stamp images — match by event name + optional year (from event_date).
// Add a new entry each year for a new stamp design. Year-specific entries take
// priority over year-agnostic fallbacks, enabling "stamp collector" multi-year sets.
const CUSTOM_STAMPS: { match: string; year?: number; image: string }[] = [
  { match: 'edc las vegas', year: 2026, image: '/edc2026stamp.png' },
  { match: 'lightning in a bottle', year: 2026, image: '/libstampes.png' },
  // Add future years below:
  // { match: 'edc las vegas', year: 2027, image: '/edc2027stamp.png' },
  // { match: 'lightning in a bottle', year: 2027, image: '/lib2027stamp.png' },
]

function getCustomStamp(record: CheckInRecord): string | null {
  const name = (record.event_name ?? '').toLowerCase()
  const year = record.event_date ? new Date(record.event_date + 'T00:00:00').getFullYear() : null
  // Prefer year-specific match first, then fall back to year-agnostic
  const found =
    CUSTOM_STAMPS.find(s => name.includes(s.match) && s.year != null && s.year === year) ??
    CUSTOM_STAMPS.find(s => name.includes(s.match) && s.year == null)
  return found?.image ?? null
}

function CheckInStamp({ record, index }: { record: CheckInRecord; index: number }) {
  const color = STAMP_COLORS[index % STAMP_COLORS.length]
  const rot = STAMP_ROTATIONS[index % STAMP_ROTATIONS.length]
  const dateLabel = record.event_date
    ? new Date(record.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
    : null
  const name = record.event_name ?? 'Event'
  const venue = [record.venue_name, record.venue_city].filter(Boolean).join(' · ')
  const customImage = getCustomStamp(record)

  if (customImage) {
    return (
      <div style={{ transform: `rotate(${rot}deg)` }} className="transition-transform hover:rotate-0 hover:scale-105 duration-200">
        <div className="rounded-2xl overflow-hidden relative" style={{ border: '1.5px solid rgba(255,220,0,0.3)', background: '#000' }}>
          <img src={customImage} alt={name} className="w-full h-auto block" loading="lazy" />
        </div>
      </div>
    )
  }

  // Shorten long names so they fit the stamp
  const shortName = name.length > 28 ? name.slice(0, 26) + '…' : name
  const shortVenue = venue.length > 24 ? venue.slice(0, 22) + '…' : venue
  const yearStr = record.event_date ? new Date(record.event_date + 'T00:00:00').getFullYear().toString() : ''
  const monthStr = record.event_date
    ? new Date(record.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    : ''

  // Serrated edge via repeating conic-gradient mask
  const teethCount = 36
  const toothDeg = 360 / teethCount
  const teeth = Array.from({ length: teethCount }, (_, i) => {
    const start = i * toothDeg
    return `${color} ${start}deg ${start + toothDeg * 0.55}deg, transparent ${start + toothDeg * 0.55}deg ${start + toothDeg}deg`
  }).join(', ')

  return (
    <div style={{ transform: `rotate(${rot}deg)` }} className="transition-transform hover:rotate-0 hover:scale-105 duration-200">
      {/* Outer serrated ring */}
      <div style={{
        width: '140px', height: '140px', borderRadius: '50%',
        background: `conic-gradient(${teeth})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0.85,
      }}>
        {/* Inner circle */}
        <div style={{
          width: '116px', height: '116px', borderRadius: '50%',
          background: '#050505',
          border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: `inset 0 0 20px ${color}18, 0 0 12px ${color}30`,
        }}>
          {/* Inner ring */}
          <div style={{
            position: 'absolute', inset: '6px', borderRadius: '50%',
            border: `1px solid ${color}40`,
            pointerEvents: 'none',
          }} />

          {/* SVG arced top text */}
          <svg viewBox="0 0 110 110" width="110" height="110" style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <path id={`arc-top-${index}`} d="M 12,55 A 43,43 0 0,1 98,55" />
              <path id={`arc-bot-${index}`} d="M 15,62 A 40,40 0 0,0 95,62" />
            </defs>
            <text fontSize="8.5" fontWeight="800" fill={color} letterSpacing="1.5" textAnchor="middle" fontFamily="system-ui, sans-serif" style={{ textTransform: 'uppercase' }}>
              <textPath href={`#arc-top-${index}`} startOffset="50%">{shortName}</textPath>
            </text>
            {shortVenue && (
              <text fontSize="7" fontWeight="700" fill={`${color}99`} letterSpacing="1" textAnchor="middle" fontFamily="system-ui, sans-serif" style={{ textTransform: 'uppercase' }}>
                <textPath href={`#arc-bot-${index}`} startOffset="50%">{shortVenue}</textPath>
              </text>
            )}
          </svg>

          {/* Center content */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', zIndex: 1, marginTop: '-6px' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color, lineHeight: 1, letterSpacing: '-1px', fontFamily: 'system-ui, sans-serif' }}>{yearStr}</span>
            <span style={{ fontSize: '9px', fontWeight: 800, color: `${color}99`, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>{monthStr}</span>
            <div style={{ width: '24px', height: '1px', background: `${color}50`, margin: '2px 0' }} />
            <span style={{ fontSize: '8px', fontWeight: 700, color: `${color}60`, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif' }}>✓ attended</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PassportPage() {
  const { state } = useUser()
  const { profile, user } = useAuth()
  const [spotifyUrl, setSpotifyUrl] = useState<string>(profile?.spotify_url ?? '')
  const [spotifyEditing, setSpotifyEditing] = useState(false)
  const [spotifyInput, setSpotifyInput] = useState('')
  const [spotifySaving, setSpotifySaving] = useState(false)

  // Sync spotifyUrl when profile loads
  useEffect(() => {
    if (profile?.spotify_url !== undefined) setSpotifyUrl(profile.spotify_url ?? '')
  }, [profile?.spotify_url])

  function parseSpotifyEmbed(url: string): string | null {
    try {
      const u = new URL(url)
      if (!u.hostname.includes('spotify.com')) return null
      // Convert open.spotify.com/track/ID → embed URL
      const path = u.pathname.replace(/^\/intl-[a-z]+/, '') // strip locale prefix
      return `https://open.spotify.com/embed${path}?utm_source=generator&theme=0`
    } catch { return null }
  }

  async function saveSpotify() {
    if (!user) return
    setSpotifySaving(true)
    const val = spotifyInput.trim() || null
    const sb = createClient()
    if (sb) await sb.from('profiles').update({ spotify_url: val }).eq('id', user.id)
    setSpotifyUrl(val ?? '')
    setSpotifyEditing(false)
    setSpotifySaving(false)
  }
  const [checkIns, setCheckIns] = useState<CheckInRecord[]>([])

  useEffect(() => {
    if (!user) return
    const sb = createClient()
    if (!sb) return
    sb.from('check_ins')
      .select('event_id, event_name, venue_name, venue_city, event_date, xp_awarded')
      .eq('user_id', user.id)
      .order('event_date', { ascending: false })
      .limit(24)
      .then(({ data }) => { if (data) setCheckIns(data) })
  }, [user])

  const followedArtists = profile?.followed_artists ?? []
  // Counts are pre-loaded alongside the profile in auth context — no extra fetch needed
  const followingCount = profile?._followingCount ?? 0
  const followerCount = profile?._followerCount ?? 0

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const isUpcoming = (ev: Event) => {
    const end = ev.date_end ? new Date(ev.date_end + 'T23:59:59') : new Date((ev.date ?? '2000-01-01') + 'T23:59:59')
    return end >= today
  }
  const isPast = (ev: Event) => !isUpcoming(ev)

  const allSaved = state.savedEventObjects ?? []
  const allGoing = state.goingEventObjects ?? []
  const savedEventObjects = allSaved.filter(isUpcoming)
  const goingEventObjects = allGoing.filter(isUpcoming)
  const pastEventObjects = [
    ...allGoing.filter(isPast),
    ...allSaved.filter(isPast).filter(e => !allGoing.some(g => g.id === e.id)),
  ].sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
  const earnedStampCount = STAMPS.filter(s => state.badges.includes(s.id)).length

  // Compute Scene DNA from saved + going events
  const allEventObjects: Event[] = [...savedEventObjects, ...goingEventObjects]
  const genreCounts: Record<string, number> = {}
  allEventObjects.forEach(ev => {
    (ev.genre ?? []).forEach(g => {
      genreCounts[g] = (genreCounts[g] ?? 0) + 1
    })
  })
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const maxCount = topGenres[0]?.[1] ?? 1

  return (
    <>
    <div className="px-4 py-6 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Your Passport</h1>
        <p className="text-white/40 mt-1 text-sm">Your journey through the Electric State</p>
      </div>

      {/* Passport Header */}
      <div className="mb-4">
        <PassportHeader
          xp={state.xp}
          attendedCount={state.attendedEvents.length}
          savedCount={state.savedEvents.length}
          stampCount={earnedStampCount}
          followingCount={followingCount}
          followerCount={followerCount}
        />
      </div>

      {/* XP Bar */}
      <div className="mb-6">
        <XPBar xp={state.xp} />
      </div>

      {/* Spotify Soundtrack */}
      <section className="mb-6">
        {(() => {
          const embedUrl = spotifyUrl ? parseSpotifyEmbed(spotifyUrl) : null
          return (
            <div className="glass p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  <span className="text-white/50 text-xs font-bold uppercase tracking-wider">Soundtrack</span>
                </div>
                <button
                  onClick={() => { setSpotifyInput(spotifyUrl); setSpotifyEditing(e => !e) }}
                  className="text-white/30 hover:text-white/70 transition-colors"
                >
                  {spotifyEditing ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  )}
                </button>
              </div>

              {spotifyEditing ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={spotifyInput}
                    onChange={e => setSpotifyInput(e.target.value)}
                    placeholder="Paste a Spotify track, album, or playlist URL…"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-[#1DB954]/50"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveSpotify}
                      disabled={spotifySaving}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                      style={{ background: '#1DB954', color: '#000' }}
                    >
                      {spotifySaving ? 'Saving…' : 'Save'}
                    </button>
                    {spotifyUrl && (
                      <button
                        onClick={() => { setSpotifyInput(''); saveSpotify() }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white/40 border border-white/10 hover:border-white/20 transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ) : embedUrl ? (
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  style={{ borderRadius: 12 }}
                />
              ) : (
                <button
                  onClick={() => { setSpotifyInput(''); setSpotifyEditing(true) }}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-white/10 text-white/25 hover:text-white/50 hover:border-white/20 transition-all text-sm"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  Add your festival soundtrack
                </button>
              )}
            </div>
          )
        })()}
      </section>

      {/* Scene DNA Card */}
      {allEventObjects.length > 0 && topGenres.length > 0 && (
        <section className="mb-6">
          <div className="glass p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-white text-lg">Your Scene DNA 🧬</h2>
              <button
                onClick={async () => {
                  const url = typeof window !== 'undefined' ? window.location.origin + '/passport' : ''
                  const text = `My top genres on Electric State Passport: ${topGenres.map(([g]) => g).join(', ')} ⚡`
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'My Scene DNA', text, url })
                    } catch { /* dismissed */ }
                  } else {
                    try {
                      await navigator.clipboard.writeText(url)
                      alert('Link copied!')
                    } catch { /* fallback */ }
                  }
                }}
                className="text-xs px-3 py-1.5 rounded-lg border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-all flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {topGenres.map(([genre, count], idx) => (
                <div key={genre}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">{genre}</span>
                    <span className="text-xs text-white/40">{count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxCount) * 100}%`,
                        background: idx === 0 ? '#C8FF00' : `rgba(200,255,0,${0.6 - idx * 0.08})`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How XP Works */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-white text-lg">How XP Works</h2>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: 'rgba(200,255,0,0.1)', color: '#C8FF00' }}>Rewards soon ⚡</span>
        </div>
        <div className="glass p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { emoji: '📍', label: 'Check In',         xp: '+100 XP' },
              { emoji: '🎪', label: 'Festival Review',   xp: '+10 XP/cat' },
              { emoji: '🎟️', label: 'Submit Event',      xp: '+50 XP' },
              { emoji: '🎤', label: 'Artist Review',     xp: '+5 XP/cat' },
              { emoji: '🔖', label: 'Save Event',        xp: '+10 XP' },
              { emoji: '🏟️', label: 'Venue Review',      xp: '+5 XP/cat' },
            ].map(({ emoji, label, xp }) => (
              <div key={label} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base leading-none flex-shrink-0">{emoji}</span>
                  <span className="text-white/60 text-[11px] truncate">{label}</span>
                </div>
                <span className="text-[#C8FF00] text-[10px] font-black flex-shrink-0">{xp}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Badges */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black text-white text-lg">Stamps</h2>
          <span className="text-white/40 text-sm">{earnedStampCount}/{STAMPS.length}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
          {STAMPS.map(stamp => (
            <StampCard
              key={stamp.id}
              stamp={stamp}
              earned={state.badges.includes(stamp.id)}
            />
          ))}
        </div>
      </section>

      {/* Going */}
      {goingEventObjects.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-white text-lg">I&apos;m Going</h2>
            <span className="text-white/40 text-sm">{goingEventObjects.length} event{goingEventObjects.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-col gap-2">
            {goingEventObjects.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="glass p-4 flex items-center gap-3 hover:border-white/20 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  {event.imageUrl
                    ? <img loading="lazy" decoding="async" src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                    : <div className={`w-full h-full bg-gradient-to-br ${event.gradient}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm group-hover:text-[#C8FF00] transition-colors truncate">{event.name}</p>
                  <p className="text-white/40 text-xs">{event.venue} · {formatDate(event.date)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,255,0,0.15)', color: '#C8FF00' }}>GOING</span>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Saved Events */}
      <section className="mb-6">
        <h2 className="font-black text-white text-lg mb-3">Saved Events</h2>
        {savedEventObjects.length > 0 ? (
          <div className="flex flex-col gap-2">
            {savedEventObjects.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="glass p-4 flex items-center gap-3 hover:border-white/20 transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${event.gradient} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm group-hover:text-[#C8FF00] transition-colors truncate">{event.name}</p>
                  <p className="text-white/40 text-xs">{event.venue} · {formatDate(event.date)}</p>
                </div>
                <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        ) : (
          <div className="glass p-8 text-center">
            <p className="text-2xl mb-2">♡</p>
            <p className="text-white/60 font-bold">No saved events</p>
            <p className="text-white/30 text-sm mt-1">Save events to see them here</p>
            <Link href="/events" className="inline-block mt-4 text-[#C8FF00] text-sm hover:underline">
              Browse Events →
            </Link>
          </div>
        )}
      </section>

      {/* Past Events */}
      {pastEventObjects.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-white text-lg">Past Events</h2>
            <span className="text-white/40 text-sm">{pastEventObjects.length} event{pastEventObjects.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex flex-col gap-2">
            {pastEventObjects.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="glass p-4 flex items-center gap-3 hover:border-white/20 transition-all group opacity-60 hover:opacity-80"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                  {event.imageUrl
                    ? <img loading="lazy" decoding="async" src={event.imageUrl} alt={event.name} className="w-full h-full object-cover grayscale" />
                    : <div className={`w-full h-full bg-gradient-to-br ${event.gradient} opacity-50`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white/70 text-sm group-hover:text-white transition-colors truncate">{event.name}</p>
                  <p className="text-white/30 text-xs">{event.venue} · {formatDate(event.date)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>PAST</span>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Check-In Stamps */}
      {checkIns.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-white text-lg">Check-Ins</h2>
            <span className="text-white/40 text-sm">{checkIns.length} event{checkIns.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {checkIns.map((ci, i) => (
              <CheckInStamp key={`${ci.event_id}-${ci.event_date}`} record={ci} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* My Artists */}
      {followedArtists.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-white text-lg">My Artists</h2>
            <span className="text-white/40 text-sm">{followedArtists.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {followedArtists.map(name => (
              <Link
                key={name}
                href={`/artists/${encodeURIComponent(name)}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:border-[#C8FF00]/40"
                style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)', color: '#C8FF00' }}
              >
                <span className="text-base leading-none">🎧</span>
                <span className="text-white/90 font-semibold text-xs">{name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My Tickets */}
      <MyTickets />

      {/* Empty state CTA */}
      {state.attendedEvents.length === 0 && state.savedEvents.length === 0 && (
        <div className="glass p-8 text-center mt-4"
          style={{ background: 'linear-gradient(135deg, rgba(200,255,0,0.03), rgba(200,255,0,0.03))' }}>
          <p className="text-3xl mb-3">🎵</p>
          <h3 className="font-bold text-white mb-1">Start Your Journey</h3>
          <p className="text-white/40 text-sm mb-4">Check in to events and collect stamps to fill your passport.</p>
          <Link
            href="/events"
            className="inline-block px-6 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000000' }}
          >
            Find Events
          </Link>
        </div>
      )}
    </div>

    </>
  )
}
