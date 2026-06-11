'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

interface Tier {
  id?: string
  name: string
  description: string
  price_cents: number
  quantity_total: number
  sale_starts_at: string
  sale_ends_at: string
  max_per_order: number
  sort_order: number
}

const BLANK_TIER = (): Tier => ({
  name: '',
  description: '',
  price_cents: 0,
  quantity_total: 100,
  sale_starts_at: '',
  sale_ends_at: '',
  max_per_order: 10,
  sort_order: 0,
})

function formatCents(cents: number) {
  return (cents / 100).toFixed(2)
}

function parseDollars(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

export default function TicketTiersPage() {
  const { user, loading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId

  const [event, setEvent] = useState<{ name: string; date: string } | null>(null)
  const [tiers, setTiers] = useState<Tier[]>([BLANK_TIER()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedIndex, setExpandedIndex] = useState<number>(0)
  const [authToken, setAuthToken] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // Single effect: get token then load event + tiers sequentially (avoids Web Lock race)
  useEffect(() => {
    if (!user || !eventId) return
    async function init() {
      const supabase = createClient()
      if (!supabase) return

      // Token first
      const { data: { session } } = await supabase.auth.getSession()
      setAuthToken(session?.access_token ?? null)

      // Then load event + tiers in sequence on the same client
      const { data: ev } = await supabase
        .from('festivals')
        .select('name, date_start')
        .eq('id', eventId)
        .single()
      if (ev) setEvent({ name: ev.name, date: ev.date_start })

      const { data: existing } = await supabase
        .from('ticket_tiers')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order')
      if (existing && existing.length > 0) setTiers(existing)
    }
    init()
  }, [user, eventId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    )
  }

  function updateTier(index: number, field: keyof Tier, value: string | number) {
    setTiers(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  function addTier() {
    setTiers(prev => [...prev, { ...BLANK_TIER(), sort_order: prev.length }])
    setExpandedIndex(tiers.length)
  }

  function removeTier(index: number) {
    if (tiers.length === 1) return
    setTiers(prev => prev.filter((_, i) => i !== index).map((t, i) => ({ ...t, sort_order: i })))
    setExpandedIndex(Math.max(0, index - 1))
  }

  async function handleSave() {
    setError(null)
    for (const t of tiers) {
      if (!t.name) { setError('Each tier needs a name'); return }
      if (t.price_cents < 0) { setError('Price cannot be negative'); return }
      if (t.quantity_total < 1) { setError('Quantity must be at least 1'); return }
    }

    setSaving(true)
    try {
      const token = authToken
      if (!token) throw new Error('Not logged in — please refresh and try again')

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      let res: Response
      try {
        res = await fetch('/api/organizer/tiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ eventId, tiers }),
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeout)
      }
      const data = await res!.json()
      if (!res!.ok) throw new Error(data.error || 'Failed to save')

      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors'
  const inputStyle = { background: 'rgba(255,255,255,0.05)' }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-52">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-white/40 text-sm hover:text-white/70 transition-colors mb-4">
          Back
        </button>
        <h1 className="text-2xl font-black text-white">Ticket Tiers</h1>
        {event && (
          <p className="text-white/40 mt-1 text-sm">{event.name}</p>
        )}
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {tiers.map((tier, index) => (
          <div key={index} className="glass rounded-2xl overflow-hidden">
            {/* Tier header — tap to expand */}
            <button
              type="button"
              onClick={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <div>
                <p className="text-white font-bold text-sm">
                  {tier.name || <span className="text-white/30">Untitled tier</span>}
                </p>
                <p className="text-white/40 text-xs mt-0.5">
                  {tier.price_cents === 0 ? 'Free' : `$${formatCents(tier.price_cents)}`}
                  {' · '}{tier.quantity_total} tickets
                </p>
              </div>
              <div className="flex items-center gap-3">
                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); removeTier(index) }}
                    className="text-white/20 hover:text-red-400 transition-colors text-lg leading-none"
                  >
                    ×
                  </button>
                )}
                <span className="text-white/30 text-sm">{expandedIndex === index ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Expanded form */}
            {expandedIndex === index && (
              <div className="px-4 pb-5 flex flex-col gap-4 border-t border-white/5 pt-4">
                <div>
                  <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Tier Name *</label>
                  <input
                    value={tier.name}
                    onChange={e => updateTier(index, 'name', e.target.value)}
                    placeholder="e.g. General Admission, VIP, Early Bird"
                    className={inputClass} style={inputStyle}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Description</label>
                  <input
                    value={tier.description}
                    onChange={e => updateTier(index, 'description', e.target.value)}
                    placeholder="What's included?"
                    className={inputClass} style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Price</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
                      <input
                        key={`price-${index}-${expandedIndex}`}
                        defaultValue={tier.price_cents === 0 ? '' : formatCents(tier.price_cents)}
                        onBlur={e => updateTier(index, 'price_cents', parseDollars(e.target.value))}
                        placeholder="0.00"
                        inputMode="decimal"
                        className={`${inputClass} pl-8`} style={inputStyle}
                      />
                    </div>
                    <p className="text-white/20 text-xs mt-1">Leave blank for free</p>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Quantity</label>
                    <input
                      value={tier.quantity_total}
                      onChange={e => updateTier(index, 'quantity_total', parseInt(e.target.value) || 0)}
                      type="number" min="1" inputMode="numeric"
                      className={inputClass} style={inputStyle}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Max per order</label>
                  <input
                    value={tier.max_per_order}
                    onChange={e => updateTier(index, 'max_per_order', parseInt(e.target.value) || 1)}
                    type="number" min="1" max="20" inputMode="numeric"
                    className={inputClass} style={inputStyle}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Sale starts</label>
                    <input
                      type="datetime-local"
                      value={tier.sale_starts_at}
                      onChange={e => updateTier(index, 'sale_starts_at', e.target.value)}
                      className={inputClass} style={{ ...inputStyle, colorScheme: 'dark' }}
                    />
                    <p className="text-white/20 text-xs mt-1">Leave blank for immediate</p>
                  </div>
                  <div>
                    <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Sale ends</label>
                    <input
                      type="datetime-local"
                      value={tier.sale_ends_at}
                      onChange={e => updateTier(index, 'sale_ends_at', e.target.value)}
                      className={inputClass} style={{ ...inputStyle, colorScheme: 'dark' }}
                    />
                    <p className="text-white/20 text-xs mt-1">Leave blank for event day</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add tier */}
      <button
        type="button"
        onClick={addTier}
        className="w-full py-3 rounded-xl text-sm font-bold border-2 border-dashed transition-all hover:border-white/30 mb-6"
        style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)' }}
      >
        + Add another tier
      </button>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/30"
          style={{ background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

      {/* Save */}
      <div className="fixed bottom-20 md:bottom-0 left-0 right-0 px-4 py-4 max-w-lg mx-auto"
        style={{ background: 'linear-gradient(to top, #000 60%, transparent)' }}>
        {saved ? (
          <div className="flex flex-col gap-2">
            <a
              href={`/events/festival-${eventId}`}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: '#C8FF00', color: '#000' }}
            >
              View event page →
            </a>
            <button
              onClick={handleSave}
              className="w-full py-3 rounded-xl font-bold text-sm border border-white/20 text-white/60 hover:text-white transition-all"
            >
              Edit tiers
            </button>
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-60 transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            {saving ? 'Saving…' : 'Save ticket tiers'}
          </button>
        )}
      </div>
    </div>
  )
}
