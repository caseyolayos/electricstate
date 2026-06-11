'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import QRCode from 'qrcode'

interface Ticket {
  id: string
  tier_name: string
  qr_token: string
  checked_in: boolean
  qr_data_url?: string
}

interface Order {
  id: string
  buyer_email: string
  buyer_name: string
  total_cents: number
  event: { name: string; date_start: string; city: string }
  tickets: Ticket[]
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const paymentIntentId = searchParams.get('payment_intent')
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId && !paymentIntentId && !orderId) { setError('No order ID'); setLoading(false); return }

    async function fetchOrder() {
      // Poll for order (webhook may take a moment)
      for (let i = 0; i < 8; i++) {
        const supabase = createClient()
        if (!supabase) break

        const filterCol = orderId ? 'id' : sessionId ? 'stripe_session_id' : 'stripe_payment_intent_id'
        const filterVal = orderId ?? sessionId ?? paymentIntentId ?? ''
        const { data: orderData } = await supabase
          .from('orders')
          .select(`id, buyer_email, buyer_name, total_cents, event_id,
            tickets(id, tier_name, qr_token, checked_in)`)
          .eq(filterCol, filterVal)
          .eq('status', 'completed')
          .single()

        if (orderData) {
          // Get event info
          const { data: eventData } = await supabase
            .from('festivals')
            .select('name, date_start, city')
            .eq('id', orderData.event_id)
            .single()

          // Generate QR codes
          const ticketsWithQR = await Promise.all(
            (orderData.tickets || []).map(async (t: Ticket) => {
              const qrDataUrl = await QRCode.toDataURL(t.qr_token, {
                width: 200,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' },
              })
              return { ...t, qr_data_url: qrDataUrl }
            })
          )

          setOrder({
            ...orderData,
            event: eventData || { name: 'Event', date_start: '', city: '' },
            tickets: ticketsWithQR,
          })
          setLoading(false)
          return
        }

        await new Promise(r => setTimeout(r, 1500))
      }

      setError('Could not load your tickets. Check your email for confirmation.')
      setLoading(false)
    }

    fetchOrder()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="w-8 h-8 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
        <p className="text-white/40 text-sm">Confirming your tickets...</p>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center">
        <div className="glass p-10">
          <div className="text-5xl mb-4">{'✅'}</div>
          <h2 className="text-2xl font-black text-white mb-2">Payment confirmed!</h2>
          <p className="text-white/50 mb-2">Your tickets will be emailed to you shortly.</p>
          {error && <p className="text-white/30 text-xs">{error}</p>}
          <a href="/" className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
            style={{ background: '#C8FF00', color: '#000' }}>
            Back to home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🎟️</div>
        <h1 className="text-2xl font-black text-white">{"You're in!"}</h1>
        <p className="text-white/50 mt-1 text-sm">
          {order.tickets.length} ticket{order.tickets.length > 1 ? 's' : ''} for{' '}
          <span className="text-white font-semibold">{order.event.name}</span>
        </p>
        {order.event.date_start && (
          <p className="text-white/30 text-xs mt-1">{formatDate(order.event.date_start)} · {order.event.city}</p>
        )}
      </div>

      {/* Order summary */}
      <div className="glass p-4 rounded-2xl mb-4 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-xs">Order total</p>
          <p className="text-white font-bold">{formatMoney(order.total_cents)}</p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs">Confirmation sent to</p>
          <p className="text-white text-sm">{order.buyer_email}</p>
        </div>
      </div>

      {/* Tickets with QR codes */}
      <h2 className="text-xs text-white/40 font-bold uppercase tracking-wider mb-3">Your Tickets</h2>
      <div className="flex flex-col gap-4">
        {order.tickets.map((ticket, i) => (
          <div key={ticket.id} className="glass rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div>
                <p className="text-white font-bold text-sm">{ticket.tier_name}</p>
                <p className="text-white/40 text-xs mt-0.5">Ticket {i + 1} of {order.tickets.length}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}>
                Valid
              </span>
            </div>
            {ticket.qr_data_url && (
              <div className="flex flex-col items-center p-6" style={{ background: '#fff' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ticket.qr_data_url} alt="QR Code" className="w-44 h-44" />
                <p className="text-black/40 text-xs mt-2 font-mono">{ticket.qr_token.slice(0, 8).toUpperCase()}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <p className="text-white/20 text-xs mb-4">Screenshot your QR codes — they work offline at the door.</p>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm"
          style={{ background: '#C8FF00', color: '#000' }}>
          Back to events
        </a>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
