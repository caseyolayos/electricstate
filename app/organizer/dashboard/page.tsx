'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

interface EventStat {
  id: string
  name: string
  date: string
  city: string
  imageUrl: string | null
  ticketingEnabled: boolean
  status: string
  totalSold: number
  totalCapacity: number
  grossRevenueCents: number
  netRevenueCents: number
  tierCount: number
  totalViews: number
  totalTicketClicks: number
}

interface DashboardData {
  events: EventStat[]
  balance: { availableCents: number; pendingCents: number } | null
  isOnboarded: boolean
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function OrganizerDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [payoutLoading, setPayoutLoading] = useState(false)
  const [payoutResult, setPayoutResult] = useState<{ success?: boolean; error?: string; amountCents?: number; arrivalDate?: number } | null>(null)
  const [scannerLinkState, setScannerLinkState] = useState<Record<string, 'idle' | 'loading' | 'copied'>>({})

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  const getToken = useCallback(async () => {
    const supabase = createClient()
    if (!supabase) return null
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }, [])

  const getScannerLink = useCallback(async (eventId: string) => {
    setScannerLinkState(prev => ({ ...prev, [eventId]: 'loading' }))
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`/api/organizer/events/${eventId}/scanner-token`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (json.scannerToken) {
        const url = `${window.location.origin}/scan/festival-${eventId}?token=${json.scannerToken}`
        await navigator.clipboard.writeText(url)
        setScannerLinkState(prev => ({ ...prev, [eventId]: 'copied' }))
        setTimeout(() => setScannerLinkState(prev => ({ ...prev, [eventId]: 'idle' })), 3000)
      }
    } catch {
      setScannerLinkState(prev => ({ ...prev, [eventId]: 'idle' }))
    }
  }, [getToken])

  const handlePayout = useCallback(async () => {
    setPayoutLoading(true)
    setPayoutResult(null)
    try {
      const token = await getToken()
      if (!token) { setPayoutResult({ error: 'Not signed in' }); return }
      const res = await fetch('/api/organizer/payout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        setPayoutResult({ error: json.error ?? 'Payout failed' })
      } else {
        setPayoutResult({ success: true, amountCents: json.amountCents, arrivalDate: json.arrivalDate })
        // Refresh balance after payout
        if (data) {
          setData(prev => prev ? { ...prev, balance: prev.balance ? { ...prev.balance, availableCents: 0 } : null } : null)
        }
      }
    } catch {
      setPayoutResult({ error: 'Something went wrong' })
    } finally {
      setPayoutLoading(false)
    }
  }, [getToken, data])

  useEffect(() => {
    if (!user) return
    async function fetchDashboard() {
      const supabase = createClient()
      if (!supabase) { setFetching(false); return }
      const token = await getToken()
      if (!token) { setFetching(false); return }
      try {
        const res = await fetch('/api/organizer/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        setData(json)
      } catch { /* ignore */ }
      setFetching(false)
    }
    fetchDashboard()
  }, [user])

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    )
  }

  // If no events submitted at all, show the empty state
  if (!data?.events?.length) {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center">
        <div className="glass p-10">
          <div className="text-5xl mb-4">🎟️</div>
          <h2 className="text-2xl font-black text-white mb-2">No events yet</h2>
          <p className="text-white/50 mb-6">Submit an underground event to get started.</p>
          <a href="/submit" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: '#C8FF00', color: '#000' }}>
            Submit an event
          </a>
        </div>
      </div>
    )
  }

  const totalRevenue = (data.events || []).reduce((s, e) => s + e.netRevenueCents, 0)
  const totalTicketsSold = (data.events || []).reduce((s, e) => s + e.totalSold, 0)
  const totalEvents = data.events.length
  const avgTicketPrice = totalTicketsSold > 0
    ? (data.events.reduce((s, e) => s + e.grossRevenueCents, 0) / totalTicketsSold)
    : 0

  return (
    <div className="px-4 lg:px-8 py-6 max-w-lg lg:max-w-6xl mx-auto pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white">Dashboard</h1>
        <p className="text-white/40 mt-1 text-sm">Your events & ticket sales</p>
      </div>

      {/* Balance + Payout card */}
      <div className="glass p-5 mb-4 rounded-2xl">
        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Stripe Balance</p>
        {data.balance ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-2xl font-black text-white">{formatMoney(data.balance.availableCents)}</p>
                <p className="text-white/40 text-xs mt-0.5">Available</p>
              </div>
              <div>
                <p className="text-2xl font-black text-white/60">{formatMoney(data.balance.pendingCents)}</p>
                <p className="text-white/40 text-xs mt-0.5">Pending (3–5 days)</p>
              </div>
            </div>

            {/* Payout result */}
            {payoutResult && (
              <div className={`rounded-xl px-4 py-3 mb-3 text-sm ${
                payoutResult.success
                  ? 'bg-[#C8FF00]/10 border border-[#C8FF00]/20 text-[#C8FF00]'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {payoutResult.success ? (
                  <>
                    <p className="font-bold">✓ Payout initiated — {formatMoney(payoutResult.amountCents ?? 0)}</p>
                    {payoutResult.arrivalDate && (
                      <p className="text-xs mt-0.5 opacity-70">
                        Estimated arrival: {new Date(payoutResult.arrivalDate * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="font-bold">⚠️ {payoutResult.error}</p>
                )}
              </div>
            )}

            {/* Payout button */}
            <button
              onClick={handlePayout}
              disabled={payoutLoading || (data.balance.availableCents ?? 0) < 100 || !!payoutResult?.success}
              className="w-full py-3 rounded-xl text-sm font-black transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(200,255,0,0.3)]"
              style={{ background: '#C8FF00', color: '#000' }}
            >
              {payoutLoading
                ? 'Processing…'
                : payoutResult?.success
                ? '✓ Payout Sent'
                : data.balance.availableCents < 100
                ? 'No Available Balance'
                : `Request Payout — ${formatMoney(data.balance.availableCents)}`}
            </button>
            <p className="text-white/20 text-xs text-center mt-2">Funds arrive in your bank within 2–5 business days</p>
          </>
        ) : (
          <p className="text-white/30 text-sm">Balance unavailable</p>
        )}
      </div>

      {/* Summary stats — 2 cols mobile, 4 cols desktop (includes balance on lg) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="glass p-4 rounded-2xl text-center">
          <p className="text-2xl font-black text-[#C8FF00]">{totalTicketsSold}</p>
          <p className="text-white/40 text-xs mt-1">Tickets sold</p>
        </div>
        <div className="glass p-4 rounded-2xl text-center">
          <p className="text-2xl font-black text-[#C8FF00]">{formatMoney(totalRevenue)}</p>
          <p className="text-white/40 text-xs mt-1">Net revenue</p>
        </div>
        <div className="glass p-4 rounded-2xl text-center">
          <p className="text-2xl font-black text-[#C8FF00]">{totalEvents}</p>
          <p className="text-white/40 text-xs mt-1">Total events</p>
        </div>
        <div className="glass p-4 rounded-2xl text-center">
          <p className="text-2xl font-black text-[#C8FF00]">{avgTicketPrice > 0 ? formatMoney(avgTicketPrice) : '—'}</p>
          <p className="text-white/40 text-xs mt-1">Avg ticket price</p>
        </div>
      </div>

      {/* Events list */}
      <h2 className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3">Your Shows</h2>
      {data.events.length === 0 ? (
        <div className="glass p-6 rounded-2xl text-center">
          <p className="text-white/30 text-sm">No published events yet.</p>
          <a href="/submit" className="text-[#C8FF00] text-sm font-bold mt-2 inline-block">Submit one →</a>
        </div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="hidden lg:block glass rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-[11px] font-bold text-white/30 uppercase tracking-wider px-4 py-3">Event</th>
                  <th className="text-left text-[11px] font-bold text-white/30 uppercase tracking-wider px-4 py-3">Date</th>
                  <th className="text-left text-[11px] font-bold text-white/30 uppercase tracking-wider px-4 py-3">Tickets Sold</th>
                  <th className="text-left text-[11px] font-bold text-white/30 uppercase tracking-wider px-4 py-3">Revenue</th>
                  <th className="text-left text-[11px] font-bold text-white/30 uppercase tracking-wider px-4 py-3">Analytics</th>
                  <th className="text-left text-[11px] font-bold text-white/30 uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-[11px] font-bold text-white/30 uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.events.map(event => {
                  const soldPct = event.totalCapacity > 0 ? (event.totalSold / event.totalCapacity) * 100 : 0
                  const isUpcoming = event.date ? new Date(event.date + 'T00:00:00') >= new Date() : true
                  return (
                    <tr key={event.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {event.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img loading="lazy" decoding="async" src={event.imageUrl} alt={event.name}
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-lg"
                              style={{ background: 'rgba(200,255,0,0.08)' }}>🎵</div>
                          )}
                          <span className="text-white text-sm font-semibold truncate max-w-[180px]">{event.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-sm whitespace-nowrap">
                        {event.date ? formatDate(event.date) : 'TBA'}
                      </td>
                      <td className="px-4 py-3">
                        {event.ticketingEnabled ? (
                          <div className="min-w-[120px]">
                            <div className="flex justify-between text-xs text-white/50 mb-1">
                              <span>{event.totalSold} / {event.totalCapacity}</span>
                              <span>{Math.round(soldPct)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                              <div className="h-full rounded-full transition-all"
                                style={{
                                  width: `${soldPct}%`,
                                  background: soldPct >= 90 ? '#ff4444' : soldPct >= 60 ? '#FFD700' : '#C8FF00',
                                }} />
                            </div>
                          </div>
                        ) : event.status === 'pending' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,200,0,0.12)', color: '#FFD700' }}>Pending approval</span>
                        ) : (
                          <a href={`/organizer/onboarding/${event.id}`} className="text-xs font-bold px-2.5 py-1 rounded-lg transition-all" style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}>+ Set up ticketing</a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#C8FF00] text-sm font-bold">
                        {event.ticketingEnabled ? formatMoney(event.netRevenueCents) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-white/50">
                            <span className="text-white/30">👁</span>
                            {(event.totalViews || 0).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-white/50">
                            <span className="text-white/30">🎟</span>
                            {(event.totalTicketClicks || 0).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                          style={{
                            background: isUpcoming ? 'rgba(200,255,0,0.12)' : 'rgba(255,255,255,0.06)',
                            color: isUpcoming ? '#C8FF00' : 'rgba(255,255,255,0.3)',
                          }}>
                          {isUpcoming ? 'Upcoming' : 'Past'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a href={`/events/festival-${event.id}`}
                            className="px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors font-medium border border-white/10">
                            View
                          </a>
                          <a href={`/organizer/events/${event.id}/tickets`}
                            className="px-2.5 py-1 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/8 transition-colors font-medium border border-white/10">
                            Tiers
                          </a>
                          {event.ticketingEnabled && (
                            <button
                              onClick={() => getScannerLink(event.id)}
                              disabled={scannerLinkState[event.id] === 'loading'}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40"
                              style={scannerLinkState[event.id] === 'copied'
                                ? { background: 'rgba(200,255,0,0.15)', color: '#C8FF00', borderColor: 'rgba(200,255,0,0.4)' }
                                : { color: 'rgba(200,255,0,0.7)', borderColor: 'rgba(200,255,0,0.2)' }}>
                              {scannerLinkState[event.id] === 'loading' ? '…' : scannerLinkState[event.id] === 'copied' ? '✓ Copied!' : '🔗 Scanner'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="flex flex-col gap-3 lg:hidden">
            {data.events.map(event => {
              const soldPct = event.totalCapacity > 0 ? (event.totalSold / event.totalCapacity) * 100 : 0
              const isUpcoming = event.date ? new Date(event.date + 'T00:00:00') >= new Date() : true
              return (
                <div key={event.id} className="glass rounded-2xl overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {event.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img loading="lazy" decoding="async" src={event.imageUrl} alt={event.name}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                          style={{ background: 'rgba(200,255,0,0.08)' }}>🎵</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{event.name}</p>
                        <p className="text-white/40 text-xs mt-0.5">{event.date ? formatDate(event.date) : 'TBA'} · {event.city}</p>
                        {event.ticketingEnabled ? (
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-[#C8FF00] text-xs font-bold">{event.totalSold} sold</span>
                            <span className="text-white/30 text-xs">·</span>
                            <span className="text-white/50 text-xs">{formatMoney(event.netRevenueCents)} net</span>
                          </div>
                        ) : event.status === 'pending' ? (
                          <span className="text-xs mt-1 inline-block font-semibold" style={{ color: '#FFD700' }}>⏳ Pending approval</span>
                        ) : (
                          <a href={`/organizer/onboarding/${event.id}`} className="text-xs font-bold mt-1 inline-block" style={{ color: '#C8FF00' }}>+ Set up ticketing →</a>
                        )}
                        {/* Analytics micro-stats */}
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-white/30">👁 {(event.totalViews || 0).toLocaleString()} views</span>
                          <span className="text-white/15 text-[10px]">·</span>
                          <span className="text-[10px] text-white/30">🎟 {(event.totalTicketClicks || 0).toLocaleString()} clicks</span>
                        </div>
                      </div>
                      {isUpcoming && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}>
                          Upcoming
                        </span>
                      )}
                    </div>

                    {/* Sold out progress bar */}
                    {event.ticketingEnabled && event.totalCapacity > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] text-white/30 mb-1">
                          <span>{event.totalSold} / {event.totalCapacity} tickets</span>
                          <span>{Math.round(soldPct)}% sold</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                          <div className="h-full rounded-full transition-all"
                            style={{
                              width: `${soldPct}%`,
                              background: soldPct >= 90 ? '#ff4444' : soldPct >= 60 ? '#FFD700' : '#C8FF00',
                            }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action row */}
                  <div className="flex border-t border-white/5">
                    <a href={`/events/festival-${event.id}`}
                      className="flex-1 py-3 text-center text-xs text-white/40 hover:text-white/70 transition-colors font-medium">
                      View
                    </a>
                    <div className="w-px bg-white/5" />
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/events/festival-${event.id}`
                        if (navigator.share) {
                          navigator.share({ title: event.name, url })
                        } else {
                          navigator.clipboard?.writeText(url)
                        }
                      }}
                      className="flex-1 py-3 text-center text-xs text-white/40 hover:text-white/70 transition-colors font-medium">
                      Share
                    </button>
                    <div className="w-px bg-white/5" />
                    {event.ticketingEnabled ? (
                      <a href={`/organizer/events/${event.id}/tickets`}
                        className="flex-1 py-3 text-center text-xs text-white/40 hover:text-white/70 transition-colors font-medium">
                        Tiers
                      </a>
                    ) : event.status === 'approved' ? (
                      <a href={`/organizer/onboarding/${event.id}`}
                        className="flex-1 py-3 text-center text-xs font-bold transition-colors"
                        style={{ color: '#C8FF00' }}>
                        Ticketing
                      </a>
                    ) : (
                      <span className="flex-1 py-3 text-center text-xs text-white/20">Pending</span>
                    )}
                    <div className="w-px bg-white/5" />
                    {event.ticketingEnabled ? (
                      <button
                        onClick={() => getScannerLink(event.id)}
                        disabled={scannerLinkState[event.id] === 'loading'}
                        className="flex-1 py-3 text-center text-xs font-medium transition-colors disabled:opacity-40"
                        style={{ color: scannerLinkState[event.id] === 'copied' ? '#C8FF00' : 'rgba(200,255,0,0.7)' }}>
                        {scannerLinkState[event.id] === 'loading' ? '…' : scannerLinkState[event.id] === 'copied' ? '✓ Copied!' : '🔗 Scanner'}
                      </button>
                    ) : (
                      <span className="flex-1 py-3 text-center text-xs text-white/20">Scanner</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      {/* Submit an Event */}
      <a
        href="/submit"
        className="flex items-center justify-between mt-6 p-4 rounded-2xl border border-[#C8FF00]/20 hover:border-[#C8FF00]/40 transition-all group"
        style={{ background: 'rgba(200,255,0,0.05)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(200,255,0,0.12)' }}>
            <svg className="w-4 h-4 text-[#C8FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-sm group-hover:text-[#C8FF00] transition-colors">Submit an Event</p>
            <p className="text-white/30 text-xs">Add a new show or festival to Electric State</p>
          </div>
        </div>
        <svg className="w-4 h-4 text-white/20 group-hover:text-[#C8FF00]/50 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </a>

      {/* Admin shortcut — only visible to site admin */}
      {user?.email === 'caseyolayos@gmail.com' && (
        <a
          href="/admin"
          className="flex items-center justify-between mt-8 p-4 rounded-2xl border border-white/10 hover:border-white/20 transition-colors"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,255,0,0.08)' }}>
              <svg className="w-4 h-4 text-[#C8FF00]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white/70 text-sm font-semibold">Admin Panel</p>
              <p className="text-white/30 text-xs">Manage festival submissions</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      )}
    </div>
  )
}
