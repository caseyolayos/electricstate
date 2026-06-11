'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Event } from '@/lib/mockData'
import { useAuth } from '@/lib/auth'
import ArtistRating from '@/components/ArtistRating'

interface YouTubeResult {
  videoId: string | null
  title?: string
}

interface SpotifyArtist {
  id: string
  name: string
  followers?: number
  genres?: string[]
  imageUrl?: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatFollowers(n?: number): string {
  if (!n) return ''
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M followers`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K followers`
  return `${n} followers`
}

export default function ArtistPage() {
  const params = useParams()
  const router = useRouter()

  const encodedName = Array.isArray(params.name) ? params.name[0] : params.name
  const artistName = decodeURIComponent(encodedName)
  const { user, profile, followArtist, unfollowArtist } = useAuth()
  const isFollowing = profile?.followed_artists?.includes(artistName) ?? false
  const [followLoading, setFollowLoading] = useState(false)

  const handleFollow = async () => {
    if (!user) return
    setFollowLoading(true)
    if (isFollowing) {
      await unfollowArtist(artistName)
      setFanCount(c => c !== null ? Math.max(0, c - 1) : null)
    } else {
      await followArtist(artistName)
      setFanCount(c => c !== null ? c + 1 : 1)
    }
    setFollowLoading(false)
  }

  const [youtube, setYoutube] = useState<YouTubeResult | null>(null)
  const [spotify, setSpotify] = useState<SpotifyArtist | null>(null)
  const [mediaLoading, setMediaLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [fanCount, setFanCount] = useState<number | null>(null)

  useEffect(() => {
    const genres = ['Electronic', 'House', 'Techno']
    const genreParam = encodeURIComponent(genres.join(','))

    // Fetch YouTube + Spotify + events all in parallel
    Promise.all([
      fetch(`/api/youtube/artist?artist=${encodeURIComponent(artistName)}&genres=${genreParam}`)
        .then(r => r.json()).catch(() => null),
      fetch(`/api/spotify/artist?name=${encodeURIComponent(artistName)}`)
        .then(r => r.json()).catch(() => null),
      fetch(`/api/artists/${encodeURIComponent(encodedName)}/events`)
        .then(r => r.json()).catch(() => null),
      fetch(`/api/artists/${encodeURIComponent(encodedName)}/followers`)
        .then(r => r.json()).catch(() => null),
    ]).then(([ytData, spData, evData, fanData]) => {
      if (ytData?.videoId) setYoutube(ytData)
      if (spData?.artist?.id) setSpotify(spData.artist)
      if (evData?.events) { setEvents(evData.events); setEventsLoading(false) }
      if (typeof fanData?.count === 'number') setFanCount(fanData.count)
      setMediaLoading(false)
    }).catch(() => {
      setMediaLoading(false)
      setEventsLoading(false)
    })
  }, [artistName, encodedName])

  const heroImage = spotify?.imageUrl

  return (
    <div className="min-h-screen pb-24">
      {/* Hero header */}
      <div className="relative h-52 flex items-end overflow-hidden"
        style={{ background: heroImage ? undefined : 'linear-gradient(135deg, #0A0A0A, #1a0a2e)' }}>
        {heroImage && (
          <>
            <img loading="lazy" decoding="async" src={heroImage} alt={artistName} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.1) 100%)' }} />
          </>
        )}
        {!heroImage && (
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 70% 40%, rgba(200,255,0,0.4) 0%, transparent 60%)' }} />
        )}
        <div className="relative z-10 px-4 pb-5 w-full">
          <button onClick={() => router.back()} className="text-white/50 text-sm mb-3 flex items-center gap-1 hover:text-white/80 transition-colors">
            ← Back
          </button>
          <div className="flex items-end gap-3">
            {!heroImage && (
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, rgba(200,255,0,0.2), rgba(200,255,0,0.05))', border: '1px solid rgba(200,255,0,0.2)' }}>
                {artistName[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-white leading-tight drop-shadow-lg">{artistName}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {spotify?.followers && (
                  <span className="text-white/50 text-xs">{formatFollowers(spotify.followers)}</span>
                )}
                {fanCount !== null && fanCount > 0 && (
                  <span className="text-white/50 text-xs">
                    {fanCount.toLocaleString()} Passport Holder{fanCount !== 1 ? 's' : ''} {fanCount === 1 ? 'is a Fan' : 'are Fans'}
                  </span>
                )}
                {spotify?.genres?.map(g => (
                  <span key={g} className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.2)' }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
            {user && (
              <button
                onClick={handleFollow}
                disabled={followLoading}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black transition-all disabled:opacity-50"
                style={isFollowing
                  ? { background: 'rgba(200,255,0,0.15)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.4)' }
                  : { background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }
                }
              >
                {followLoading ? '…' : isFollowing ? '✓ Following' : '+ Follow'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-6">

        {/* Media loading skeleton */}
        {mediaLoading && (
          <div className="w-full rounded-2xl bg-white/5 animate-pulse" style={{ height: 200 }} />
        )}

        {/* Spotify embed */}
        {!mediaLoading && spotify?.id && (
          <section>
            <h2 className="font-black text-white text-base mb-3 flex items-center gap-2">
              {/* Spotify logo */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Spotify
            </h2>
            <div className="rounded-2xl overflow-hidden">
              <iframe
                src={`https://open.spotify.com/embed/artist/${spotify.id}?utm_source=generator&theme=0`}
                width="100%"
                height="352"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                style={{ borderRadius: 16 }}
              />
            </div>
          </section>
        )}

        {/* YouTube spotlight */}
        {!mediaLoading && youtube?.videoId && (
          <section>
            <h2 className="font-black text-white text-base mb-3 flex items-center gap-2">
              <svg width="16" height="11" viewBox="0 0 24 17" fill="#FF0000">
                <path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0S4.495 0 2.627.069a3.02 3.02 0 0 0-2.122 2.136C0 4.07 0 8.001 0 8.001s0 3.931.505 5.796a3.02 3.02 0 0 0 2.122 2.136C4.495 16.002 12 16.002 12 16.002s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136C24 11.932 24 8.001 24 8.001s0-3.931-.505-5.796zM9.609 11.001V5.001l6.264 3-6.264 3z"/>
              </svg>
              DJ Set / Live
            </h2>
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtube.videoId}?rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            {youtube.title && (
              <p className="text-white/30 text-xs mt-2 truncate">{youtube.title}</p>
            )}
          </section>
        )}

        {/* Nothing found at all */}
        {!mediaLoading && !spotify?.id && !youtube?.videoId && (
          <div className="glass p-8 text-center">
            <p className="text-3xl mb-2">🎵</p>
            <p className="text-white/60 font-bold text-sm">No media found for {artistName}</p>
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artistName + ' DJ set')}`}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mt-4"
              style={{ background: 'rgba(255,0,0,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,0,0,0.3)' }}
            >
              Search on YouTube →
            </a>
          </div>
        )}

        {/* More on YouTube link */}
        {!mediaLoading && youtube?.videoId && (
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(artistName + ' DJ set live')}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all"
          >
            <svg width="14" height="10" viewBox="0 0 24 17" fill="currentColor">
              <path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0S4.495 0 2.627.069a3.02 3.02 0 0 0-2.122 2.136C0 4.07 0 8.001 0 8.001s0 3.931.505 5.796a3.02 3.02 0 0 0 2.122 2.136C4.495 16.002 12 16.002 12 16.002s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136C24 11.932 24 8.001 24 8.001s0-3.931-.505-5.796zM9.609 11.001V5.001l6.264 3-6.264 3z"/>
            </svg>
            More videos on YouTube
          </a>
        )}

        {/* Live Performance Ratings */}
        <ArtistRating artistName={artistName} />

        {/* Upcoming Shows */}
        <section>
          <h2 className="font-black text-white text-lg mb-3">🎟️ Upcoming Shows</h2>
          {eventsLoading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="glass p-4 flex gap-3 animate-pulse">
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="flex flex-col gap-3">
              {events.map(event => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="glass p-4 flex items-center gap-3 hover:border-white/20 transition-all group"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                    {event.imageUrl
                      ? <img loading="lazy" decoding="async" src={event.imageUrl} alt={event.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-white/10 to-white/5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm group-hover:text-[#C8FF00] transition-colors truncate">{event.name}</p>
                    <p className="text-white/50 text-xs mt-0.5">{event.venue}{event.city ? ` · ${event.city}` : ''}</p>
                    <p className="text-white/30 text-xs mt-0.5">{formatDate(event.date)}{event.time !== 'TBA' ? ` · ${event.time}` : ''}</p>
                  </div>
                  <svg className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="glass p-8 text-center">
              <p className="text-3xl mb-2">🎵</p>
              <p className="text-white/60 font-bold text-sm">No upcoming shows found</p>
              <p className="text-white/30 text-xs mt-1">Ticketmaster may not have {artistName} listed yet</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
