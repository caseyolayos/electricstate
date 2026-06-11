'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/mockStore'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

const ADMIN_EMAIL = 'caseyolayos@gmail.com'

interface FestivalRow {
  id: string
  name: string
  venue: string | null
  city: string | null
  state: string | null
  date_start: string | null
  status: string
  image_url: string | null
  lineup: string[] | null
  genre: string[] | null
  ticket_link: string | null
  source: string | null
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    approved: 'bg-green-500/10 text-green-400 border-green-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[status] || styles.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const { state, approveEvent, rejectEvent } = useUser()
  const router = useRouter()
  const pending = state.pendingEvents

  // Festival state
  const [festivals, setFestivals] = useState<FestivalRow[]>([])
  const [festivalsLoading, setFestivalsLoading] = useState(false)
  const [festivalsRefreshing, setFestivalsRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [festivalTab, setFestivalTab] = useState<'pending' | 'approved' | 'all'>('pending')
  const [notifying, setNotifying] = useState<string | null>(null)
  const [notifyResult, setNotifyResult] = useState<Record<string, string>>({})
  const [blastTitle, setBlastTitle] = useState('')
  const [blastBody, setBlastBody] = useState('')
  const [blasting, setBlasting] = useState(false)
  const [blastResult, setBlastResult] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user?.email !== ADMIN_EMAIL) {
      router.replace('/')
    }
  }, [user, loading, router])

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      const client = createClient()
      if (!client) return null
      const { data } = await client.auth.getSession()
      return data?.session?.access_token || null
    } catch {
      return null
    }
  }, [])

  const loadFestivals = useCallback(async (background = false) => {
    if (background) {
      setFestivalsRefreshing(true)
    } else {
      setFestivalsLoading(true)
    }
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch('/api/festivals/admin', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      const data = await res.json()
      setFestivals(data.festivals || [])
    } catch {
      // silently fail
    } finally {
      setFestivalsLoading(false)
      setFestivalsRefreshing(false)
    }
  }, [getToken])

  const festivalsFetchedForId = useRef<string | null>(null)
  const userId = user?.id
  useEffect(() => {
    if (user?.email === ADMIN_EMAIL && userId && festivalsFetchedForId.current !== userId) {
      festivalsFetchedForId.current = userId
      loadFestivals()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const updateFestivalStatus = async (id: string, status: string) => {
    const token = await getToken()
    if (!token) return
    await fetch('/api/festivals/admin', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, status }),
    })
    setFestivals(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  const runSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/festivals/sync', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data.error) {
        setSyncResult(`Error: ${data.error}`)
      } else {
        const dedup = data.dedupRejected ? ` · ${data.dedupRejected} dupes removed` : ''
        setSyncResult(`✓ Synced ${data.synced} festivals${dedup}`)
        await loadFestivals(true)
      }
    } catch (e) {
      setSyncResult(`Error: ${e}`)
    } finally {
      setSyncing(false)
    }
  }

  const sendArtistMatchAlert = async (festivalId: string, festivalName: string) => {
    setNotifying(festivalId)
    setNotifyResult(prev => ({ ...prev, [festivalId]: '' }))
    try {
      const token = await getToken()
      const res = await fetch('/api/notifications/artist-match', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ festival_id: festivalId }),
      })
      const data = await res.json()
      if (data.error) {
        setNotifyResult(prev => ({ ...prev, [festivalId]: `Error: ${data.error}` }))
      } else {
        setNotifyResult(prev => ({ ...prev, [festivalId]: `✓ Sent to ${data.sent} fans (${data.total_matched} matched)` }))
      }
    } catch (e) {
      setNotifyResult(prev => ({ ...prev, [festivalId]: `Error: ${e}` }))
    } finally {
      setNotifying(null)
    }
  }

  const sendBlast = async () => {
    if (!blastTitle.trim() || !blastBody.trim()) return
    setBlasting(true)
    setBlastResult(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/notifications/blast', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: blastTitle, body: blastBody }),
      })
      const data = await res.json()
      if (data.error) setBlastResult(`Error: ${data.error}`)
      else setBlastResult(`✓ Sent to ${data.sent} subscribers (${data.errors} errors)`)
    } catch (e) {
      setBlastResult(`Error: ${e}`)
    } finally {
      setBlasting(false)
    }
  }

  const runBackfill = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/festivals/backfill', { method: 'POST' })
      const data = await res.json()
      setSyncResult(`✓ Backfill: ${data.slugsWritten} slugs updated, ${data.dedupRejected} dupes removed`)
      await loadFestivals(true)
    } catch (e) {
      setSyncResult(`Error: ${e}`)
    } finally {
      setSyncing(false)
    }
  }

  if (loading || user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    )
  }

  const pendingFestivals = festivals.filter(f => f.status === 'pending')
  const approvedFestivals = festivals.filter(f => f.status === 'approved')
  const displayFestivals =
    festivalTab === 'pending' ? pendingFestivals :
    festivalTab === 'approved' ? approvedFestivals :
    festivals

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto w-full">
      {/* ── Push Notification Blast ──────────────────────────────────────── */}
      <div className="mb-8 p-5 rounded-2xl" style={{ background: 'rgba(200,255,0,0.05)', border: '1px solid rgba(200,255,0,0.15)' }}>
        <h2 className="text-white font-black text-base mb-1">📣 Send Notification Blast</h2>
        <p className="text-white/40 text-xs mb-4">Sends to all subscribers with push enabled</p>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Title — e.g. 🔥 2 Days Until EDC Las Vegas"
            value={blastTitle}
            onChange={e => { setBlastTitle(e.target.value); setBlastResult(null) }}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          <textarea
            placeholder="Body — e.g. The playa is calling. See you there. ⚡"
            value={blastBody}
            onChange={e => { setBlastBody(e.target.value); setBlastResult(null) }}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
        </div>
        <button
          onClick={sendBlast}
          disabled={blasting || !blastTitle.trim() || !blastBody.trim()}
          className="mt-3 w-full py-3 rounded-xl font-black text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #C8FF00, #0099BB)', color: '#000' }}
        >
          {blasting ? (
            <><span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Sending…</>
          ) : '📣 Send to All Subscribers'}
        </button>
        {blastResult && (
          <p className={`text-xs mt-2 text-center font-semibold ${
            blastResult.startsWith('Error') ? 'text-red-400' : 'text-green-400'
          }`}>{blastResult}</p>
        )}
      </div>

      {/* ── Community Events ─────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black text-white">Admin</h1>
          {pending.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000000' }}>
              {pending.length}
            </span>
          )}
        </div>
        <p className="text-white/40 mt-1 text-sm">Review community-submitted events</p>
      </div>

      {pending.length === 0 ? (
        <div className="glass p-12 text-center">
          <p className="text-4xl mb-4">✅</p>
          <h2 className="font-bold text-white text-lg mb-1">All Clear</h2>
          <p className="text-white/40 text-sm">No pending events to review.</p>
          <p className="text-white/25 text-xs mt-3">Submit an event from the Submit page to see it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map(event => (
            <div key={event.id} className="glass overflow-hidden">
              {/* Color top strip */}
              <div className={`h-1 bg-gradient-to-r ${event.gradient}`} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base">{event.name}</h3>
                    <p className="text-white/50 text-sm mt-0.5">{event.venue} · {event.city}</p>
                  </div>
                  <span className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                    Pending
                  </span>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <p className="text-white/30 text-xs">Date</p>
                    <p className="text-white font-medium">{formatDate(event.date)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <p className="text-white/30 text-xs">Time</p>
                    <p className="text-white font-medium">{event.time}</p>
                  </div>
                </div>

                {/* Genres */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {event.genre.map(g => (
                    <span key={g} className="text-[10px] bg-white/5 text-white/50 rounded px-1.5 py-0.5 border border-white/10">
                      {g}
                    </span>
                  ))}
                </div>

                {/* Lineup */}
                {event.lineup.length > 0 && (
                  <p className="text-white/40 text-xs mb-3">
                    Lineup: {event.lineup.join(', ')}
                  </p>
                )}

                {/* Description */}
                {event.description && (
                  <p className="text-white/50 text-xs mb-4 leading-relaxed line-clamp-2">
                    {event.description}
                  </p>
                )}

                {/* Source badge */}
                <p className="text-white/30 text-xs mb-4">
                  Submitted by: <span className="text-[#C8FF00]">Community Member</span>
                </p>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => approveEvent(event.id)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all hover:shadow-[0_0_20px_rgba(200,255,0,0.3)]"
                    style={{ background: 'linear-gradient(135deg, #C8FF00, #0099BB)', color: '#000000' }}
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => rejectEvent(event.id)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    ✗ Reject
                  </button>
                  <button
                    onClick={() => approveEvent(event.id)}
                    className="px-4 py-2.5 rounded-xl font-bold text-sm border border-[#C8FF00]/30 text-[#C8FF00] hover:bg-[#C8FF00]/10 transition-all text-xs"
                  >
                    ✓ Verify
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Festivals ────────────────────────────────────────────────────── */}
      <div className="mt-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-white">Festivals</h2>
            {festivals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000000' }}>
                {festivals.length}
              </span>
            )}
            {pendingFestivals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                {pendingFestivals.length} pending
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={runBackfill}
              disabled={syncing}
              className="px-3 py-2 rounded-xl font-bold text-xs transition-all border border-white/20 text-white/50 hover:text-white/70 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fix slugs + remove duplicates (no TM API call)"
            >
              {syncing ? '⧗' : '🧹 Dedup'}
            </button>
            <button
              onClick={runSync}
              disabled={syncing}
              className="px-4 py-2 rounded-xl font-bold text-xs transition-all border border-[#C8FF00]/30 text-[#C8FF00] hover:bg-[#C8FF00]/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <span className="w-3 h-3 border border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
                  Syncing…
                </>
              ) : '🔄 Sync Now'}
            </button>
          </div>
        </div>

        {syncResult && (
          <div className={`mb-4 px-4 py-2.5 rounded-xl text-sm border ${
            syncResult.startsWith('Error')
              ? 'bg-red-500/10 text-red-400 border-red-500/20'
              : 'bg-green-500/10 text-green-400 border-green-500/20'
          }`}>
            {syncResult}
          </div>
        )}

        <p className="text-white/40 text-sm mb-4">
          Festival data synced from Ticketmaster. Approve to make public.
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['pending', 'approved', 'all'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFestivalTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                festivalTab === tab
                  ? 'bg-[#C8FF00]/10 text-[#C8FF00] border-[#C8FF00]/30'
                  : 'bg-white/5 text-white/40 border-white/10 hover:text-white/60'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && pendingFestivals.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400">
                  {pendingFestivals.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Festival list */}
        {festivalsLoading ? (
          <div className="glass p-8 text-center">
            <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin mx-auto" />
          </div>
        ) : displayFestivals.length === 0 && !festivalsRefreshing ? (
          <div className="glass p-8 text-center">
            <p className="text-white/40 text-sm">
              {festivalTab === 'pending'
                ? 'No pending festivals. Run a sync to fetch new ones.'
                : `No ${festivalTab} festivals.`}
            </p>
            {festivalTab === 'pending' && festivals.length === 0 && (
              <button
                onClick={runSync}
                disabled={syncing}
                className="mt-4 px-4 py-2 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, #C8FF00, #0099BB)', color: '#000000' }}
              >
                Run First Sync
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {festivalsRefreshing && festivals.length > 0 && (
              <div className="flex items-center gap-2 px-1 py-2 text-xs text-white/30">
                <span className="w-3 h-3 border border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
                Refreshing…
              </div>
            )}
            {displayFestivals.map(festival => (
              <div key={festival.id} className="glass overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#C8FF00]/40 to-[#0099BB]/40" />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail — fixed size to prevent layout shift */}
                    <div className="w-16 h-16 rounded-lg flex-shrink-0 overflow-hidden bg-white/5 relative">
                      {festival.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={festival.image_url}
                          alt={festival.name}
                          width={64}
                          height={64}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-2xl">🎪</span>
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-bold text-white text-sm leading-tight">{festival.name}</h3>
                        <StatusBadge status={festival.status} />
                      </div>
                      <p className="text-white/50 text-xs">
                        {[festival.city, festival.state].filter(Boolean).join(', ')}
                        {festival.venue && ` · ${festival.venue}`}
                      </p>
                      {festival.date_start && (
                        <p className="text-white/40 text-xs mt-0.5">{formatDate(festival.date_start)}</p>
                      )}
                      {festival.lineup && festival.lineup.length > 0 && (
                        <p className="text-white/30 text-xs mt-1 truncate">
                          {festival.lineup.slice(0, 4).join(', ')}
                          {festival.lineup.length > 4 && ` +${festival.lineup.length - 4}`}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    {festival.status !== 'approved' && (
                      <button
                        onClick={() => updateFestivalStatus(festival.id, 'approved')}
                        className="flex-1 py-2 rounded-xl font-bold text-xs transition-all hover:shadow-[0_0_20px_rgba(200,255,0,0.3)]"
                        style={{ background: 'linear-gradient(135deg, #C8FF00, #0099BB)', color: '#000000' }}
                      >
                        ✓ Approve
                      </button>
                    )}
                    {festival.status !== 'rejected' && (
                      <button
                        onClick={() => updateFestivalStatus(festival.id, 'rejected')}
                        className="flex-1 py-2 rounded-xl font-bold text-xs border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        ✗ Reject
                      </button>
                    )}
                    {festival.status === 'approved' && (
                      <button
                        onClick={() => updateFestivalStatus(festival.id, 'rejected')}
                        className="flex-1 py-2 rounded-xl font-bold text-xs border border-white/10 text-white/40 hover:text-red-400 hover:border-red-500/30 transition-all"
                      >
                        Remove
                      </button>
                    )}
                    {festival.ticket_link && festival.ticket_link !== '#' && (
                      <a
                        href={festival.ticket_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl font-bold text-xs border border-white/10 text-white/40 hover:text-white/60 transition-all"
                      >
                        🔗
                      </a>
                    )}
                  </div>
                  {/* Artist match notification — approved festivals with lineups only */}
                  {festival.status === 'approved' && festival.lineup && festival.lineup.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => sendArtistMatchAlert(festival.id, festival.name)}
                        disabled={notifying === festival.id}
                        className="w-full py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                        style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.2)', color: '#C8FF00' }}
                      >
                        {notifying === festival.id ? (
                          <><span className="w-3 h-3 border border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" /> Sending…</>
                        ) : '🎯 Notify Fans with Matching Artists'}
                      </button>
                      {notifyResult[festival.id] && (
                        <p className={`text-xs mt-1.5 text-center ${
                          notifyResult[festival.id].startsWith('Error') ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {notifyResult[festival.id]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
