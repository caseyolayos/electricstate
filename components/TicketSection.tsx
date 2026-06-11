'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

interface Tier {
  id: string
  name: string
  description: string | null
  price_cents: number
  quantity_total: number
  quantity_sold: number
  sale_starts_at: string | null
  sale_ends_at: string | null
  max_per_order: number
  sort_order: number
}

interface Props {
  eventId: string  // the full event id, e.g. "festival-abc123"
}

function formatPrice(cents: number) {
  if (cents === 0) return 'Free'
  return `$${(cents / 100).toFixed(2)}`
}

export default function TicketSection({ eventId }: Props) {
  const [tiers, setTiers] = useState<Tier[]>([])
  const [loading, setLoading] = useState(true)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [checkingOut, setCheckingOut] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Extract the raw UUID from "festival-{uuid}"
  const festivalId = eventId.replace('festival-', '')

  // Get auth token once at mount — avoids Web Lock contention on click
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token ?? null)
    })
  }, [])

  useEffect(() => {
    async function fetchTiers() {
      const supabase = createClient()
      if (!supabase) { setLoading(false); return }
      const { data } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', festivalId)
        .order('sort_order')
      setTiers(data || [])
      setLoading(false)
    }
    fetchTiers()
  }, [festivalId])

  if (loading) return null
  if (tiers.length === 0) return null

  const now = new Date()
  const availableTiers = tiers.filter(t => {
    const available = t.quantity_total - t.quantity_sold
    if (available <= 0) return false
    if (t.sale_starts_at && new Date(t.sale_starts_at) > now) return false
    if (t.sale_ends_at && new Date(t.sale_ends_at) < now) return false
    return true
  })

  const totalCents = Object.entries(quantities).reduce((sum, [tierId, qty]) => {
    const tier = tiers.find(t => t.id === tierId)
    return sum + (tier ? tier.price_cents * qty : 0)
  }, 0)

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0)

  function setQty(tierId: string, delta: number, max: number) {
    setQuantities(prev => {
      const current = prev[tierId] || 0
      const next = Math.min(Math.max(0, current + delta), max)
      if (next === 0) {
        const { [tierId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [tierId]: next }
    })
  }

  async function handleCheckout() {
    if (totalTickets === 0) return
    setCheckingOut(true)
    // Fire ticket click analytics (fire-and-forget)
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: festivalId, type: 'ticket_click' }),
    }).catch(() => {})
    try {
      // Store cart in localStorage and navigate to in-app checkout
      const cart = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([tierId, qty]) => {
          const tier = tiers.find(t => t.id === tierId)!
          return { tierId, tierName: tier.name, quantity: qty, priceCents: tier.price_cents }
        })
      localStorage.setItem('es_cart', JSON.stringify(cart))
      window.location.href = `/checkout?event=${encodeURIComponent(eventId)}`
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Checkout failed')
      setCheckingOut(false)
    }
  }

  return (
    <div className="glass p-5 mb-4">
      <h2 className="font-bold text-white mb-3 text-sm uppercase tracking-wider text-white/50">
        Tickets
      </h2>

      <div className="flex flex-col gap-3 mb-4">
        {tiers.map(tier => {
          const available = tier.quantity_total - tier.quantity_sold
          const isSoldOut = available <= 0
          const notOnSaleYet = tier.sale_starts_at ? new Date(tier.sale_starts_at) > now : false
          const saleEnded = tier.sale_ends_at ? new Date(tier.sale_ends_at) < now : false
          const unavailable = isSoldOut || notOnSaleYet || saleEnded
          const qty = quantities[tier.id] || 0

          return (
            <div
              key={tier.id}
              className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
            >
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white text-sm font-semibold">{tier.name}</p>
                  {isSoldOut && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }}>
                      Sold out
                    </span>
                  )}
                </div>
                {tier.description && (
                  <p className="text-white/40 text-xs mt-0.5">{tier.description}</p>
                )}
                <p className="text-[#C8FF00] text-sm font-bold mt-1">{formatPrice(tier.price_cents)}</p>
                {!unavailable && available <= 20 && (
                  <p className="text-orange-400 text-xs mt-0.5">Only {available} left</p>
                )}
              </div>

              {/* Quantity stepper */}
              {unavailable ? (
                <div className="text-white/20 text-xs">
                  {notOnSaleYet ? 'Not on sale yet' : saleEnded ? 'Sale ended' : ''}
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setQty(tier.id, -1, tier.max_per_order)}
                    disabled={qty === 0}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all disabled:opacity-20"
                    style={{ background: qty > 0 ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.05)', color: qty > 0 ? '#C8FF00' : 'rgba(255,255,255,0.3)' }}
                  >
                    −
                  </button>
                  <span className="text-white font-bold text-sm w-5 text-center">{qty}</span>
                  <button
                    onClick={() => setQty(tier.id, 1, Math.min(tier.max_per_order, available))}
                    disabled={qty >= Math.min(tier.max_per_order, available)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold transition-all disabled:opacity-20"
                    style={{ background: 'rgba(200,255,0,0.15)', color: '#C8FF00' }}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {availableTiers.length === 0 && (
        <p className="text-white/30 text-sm text-center py-2">No tickets currently available</p>
      )}

      {totalTickets > 0 && (
        <button
          onClick={handleCheckout}
          disabled={checkingOut}
          className="w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000' }}
        >
          {checkingOut ? 'Loading…' : `Buy ${totalTickets} ticket${totalTickets > 1 ? 's' : ''} · ${totalCents === 0 ? 'Free' : `$${(totalCents / 100).toFixed(2)}`}`}
        </button>
      )}
    </div>
  )
}
