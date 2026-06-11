'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'
import { useZoomLock } from '@/lib/useZoomLock'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Event } from '@/lib/mockData'
import VenueRating from '@/components/VenueRating'

const VenueMap = dynamic(() => import('@/components/VenueMap'), { ssr: false })

interface VenuePhoto {
  id: string
  photo_url: string
  created_at: string
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function VenuePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug
  const venueName = searchParams.get('name') || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const venueCity = searchParams.get('city') || ''
  const venueLat  = searchParams.get('lat') || ''
  const venueLngParam = searchParams.get('lng') || ''

  const [photos, setPhotos] = useState<VenuePhoto[]>([])
  const [photosLoading, setPhotosLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  useZoomLock(!!lightbox)  // unlock pinch-zoom while photo lightbox is open
  const fileRef = useRef<HTMLInputElement>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [venueCoords, setVenueCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null)
  const [youtubeTitle, setYoutubeTitle] = useState<string | null>(null)

  useEffect(() => {
    loadPhotos()
    loadEvents()
    // Fetch YouTube spotlight for this venue
    fetch(`/api/youtube/venue?venue=${encodeURIComponent(venueName)}&city=${encodeURIComponent(venueCity)}`)
      .then(r => r.json())
      .then(d => { if (d.videoId) { setYoutubeVideoId(d.videoId); setYoutubeTitle(d.title ?? null) } })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function loadEvents() {
    setEventsLoading(true)
    try {
      const params = new URLSearchParams({ name: venueName })
      if (venueCity) params.set('city', venueCity)
      if (venueLat)  params.set('lat', venueLat)
      if (venueLngParam) params.set('lng', venueLngParam)
      const res = await fetch(`/api/venues/${slug}/events?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])
        // Coords come directly from the venue lookup in the API
        if (data.venueLat && data.venueLng) {
          setVenueCoords({ lat: data.venueLat, lng: data.venueLng })
        }
      }
    } catch {}
    setEventsLoading(false)
  }

  async function loadPhotos() {
    setPhotosLoading(true)
    const supabase = createClient()
    if (!supabase) { setPhotosLoading(false); return }
    const { data } = await supabase
      .from('venue_photos')
      .select('id, photo_url, created_at')
      .eq('venue_slug', slug)
      .order('created_at', { ascending: false })
    setPhotos(data || [])
    setPhotosLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    const supabase = createClient()
    if (!supabase) { setUploading(false); return }

    const ext = file.name.split('.').pop()
    const path = `${slug}/${user.id}-${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('venue-photos').upload(path, file)
    if (uploadErr) { setUploading(false); return }

    const { data: urlData } = supabase.storage.from('venue-photos').getPublicUrl(path)
    const photoUrl = urlData.publicUrl

    await supabase.from('venue_photos').insert({
      venue_slug: slug,
      venue_name: venueName,
      photo_url: photoUrl,
      user_id: user.id,
    })

    await loadPhotos()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="relative h-40 flex items-end"
        style={{ background: 'linear-gradient(135deg, #0A0A0A, #1a1a2e)' }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(200,255,0,0.3) 0%, transparent 60%)' }} />
        <div className="relative z-10 px-4 pb-5 w-full">
          <button onClick={() => router.back()} className="text-white/40 text-sm mb-3 flex items-center gap-1 hover:text-white/70 transition-colors">
            ← Back
          </button>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">{venueName}</h1>
              {venueCity && <p className="text-white/50 text-sm mt-0.5">📍 {venueCity}</p>}
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
              style={{ background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.2)' }}>
              🏟️
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-6">

        {/* Location map */}
        {venueCoords && (
          <section>
            <h2 className="font-black text-white text-lg mb-3">📍 Location</h2>
            <VenueMap
              lat={venueCoords.lat}
              lng={venueCoords.lng}
              venueName={venueName}
              appleMapsUrl={`https://maps.apple.com/?q=${encodeURIComponent(venueName + (venueCity ? ', ' + venueCity : ''))}&ll=${venueCoords.lat},${venueCoords.lng}`}
            />
          </section>
        )}

        {/* Venue Spotlight — YouTube */}
        {youtubeVideoId && (
          <section>
            <h2 className="font-black text-white text-lg mb-3 flex items-center gap-2">
              <svg width="16" height="11" viewBox="0 0 24 17" fill="#FF0000">
                <path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0S4.495 0 2.627.069a3.02 3.02 0 0 0-2.122 2.136C0 4.07 0 8.001 0 8.001s0 3.931.505 5.796a3.02 3.02 0 0 0 2.122 2.136C4.495 16.002 12 16.002 12 16.002s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136C24 11.932 24 8.001 24 8.001s0-3.931-.505-5.796zM9.609 11.001V5.001l6.264 3-6.264 3z"/>
              </svg>
              Venue Spotlight
            </h2>
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}?rel=0&modestbranding=1`}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
            {youtubeTitle && (
              <p className="text-white/30 text-xs mt-2 truncate">{youtubeTitle}</p>
            )}
          </section>
        )}

        {/* Photo Gallery */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-white text-lg">📸 Photo Gallery</h2>
            {user ? (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                style={{ background: 'rgba(200,255,0,0.15)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.3)' }}
              >
                {uploading ? (
                  <><span className="w-3 h-3 border border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" /> Uploading…</>
                ) : (
                  <>+ Add Photo</>
                )}
              </button>
            ) : (
              <Link href="/login" className="text-white/30 text-xs hover:text-white/60 transition-colors">
                Sign in to upload
              </Link>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

          {photosLoading ? (
            <div className="grid grid-cols-3 gap-2">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map(p => (
                <button
                  key={p.id}
                  onClick={() => setLightbox(p.photo_url)}
                  className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity active:scale-95"
                >
                  <img loading="lazy" decoding="async" src={p.photo_url} alt="Venue photo" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <div className="glass p-8 text-center">
              <p className="text-3xl mb-2">📷</p>
              <p className="text-white/60 font-bold text-sm">No photos yet</p>
              <p className="text-white/30 text-xs mt-1">Be the first to share a photo of {venueName}</p>
              {!user && (
                <Link href="/login" className="inline-block mt-3 text-[#C8FF00] text-xs hover:underline">
                  Sign in to upload →
                </Link>
              )}
            </div>
          )}
        </section>

        {/* Community note */}
        {photos.length > 0 && (
          <p className="text-white/20 text-xs text-center">
            {photos.length} community {photos.length === 1 ? 'photo' : 'photos'} · tap to view
          </p>
        )}

        {/* Venue Rating */}
        <VenueRating venueSlug={slug} venueName={venueName} />

        {/* Upcoming Shows */}
        <section>
          <h2 className="font-black text-white text-lg mb-3">🎟️ Upcoming Shows</h2>
          {eventsLoading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="glass p-4 flex gap-3 animate-pulse">
                  <div className="w-14 h-14 rounded-xl bg-white/10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
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
                    <p className="text-white/40 text-xs mt-0.5">{formatDate(event.date)}{event.time !== 'TBA' ? ` · ${event.time}` : ''}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {event.genre.slice(0, 2).map(g => (
                        <span key={g} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,255,0,0.1)', color: '#C8FF00' }}>{g}</span>
                      ))}
                    </div>
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
              <p className="text-white/30 text-xs mt-1">Check back soon</p>
            </div>
          )}
        </section>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white text-2xl"
            onClick={() => setLightbox(null)}
          >✕</button>
          <img
            src={lightbox}
            alt="Venue photo"
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ touchAction: 'pinch-zoom' }}
          />
        </div>
      )}
    </div>
  )
}
