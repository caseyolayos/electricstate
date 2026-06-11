'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

interface Ticket {
  id: string
  tier_name: string
  qr_token: string
  checked_in: boolean
  price_cents: number
  created_at: string
  event_id: string
  event: { name: string; date_start: string; city: string }
  qr_data_url: string | null  // pre-generated, null = failed
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

async function generateQR(token: string): Promise<string | null> {
  try {
    // Dynamic import to avoid SSR issues with qrcode package
    const QRCode = (await import('qrcode')).default
    return await QRCode.toDataURL(token, {
      width: 220, margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
  } catch {
    return null
  }
}

export default function MyTickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    async function load() {
      try {
        const supabase = createClient()
        if (!supabase) return

        const { data, error } = await supabase
          .from('tickets')
          .select('id, tier_name, qr_token, checked_in, price_cents, created_at, event_id')
          .eq('buyer_id', user!.id)
          .order('created_at', { ascending: false })

        if (error || !data?.length) return

        // Fetch event details
        const eventIds = Array.from(new Set(data.map(t => t.event_id)))
        const { data: events } = await supabase
          .from('festivals')
          .select('id, name, date_start, city')
          .in('id', eventIds)
        const eventMap: Record<string, { name: string; date_start: string; city: string }> =
          Object.fromEntries((events || []).map(e => [e.id, e]))

        // Pre-generate all QR codes in parallel
        const qrResults = await Promise.allSettled(
          data.map(t => generateQR(t.qr_token))
        )

        const enriched: Ticket[] = data.map((t, i) => ({
          ...t,
          event: eventMap[t.event_id] ?? { name: 'Event', date_start: '', city: '' },
          qr_data_url: qrResults[i].status === 'fulfilled' ? qrResults[i].value : null,
        }))

        setTickets(enriched)
      } catch {
        // Fail silently — section just won't show
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  // Show nothing while loading or if no tickets
  if (loading || !tickets.length) return null

  // Group by event
  const byEvent: Record<string, { event: Ticket['event']; tickets: Ticket[] }> = {}
  for (const t of tickets) {
    if (!byEvent[t.event_id]) byEvent[t.event_id] = { event: t.event, tickets: [] }
    byEvent[t.event_id].tickets.push(t)
  }

  return (
    <section className="mb-6">
      <h2 className="font-black text-white text-lg mb-3">My Tickets</h2>
      <div className="flex flex-col gap-3">
        {Object.entries(byEvent).map(([eventId, { event, tickets: eventTickets }]) => (
          <div key={eventId} className="glass rounded-2xl overflow-hidden">
            {/* Event header */}
            <div className="px-4 py-3 border-b border-white/5">
              <p className="text-white font-bold text-sm">{event.name}</p>
              <p className="text-white/40 text-xs mt-0.5">
                {event.date_start ? formatDate(event.date_start) : 'Date TBA'}
                {event.city ? ` · ${event.city}` : ''}
              </p>
            </div>

            {/* Individual tickets */}
            {eventTickets.map((ticket, i) => (
              <div key={ticket.id} className="border-b border-white/5 last:border-0">
                {/* Ticket row — tap to show/hide QR */}
                <button
                  onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white/20 text-xs font-mono w-5 text-center">{i + 1}</span>
                    <div>
                      <p className="text-white text-sm">{ticket.tier_name}</p>
                      {ticket.checked_in && (
                        <p className="text-green-400 text-xs mt-0.5">Checked in</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                      style={ticket.checked_in
                        ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }
                        : { background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}
                    >
                      {ticket.checked_in ? 'Used' : 'Valid'}
                    </span>
                    <span className="text-white/30 text-xs">
                      {expandedId === ticket.id ? '▲' : '▼'}
                    </span>
                  </div>
                </button>

                {/* QR code — pre-generated, instant display */}
                {expandedId === ticket.id && (
                  <div
                    className="flex flex-col items-center py-6"
                    style={{ background: ticket.checked_in ? 'rgba(34,197,94,0.06)' : '#fff' }}
                  >
                    {ticket.qr_data_url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={ticket.qr_data_url}
                          alt="Ticket QR Code"
                          className="w-48 h-48"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <p className="text-black/30 text-xs mt-2 font-mono tracking-widest">
                          {ticket.qr_token.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-black/25 text-xs mt-1">Show this at the door</p>
                        {ticket.checked_in && (
                          <p className="text-green-600 text-xs font-bold mt-2">This ticket has been used</p>
                        )}
                      </>
                    ) : (
                      // QR generation failed — show token as text fallback
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="w-48 h-48 flex flex-col items-center justify-center rounded-xl bg-black/5 gap-2">
                          <p className="text-black/40 text-xs text-center px-4">
                            QR unavailable — show this code at the door:
                          </p>
                          <p className="text-black font-mono font-bold text-sm tracking-wider">
                            {ticket.qr_token.slice(0, 8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
