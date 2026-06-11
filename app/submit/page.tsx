'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/mockStore'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

const allGenres = ['House', 'Techno', 'Bass', 'Dubstep', 'Trance', 'DNB', 'Ambient', 'Breaks', 'UK Garage', 'Other']

type EventType = 'mainstream' | 'underground'

const REVEAL_OPTIONS = [
  { value: 'midnight', label: 'Midnight before', desc: '12:00 AM night before the event' },
  { value: 'noon',    label: 'Noon day-of',    desc: '12:00 PM on the day of the event' },
  { value: '6pm',     label: '6 PM day-of',    desc: '6:00 PM on the day of the event' },
  { value: '3h',      label: '3 hours before', desc: '3 hours before doors open' },
  { value: '1h',      label: '1 hour before',  desc: '1 hour before doors open' },
]

export default function SubmitPage() {
  const { user, loading } = useAuth()
  const { submitEvent } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  const [eventType, setEventType] = useState<EventType>('mainstream')
  const [submitted, setSubmitted] = useState(false)
  const [submittedEventId, setSubmittedEventId] = useState<string | null>(null)
  const [alreadyOnboarded, setAlreadyOnboarded] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flyerFile, setFlyerFile] = useState<File | null>(null)
  const [flyerPreview, setFlyerPreview] = useState<string | null>(null)
  const [flyerUploading, setFlyerUploading] = useState(false)
  const [scanningLineup, setScanningLineup] = useState(false)
  const [scanResult, setScanResult] = useState<{ count: number } | null>(null)
  const flyerInputRef = useRef<HTMLInputElement>(null)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [revealAt, setRevealAt] = useState('3h')

  const [form, setForm] = useState({
    name: '', venue: '', city: '', date: '', time: '',
    ticketLink: '', description: '', lineup: '',
    neighborhood: '', fullAddress: '', coverCharge: '',
    organizer_name: '',
  })

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    )
  }

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleFlyerChange = (file: File | null) => {
    setFlyerFile(file)
    setScanResult(null)
    if (file) {
      const reader = new FileReader()
      reader.onload = e => setFlyerPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setFlyerPreview(null)
    }
  }

  const scanLineupFromFlyer = async () => {
    if (!flyerFile) return
    setScanningLineup(true)
    setScanResult(null)
    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => {
          const result = e.target?.result as string
          // Strip the data:image/...;base64, prefix
          resolve(result.split(',')[1])
        }
        reader.onerror = reject
        reader.readAsDataURL(flyerFile)
      })

      const res = await fetch('/api/lineup/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: flyerFile.type || 'image/jpeg' }),
      })

      const data = await res.json()
      if (!res.ok || !data.artists?.length) {
        setError('Couldn\'t detect any artists in this flyer. Try a cleaner image or add them manually.')
        return
      }

      // Merge with any existing lineup (don\'t overwrite if they\'ve already typed some)
      const existing = form.lineup ? form.lineup.split(',').map((s: string) => s.trim()).filter(Boolean) : []
      const merged = Array.from(new Set([...existing, ...data.artists]))
      update('lineup', merged.join(', '))
      setScanResult({ count: data.artists.length })
    } catch (err) {
      console.error('Scan error:', err)
      setError('Something went wrong scanning the flyer. You can add the lineup manually.')
    } finally {
      setScanningLineup(false)
    }
  }

  const uploadFlyer = async (eventId: string): Promise<string | null> => {
    if (!flyerFile) return null
    const supabase = createClient()
    if (!supabase) return null
    setFlyerUploading(true)
    try {
      const ext = flyerFile.name.split('.').pop() || 'jpg'
      const path = `${eventId}/flyer.${ext}`
      const { error } = await supabase.storage.from('event-flyers').upload(path, flyerFile, { upsert: true })
      if (error) {
        console.error('Flyer upload error:', error)
        setError(`Photo upload failed: ${error.message}. Your event was submitted without the photo.`)
        return null
      }
      const { data } = supabase.storage.from('event-flyers').getPublicUrl(path)
      return data.publicUrl
    } finally {
      setFlyerUploading(false)
    }
  }

  const toggleGenre = (genre: string) =>
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.city || !form.date) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/submit-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          organizer_name: form.organizer_name || undefined,
          genres: selectedGenres,
          eventType,
          revealAt: eventType === 'underground' ? revealAt : null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          userId: user.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Submit failed')

      const newEventId = data.id || null
      setSubmittedEventId(newEventId)

      // Check if this organizer is already onboarded (returning promoter)
      if (newEventId && eventType === 'underground') {
        const supabase = createClient()
        if (supabase) {
          const { data: profile } = await supabase
            .from('organizer_profiles')
            .select('stripe_onboarding_complete')
            .eq('id', user.id)
            .single()
          if (profile?.stripe_onboarding_complete) setAlreadyOnboarded(true)
        }
      }

      // Upload flyer now that we have the event ID
      if (newEventId && flyerFile) {
        const flyerUrl = await uploadFlyer(newEventId)
        if (flyerUrl) {
          const patchRes = await fetch('/api/submit-event/flyer', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: newEventId, imageUrl: flyerUrl }),
          })
          if (!patchRes.ok) {
            const patchJson = await patchRes.json().catch(() => ({}))
            console.error('Flyer link error:', patchJson)
            setError(`Event submitted! But flyer link failed to save: ${patchJson.error || 'unknown error'}`)
          }
        }
        // If flyerUrl is null, uploadFlyer already called setError — stop here so
        // the user sees the error instead of being sent to the success screen.
        if (!flyerUrl) {
          setSubmitting(false)
          return
        }
      }

      // Also award XP locally
      submitEvent({
        id: `evt-user-${Date.now()}`,
        name: form.name,
        venue: eventType === 'underground' ? (form.neighborhood || form.city) : (form.venue || form.city),
        city: form.city,
        date: form.date,
        time: form.time || '9:00 PM',
        genre: selectedGenres.length > 0 ? selectedGenres : ['Electronic'],
        ticketLink: form.ticketLink || '#',
        source: 'Community Submitted',
        description: form.description || 'Community submitted event.',
        lineup: form.lineup ? form.lineup.split(',').map(s => s.trim()).filter(Boolean) : [],
        gradient: 'from-black to-[#001A00]',
        status: 'pending',
      })

      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto">
        <div className="glass p-8 text-center mb-4">
          <div className="text-5xl mb-4">{eventType === 'underground' ? '🔒' : '🎉'}</div>
          <h2 className="text-2xl font-black text-white mb-2">
            {eventType === 'underground' ? 'Underground Event Submitted!' : 'Event Submitted!'}
          </h2>
          <p className="text-white/50 mb-2">
            {eventType === 'underground'
              ? 'Your event is pending review. The full address stays locked until your reveal time.'
              : 'Your event is pending review by the Electric State team.'}
          </p>
          {eventType === 'underground' && (
            <p className="text-[#C8FF00]/70 text-sm mb-4">🔐 Address reveal: {REVEAL_OPTIONS.find(o => o.value === revealAt)?.label}</p>
          )}
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm mb-6"
            style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000' }}>
            ⚡ +50 XP Earned!
          </div>
          <button
            onClick={() => {
              setSubmitted(false)
              setSubmittedEventId(null)
              setAlreadyOnboarded(false)
              setFlyerFile(null)
              setFlyerPreview(null)
              setForm({ name: '', venue: '', city: '', date: '', time: '', ticketLink: '', description: '', lineup: '', neighborhood: '', fullAddress: '', coverCharge: '', organizer_name: '' })
              setSelectedGenres([])
              setEventType('mainstream')
            }}
            className="w-full px-6 py-3 rounded-xl text-sm font-bold border border-white/20 text-white hover:bg-white/5 transition-all"
          >
            Submit Another Event
          </button>
        </div>

        {/* Ticketing upsell — underground events only */}
        {eventType === 'underground' && submittedEventId && alreadyOnboarded && (
          <div className="rounded-2xl p-6" style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.25)' }}>
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎟️</div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base mb-1">Add ticket tiers</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-4">
                  Your Stripe account is already connected. Jump straight to setting up tickets for this event.
                </p>
                <a
                  href={`/organizer/events/${submittedEventId}/tickets`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95"
                  style={{ background: '#C8FF00', color: '#000' }}
                >
                  Add ticket tiers →
                </a>
              </div>
            </div>
          </div>
        )}
        {eventType === 'underground' && submittedEventId && !alreadyOnboarded && (
          <div className="rounded-2xl p-6" style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.25)' }}>
            <div className="flex items-start gap-4">
              <div className="text-3xl">🎟️</div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base mb-1">Want us to handle ticketing?</h3>
                <p className="text-white/50 text-sm leading-relaxed mb-4">
                  Sell tickets directly through Electric State. We handle checkout, QR codes, and door check-in. You get paid out via Stripe — setup takes 2 minutes.
                </p>
                <a
                  href={`/organizer/onboarding/${submittedEventId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95"
                  style={{ background: '#C8FF00', color: '#000' }}
                >
                  Set up ticketing →
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors"
  const inputStyle = { background: 'rgba(255,255,255,0.05)' }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white">Submit Event</h1>
        <p className="text-white/40 mt-1 text-sm">Add a show to the scene. <span className="text-[#C8FF00]">+50 XP</span></p>
      </div>

      {/* Event type toggle */}
      <div className="mb-6 p-1 rounded-2xl flex gap-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <button
          type="button"
          onClick={() => setEventType('mainstream')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            eventType === 'mainstream'
              ? 'text-black'
              : 'text-white/50 hover:text-white/80'
          }`}
          style={eventType === 'mainstream' ? { background: '#C8FF00' } : {}}
        >
          🏟️ Mainstream
        </button>
        <button
          type="button"
          onClick={() => setEventType('underground')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            eventType === 'underground'
              ? 'text-black'
              : 'text-white/50 hover:text-white/80'
          }`}
          style={eventType === 'underground' ? { background: '#C8FF00' } : {}}
        >
          🔒 Underground
        </button>
      </div>

      {/* Underground explainer */}
      {eventType === 'underground' && (
        <div className="mb-5 p-4 rounded-xl" style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.2)' }}>
          <p className="text-[#C8FF00] text-xs font-bold mb-1">🔐 Address Reveal Mode</p>
          <p className="text-white/60 text-xs leading-relaxed">
            Only your city and neighborhood are shown publicly. The full address stays locked and automatically reveals to all app users at your chosen time — keeping it underground until the last moment.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Event Name */}
        <div>
          <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Event Name *</label>
          <input type="text" required value={form.name} onChange={e => update('name', e.target.value)}
            placeholder={eventType === 'underground' ? 'e.g. Warehouse Sessions Vol. 4' : 'e.g. Deep Frequencies Vol. 13'}
            className={inputClass} style={inputStyle} />
        </div>

        {eventType === 'mainstream' ? (
          /* Mainstream: venue + city */
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Venue *</label>
              <input type="text" required value={form.venue} onChange={e => update('venue', e.target.value)}
                placeholder="Exchange LA" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">City *</label>
              <input type="text" required value={form.city} onChange={e => update('city', e.target.value)}
                placeholder="Los Angeles" className={inputClass} style={inputStyle} />
            </div>
          </div>
        ) : (
          /* Underground: neighborhood + city + hidden full address */
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Neighborhood <span className="text-[#C8FF00]">(public)</span></label>
                <input type="text" value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)}
                  placeholder="Silver Lake" className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">City *</label>
                <input type="text" required value={form.city} onChange={e => update('city', e.target.value)}
                  placeholder="Los Angeles" className={inputClass} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">
                Full Address <span className="text-white/30">(locked until reveal)</span>
              </label>
              <input type="text" value={form.fullAddress} onChange={e => update('fullAddress', e.target.value)}
                placeholder="1234 Somewhere Ave, Los Angeles, CA 90026"
                className={inputClass} style={inputStyle} />
              <p className="text-white/25 text-xs mt-1">🔒 Never shown publicly before your reveal time</p>
            </div>
          </>
        )}

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Date *</label>
            <input type="date" required value={form.date} onChange={e => update('date', e.target.value)}
              className={inputClass} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </div>
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">
              {eventType === 'underground' ? 'Doors' : 'Time'}
            </label>
            <input type="text" value={form.time} onChange={e => update('time', e.target.value)}
              placeholder="10:00 PM" className={inputClass} style={inputStyle} />
          </div>
        </div>

        {/* Underground: reveal time + cover */}
        {eventType === 'underground' && (
          <>
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">
                📍 Address Reveal Time
              </label>
              <div className="flex flex-col gap-2">
                {REVEAL_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRevealAt(opt.value)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm border transition-all text-left ${
                      revealAt === opt.value
                        ? 'border-[#C8FF00]/50 bg-[#C8FF00]/08 text-white'
                        : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white/80'
                    }`}
                  >
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-xs text-white/30">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Cover Charge</label>
              <input type="text" value={form.coverCharge} onChange={e => update('coverCharge', e.target.value)}
                placeholder="$15 at the door · Cash only" className={inputClass} style={inputStyle} />
            </div>
          </>
        )}

        {/* Genres */}
        <div>
          <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Genre(s)</label>
          <div className="flex flex-wrap gap-2">
            {allGenres.map(genre => (
              <button type="button" key={genre} onClick={() => toggleGenre(genre)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  selectedGenres.includes(genre)
                    ? 'border-[#C8FF00]/50 text-[#C8FF00] bg-[#C8FF00]/10'
                    : 'border-white/10 text-white/50 hover:border-white/30 hover:text-white/80'
                }`}>{genre}</button>
            ))}
          </div>
        </div>

        {/* Lineup */}
        <div>
          <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Lineup</label>
          <input type="text" value={form.lineup} onChange={e => update('lineup', e.target.value)}
            placeholder="Artist 1, Artist 2, Artist 3" className={inputClass} style={inputStyle} />
          <p className="text-white/25 text-xs mt-1">Separate artists with commas</p>
        </div>

        {/* Ticket link — mainstream only */}
        {eventType === 'mainstream' && (
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Ticket Link</label>
            <input type="url" value={form.ticketLink} onChange={e => update('ticketLink', e.target.value)}
              placeholder="https://ra.co/events/..." className={inputClass} style={inputStyle} />
          </div>
        )}

        {/* Organized By */}
        <div>
          <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">
            Organized By <span className="text-white/25 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.organizer_name}
            onChange={e => update('organizer_name', e.target.value)}
            placeholder="e.g. Insomniac, Do LaB, Independent"
            className={inputClass}
            style={inputStyle}
          />
          <p className="text-white/20 text-xs mt-1">The promoter or company producing this event</p>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Description</label>
          <textarea rows={3} value={form.description} onChange={e => update('description', e.target.value)}
            placeholder={eventType === 'underground' ? 'Vibe, dress code, what to expect...' : 'Tell us about this event...'}
            className={`${inputClass} resize-none`} style={inputStyle} />
        </div>

        {/* Event Flyer / Photo */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider">Event Flyer / Photo</label>
            {flyerPreview && (
              <button
                type="button"
                onClick={scanLineupFromFlyer}
                disabled={scanningLineup}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-60 active:scale-95"
                style={{ background: 'rgba(200,255,0,0.15)', border: '1px solid rgba(200,255,0,0.4)', color: '#C8FF00' }}
              >
                {scanningLineup
                  ? <><span className="w-3 h-3 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin inline-block" /> Scanning…</>
                  : scanResult
                  ? <>✅ {scanResult.count} artists found · Re-scan</>
                  : <>✨ Detect Lineup with AI</>}
              </button>
            )}
          </div>
          <input
            ref={flyerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => handleFlyerChange(e.target.files?.[0] || null)}
          />
          {flyerPreview ? (
            <div>
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img loading="lazy" decoding="async" src={flyerPreview} alt="Flyer preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => { handleFlyerChange(null); if (flyerInputRef.current) flyerInputRef.current.value = ''; setScanResult(null) }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{ background: 'rgba(0,0,0,0.7)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}
                >✕</button>
              </div>
              {/* AI Lineup Scan button */}
              <button
                type="button"
                onClick={scanLineupFromFlyer}
                disabled={scanningLineup}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-wait active:scale-95"
                style={{ background: 'rgba(200,255,0,0.1)', border: '1px solid rgba(200,255,0,0.3)', color: '#C8FF00' }}
              >
                {scanningLineup ? (
                  <><span className="w-4 h-4 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin inline-block" /> Scanning flyer…</>
                ) : scanResult ? (
                  <>✅ Found {scanResult.count} artist{scanResult.count !== 1 ? 's' : ''} · Scan again</>
                ) : (
                  <>✨ Detect Lineup with AI</>
                )}
              </button>
              {scanResult && (
                <p className="text-white/30 text-xs text-center mt-1">Lineup auto-filled below · edit freely</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => flyerInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all hover:border-white/30"
              style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}
            >
              <span className="text-2xl">🖼️</span>
              <span className="text-white/40 text-sm">Tap to add flyer or photo</span>
              <span className="text-white/20 text-xs">JPG, PNG, WEBP · max 10MB</span>
            </button>
          )}
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/30" style={{ background: 'rgba(239,68,68,0.08)' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={submitting}
          className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:shadow-[0_0_30px_rgba(200,255,0,0.4)] hover:scale-[1.01] active:scale-95 disabled:opacity-60 disabled:cursor-wait"
          style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000' }}>
          {submitting ? 'Submitting…' : `${eventType === 'underground' ? '🔒 Submit Underground Event' : 'Submit Event'} · +50 XP ⚡`}
        </button>
      </form>
    </div>
  )
}
