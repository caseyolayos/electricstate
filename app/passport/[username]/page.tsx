'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { STAMPS } from '@/lib/mockData'
import StampCard from '@/components/StampCard'
import { useAuth } from '@/lib/auth'
import { getLevel } from '@/lib/mockStore'

interface OrganizerEvent {
  id: string
  name: string
  date_start: string | null
  city: string | null
  image_url: string | null
  venue: string | null
  slug: string | null
}

interface CheckInRecord {
  event_id: string
  event_name: string | null
  venue_name: string | null
  venue_city: string | null
  event_date: string | null
  xp_awarded: number | null
}

interface PublicProfile {
  id: string
  username: string
  display_name: string | null
  avatar_emoji: string
  avatar_url: string | null
  xp: number
  badges: string[]
  attended_events: string[]
  followed_artists: string[]
  followers: number
  following: number
  is_organizer?: boolean
  organizer_events?: OrganizerEvent[]
  check_ins?: CheckInRecord[]
  spotify_url?: string | null
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

  const teethCount = 36
  const toothDeg = 360 / teethCount
  const teeth = Array.from({ length: teethCount }, (_, i) => {
    const start = i * toothDeg
    return `${color} ${start}deg ${start + toothDeg * 0.55}deg, transparent ${start + toothDeg * 0.55}deg ${start + toothDeg}deg`
  }).join(', ')

  return (
    <div style={{ transform: `rotate(${rot}deg)` }} className="transition-transform hover:rotate-0 hover:scale-105 duration-200">
      <div style={{
        width: '140px', height: '140px', borderRadius: '50%',
        background: `conic-gradient(${teeth})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: 0.85,
      }}>
        <div style={{
          width: '116px', height: '116px', borderRadius: '50%',
          background: '#050505',
          border: `2px solid ${color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          boxShadow: `inset 0 0 20px ${color}18, 0 0 12px ${color}30`,
        }}>
          <div style={{
            position: 'absolute', inset: '6px', borderRadius: '50%',
            border: `1px solid ${color}40`,
            pointerEvents: 'none',
          }} />
          <svg viewBox="0 0 110 110" width="110" height="110" style={{ position: 'absolute', top: 0, left: 0 }}>
            <defs>
              <path id={`arc-top-pub-${index}`} d="M 12,55 A 43,43 0 0,1 98,55" />
              <path id={`arc-bot-pub-${index}`} d="M 15,62 A 40,40 0 0,0 95,62" />
            </defs>
            <text fontSize="8.5" fontWeight="800" fill={color} letterSpacing="1.5" textAnchor="middle" fontFamily="system-ui, sans-serif" style={{ textTransform: 'uppercase' }}>
              <textPath href={`#arc-top-pub-${index}`} startOffset="50%">{shortName}</textPath>
            </text>
            {shortVenue && (
              <text fontSize="7" fontWeight="700" fill={`${color}99`} letterSpacing="1" textAnchor="middle" fontFamily="system-ui, sans-serif" style={{ textTransform: 'uppercase' }}>
                <textPath href={`#arc-bot-pub-${index}`} startOffset="50%">{shortVenue}</textPath>
              </text>
            )}
          </svg>
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

const GENRE_COLORS: Record<string, string> = {
  House: '#C8FF00', Techno: '#A78BFA', Bass: '#F97316',
  Trance: '#22D3EE', DNB: '#F472B6', Electronic: '#60A5FA',
}

export default function PublicPassportPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile: myProfile, adjustFollowingCount } = useAuth()

  const username = decodeURIComponent(
    Array.isArray(params.username) ? params.username[0] : params.username
  )

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [joinBannerVisible, setJoinBannerVisible] = useState(false)
  const joinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isOwnProfile = myProfile?.username === username

  // Get auth token
  useEffect(() => {
    import('@/lib/supabase').then(({ createClient }) => {
      const sb = createClient()
      if (!sb) return
      sb.auth.getSession().then(({ data }) => {
        setAuthToken(data.session?.access_token ?? null)
      })
    })
  }, [user])

  // Show join banner after 2s for non-logged-in visitors
  useEffect(() => {
    if (user) return
    joinTimerRef.current = setTimeout(() => setJoinBannerVisible(true), 2000)
    return () => { if (joinTimerRef.current) clearTimeout(joinTimerRef.current) }
  }, [user])

  useEffect(() => {
    if (isOwnProfile) { router.replace('/passport'); return }

    // Load profile data
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(async profileData => {
        if (profileData.error) { setNotFound(true); setLoading(false); return }
        setProfile(profileData.profile)
        setFollowerCount(profileData.profile.followers)

        // Check follow status directly via Supabase client (bypasses HTTP cookie issues in WKWebView)
        if (user) {
          const { createClient: mkClient } = await import('@/lib/supabase')
          const sb = mkClient()
          if (sb) {
            const { data } = await sb
              .from('user_follows')
              .select('follower_id')
              .eq('follower_id', user.id)
              .eq('following_id', profileData.profile.id)
              .maybeSingle()
            setIsFollowing(!!data)
          }
        }
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [username, user, isOwnProfile, router])
  // Note: removed authToken from deps — follow check now uses Supabase client directly

  const handleFollow = async () => {
    if (!user || !profile) { router.push('/login'); return }
    setFollowLoading(true)
    try {
      // Use Supabase client directly — bypasses HTTP cookie issues in WKWebView
      const { createClient: mkClient } = await import('@/lib/supabase')
      const sb = mkClient()
      if (!sb) return

      if (isFollowing) {
        // Unfollow
        await sb.from('user_follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id)
        setIsFollowing(false)
        setFollowerCount(c => Math.max(0, c - 1))
        adjustFollowingCount(-1)
      } else {
        // Follow
        await sb.from('user_follows')
          .upsert({ follower_id: user.id, following_id: profile.id },
                  { onConflict: 'follower_id,following_id' })
        setIsFollowing(true)
        setFollowerCount(c => c + 1)
        adjustFollowingCount(1)

        // Fire notification + push via lightweight endpoint (no auth needed)
        fetch(`/api/profile/${encodeURIComponent(username)}/follow/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ follower_id: user.id }),
        }).catch(() => {})
      }
    } catch {}
    setFollowLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
    </div>
  )

  if (notFound || !profile) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
      <p className="text-4xl">🎫</p>
      <h2 className="text-xl font-black text-white">Passport not found</h2>
      <p className="text-white/40 text-sm text-center">@{username} hasn&apos;t joined Electric State yet</p>
      <Link href="/events" className="text-[#C8FF00] text-sm hover:underline">← Back to events</Link>
    </div>
  )

  const { level, title } = getLevel(profile.xp)
  const earnedStamps = STAMPS.filter(s => profile.badges.includes(s.id))
  const lockedStamps = STAMPS.filter(s => !profile.badges.includes(s.id))
  const displayName = profile.display_name || profile.username

  const levelColors = ['', 'from-[#C8FF00]/60 to-[#C8FF00]/20', 'from-blue-500 to-cyan-400', 'from-purple-500 to-blue-400', 'from-yellow-400 to-orange-400']

  const shareUrl = `https://www.electricstate.app/passport/${encodeURIComponent(username)}`

  return (
    <>
    <div className="px-4 py-6 max-w-2xl mx-auto w-full pb-24">
      <button onClick={() => router.back()} className="text-white/40 text-sm mb-5 flex items-center gap-1 hover:text-white/70 transition-colors">
        ← Back
      </button>

      {/* Profile card */}
      <div className="glass overflow-hidden mb-4">
        <div className={`h-1.5 bg-gradient-to-r ${levelColors[level] || levelColors[1]}`} />
        <div className="p-5">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName ?? ''} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-white/10" loading="lazy" />
            ) : (
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border border-white/10"
                style={{ background: 'rgba(200,255,0,0.1)' }}>
                {profile.avatar_emoji}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-white text-lg leading-tight truncate">{displayName}</h1>
              {profile.username && <p className="text-white/40 text-xs">@{profile.username}</p>}
              <p className="gradient-text font-semibold text-sm mt-0.5">{title}</p>
              <p className="text-white/30 text-xs">Level {level} · {profile.xp.toLocaleString()} XP</p>
            </div>
            {user && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                style={isFollowing
                  ? { background: 'rgba(200,255,0,0.15)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.4)' }
                  : { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                }
              >
                {followLoading ? '…' : isFollowing ? '✓ Following' : '+ Follow'}
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Events', value: profile.attended_events.length },
              { label: 'Stamps', value: earnedStamps.length },
              { label: 'Followers', value: followerCount },
              { label: 'Following', value: profile.following },
            ].map(stat => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/10">
                <p className="text-lg font-bold text-white leading-tight">{stat.value}</p>
                <p className="text-white/40 text-[10px]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Spotify Soundtrack */}
      {profile.spotify_url && (() => {
        try {
          const u = new URL(profile.spotify_url)
          if (!u.hostname.includes('spotify.com')) return null
          const path = u.pathname.replace(/^\/intl-[a-z]+/, '')
          const embedUrl = `https://open.spotify.com/embed${path}?utm_source=generator&theme=0`
          return (
            <section className="mb-6">
              <div className="glass p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                  <span className="text-white/50 text-xs font-bold uppercase tracking-wider">{displayName}&apos;s Soundtrack</span>
                </div>
                <iframe
                  src={embedUrl}
                  width="100%"
                  height="80"
                  frameBorder="0"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  style={{ borderRadius: 12 }}
                />
              </div>
            </section>
          )
        } catch { return null }
      })()}

      {/* Organizer Events */}
      {profile.is_organizer && profile.organizer_events && profile.organizer_events.length > 0 && (
        <section className="mb-6">
          <h2 className="font-black text-white text-lg mb-3 flex items-center gap-2">
            🎟️ Events by {displayName}
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}>
              Organizer
            </span>
          </h2>
          <div className="flex flex-col gap-3">
            {profile.organizer_events
              .sort((a, b) => {
                // upcoming first, then most recent past
                const today = new Date().toISOString().split('T')[0]
                const aUp = (a.date_start ?? '') >= today
                const bUp = (b.date_start ?? '') >= today
                if (aUp && !bUp) return -1
                if (!aUp && bUp) return 1
                return (a.date_start ?? '') > (b.date_start ?? '') ? (aUp ? 1 : -1) : (aUp ? -1 : 1)
              })
              .map(event => {
                const isUpcoming = (event.date_start ?? '') >= new Date().toISOString().split('T')[0]
                const dateLabel = event.date_start
                  ? new Date(event.date_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'TBA'
                return (
                  <Link
                    key={event.id}
                    href={`/events/festival-${event.id}`}
                    className="glass flex items-center gap-3 p-3 hover:border-white/20 transition-all group"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                      {event.image_url
                        ? <img src={event.image_url} alt={event.name} className="w-full h-full object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-xl"
                            style={{ background: 'rgba(200,255,0,0.08)' }}>🎪</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm group-hover:text-[#C8FF00] transition-colors truncate">
                        {event.name}
                      </p>
                      <p className="text-white/40 text-xs mt-0.5">
                        {dateLabel}{event.city ? ` · ${event.city}` : ''}
                      </p>
                    </div>
                    {isUpcoming && (
                      <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}>
                        Upcoming
                      </span>
                    )}
                    <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })}
          </div>
        </section>
      )}

      {/* Stamps */}
      {earnedStamps.length > 0 && (
        <section className="mb-6">
          <h2 className="font-black text-white text-lg mb-3">
            Stamps <span className="text-white/30 font-normal text-sm">{earnedStamps.length}/{STAMPS.length}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
            {earnedStamps.map(stamp => (
              <StampCard key={stamp.id} stamp={stamp} earned={true} />
            ))}
            {lockedStamps.map(stamp => (
              <StampCard key={stamp.id} stamp={stamp} earned={false} />
            ))}
          </div>
        </section>
      )}

      {/* Check-In Stamps */}
      {profile.check_ins && profile.check_ins.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-white text-lg">Check-Ins</h2>
            <span className="text-white/40 text-sm">{profile.check_ins.length} event{profile.check_ins.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {profile.check_ins.map((ci, i) => (
              <CheckInStamp key={`${ci.event_id}-${ci.event_date}`} record={ci} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Artists they follow */}
      {profile.followed_artists.length > 0 && (
        <section className="mb-6">
          <h2 className="font-black text-white text-lg mb-3">Artists</h2>
          <div className="flex flex-wrap gap-2">
            {profile.followed_artists.map(name => (
              <Link
                key={name}
                href={`/artists/${encodeURIComponent(name)}`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all hover:border-[#C8FF00]/40"
                style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.15)' }}
              >
                <span className="text-base leading-none">🎧</span>
                <span className="text-white/90 font-semibold text-xs">{name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Share row — visible to logged-in users on others' passports */}
      {user && !isOwnProfile && (
        <div className="mt-2 mb-6 flex items-center justify-between px-1">
          <p className="text-white/30 text-xs">Share {displayName}&apos;s passport</p>
          <button
            onClick={async () => {
              if (navigator.share) {
                try { await navigator.share({ title: `${displayName}'s Passport`, url: shareUrl }); return } catch {}
              }
              await navigator.clipboard.writeText(shareUrl).catch(() => {})
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>
      )}

      {/* Empty state */}
      {earnedStamps.length === 0 && profile.followed_artists.length === 0 && (
        <div className="glass p-8 text-center">
          <p className="text-3xl mb-2">🎫</p>
          <p className="text-white/60 font-bold text-sm">{displayName}&apos;s passport is just getting started</p>
          <p className="text-white/30 text-xs mt-1">Check back after they hit some shows</p>
        </div>
      )}

      {/* Spacer so banner doesn't cover content */}
      {!user && <div className="h-32" />}
    </div>

    {/* Sticky join banner for non-logged-in visitors */}

    {!user && (
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ease-out ${
          joinBannerVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="mx-3 mb-3 rounded-2xl overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.97)', border: '1px solid rgba(200,255,0,0.25)', backdropFilter: 'blur(20px)' }}>
          {/* Accent top bar */}
          <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #C8FF00, rgba(200,255,0,0.3))' }} />

          <div className="p-4 flex items-center gap-4">
            {/* Mini passport preview */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.2)' }}>
              🎫
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight">
                Build your own passport
              </p>
              <p className="text-white/40 text-xs mt-0.5 truncate">
                Track events, earn XP, follow artists
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={`/login?ref=passport&from=${encodeURIComponent(username)}`}
                className="px-4 py-2 rounded-xl text-sm font-black transition-all active:scale-95 whitespace-nowrap"
                style={{ background: '#C8FF00', color: '#000' }}
              >
                Join free →
              </Link>
              <button
                onClick={() => setJoinBannerVisible(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
