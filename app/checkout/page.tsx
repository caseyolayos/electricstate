'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface CartItem { tierId: string; tierName: string; quantity: number; priceCents: number }

function formatMoney(cents: number) { return `$${(cents / 100).toFixed(2)}` }

function PaymentForm({ clientSecret, totalCents, eventId, buyerEmail, onSuccess }: {
  clientSecret: string
  totalCents: number
  eventId: string
  buyerEmail: string
  onSuccess: (paymentIntentId: string) => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setError(null)

    const { error: submitError } = await elements.submit()
    if (submitError) { setError(submitError.message ?? 'Payment failed'); setPaying(false); return }

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: { receipt_email: buyerEmail },
    })

    if (confirmError) {
      setError(confirmError.message ?? 'Payment failed')
      setPaying(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess(paymentIntent.id)
    } else {
      setError('Payment incomplete. Please try again.')
      setPaying(false)
    }
  }

  return (
    <form onSubmit={handlePay} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/30"
          style={{ background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={paying || !stripe}
        className="w-full py-4 rounded-xl font-bold text-sm transition-all disabled:opacity-60 hover:opacity-90 active:scale-95"
        style={{ background: '#C8FF00', color: '#000' }}
      >
        {paying ? 'Processing…' : `Pay ${formatMoney(totalCents)}`}
      </button>
    </form>
  )
}

function CheckoutContent() {
  const { user, loading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventId = searchParams.get('event') || ''

  const [cart, setCart] = useState<CartItem[]>([])
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [totalCents, setTotalCents] = useState(0)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [tokenReady, setTokenReady] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const initRef = useRef(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    // Load cart from localStorage
    try {
      const stored = localStorage.getItem('es_cart')
      if (stored) setCart(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  // Get token once at mount — separate from init to avoid Web Lock contention
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    if (!supabase) { setTokenReady(true); return }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token ?? null)
      setTokenReady(true)
    }).catch(() => setTokenReady(true))
  }, [user])

  useEffect(() => {
    if (!user || !cart.length || !tokenReady || initRef.current) return
    initRef.current = true
    async function init() {
      const token = authToken
      const items = cart.map(c => ({ tierId: c.tierId, quantity: c.quantity }))
      try {
        const res = await fetch('/api/checkout/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ eventId, items }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'Failed to initialize payment'); setInitializing(false); return }
        if (data.free) {
          // Free tickets — create order without payment
          const festivalId = eventId.replace('festival-', '')
          const freeRes = await fetch('/api/checkout/confirm-free', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ eventId: festivalId, items }),
          })
          const freeData = await freeRes.json()
          if (!freeRes.ok) { setError(freeData.error || 'Failed'); setInitializing(false); return }
          localStorage.removeItem('es_cart')
          router.replace(`/checkout/success?order_id=${freeData.orderId}`)
          return
        }
        setClientSecret(data.clientSecret)
        setTotalCents(data.totalCents)
        setInitializing(false)
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setInitializing(false)
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cart, eventId, tokenReady])

  async function handlePaymentSuccess(paymentIntentId: string) {
    setConfirming(true)
    try {
      const res = await fetch('/api/checkout/confirm-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ paymentIntentId, buyerEmail: user?.email ?? '', buyerName: '' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      localStorage.removeItem('es_cart')
      router.replace(`/checkout/success?payment_intent=${paymentIntentId}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to confirm order')
      setConfirming(false)
    }
  }

  if (loading || initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
        <p className="text-white/30 text-sm">Setting up payment…</p>
      </div>
    )
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
        <p className="text-white/30 text-sm">Confirming your tickets…</p>
      </div>
    )
  }

  const total = cart.reduce((s, c) => s + c.priceCents * c.quantity, 0)

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-white/40 text-sm hover:text-white/70 transition-colors mb-4">
          Back
        </button>
        <h1 className="text-2xl font-black text-white">Checkout</h1>
      </div>

      {/* Order summary */}
      <div className="glass p-4 rounded-2xl mb-6">
        <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Order summary</p>
        {cart.map(item => (
          <div key={item.tierId} className="flex items-center justify-between py-1.5">
            <div>
              <p className="text-white text-sm">{item.tierName}</p>
              <p className="text-white/40 text-xs">x{item.quantity}</p>
            </div>
            <p className="text-white text-sm font-bold">
              {item.priceCents === 0 ? 'Free' : formatMoney(item.priceCents * item.quantity)}
            </p>
          </div>
        ))}
        <div className="border-t border-white/10 mt-3 pt-3 flex items-center justify-between">
          <p className="text-white font-bold">Total</p>
          <p className="text-white font-bold">{total === 0 ? 'Free' : formatMoney(total)}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/30"
          style={{ background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}

      {/* Stripe Elements */}
      {clientSecret && stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: {
                colorPrimary: '#C8FF00',
                colorBackground: '#111111',
                colorText: '#ffffff',
                colorDanger: '#ff4444',
                borderRadius: '12px',
                fontFamily: 'inherit',
              },
            },
          }}
        >
          <PaymentForm
            clientSecret={clientSecret}
            totalCents={totalCents}
            eventId={eventId}
            buyerEmail={user?.email ?? ''}
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  )
}
