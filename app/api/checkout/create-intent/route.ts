import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 6)

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

interface Item { tierId: string; quantity: number }

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  let userId: string | null = null
  let userEmail: string | null = null
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token) {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await anon.auth.getUser(token)
    if (user) { userId = user.id; userEmail = user.email ?? null }
  }

  const { eventId, items }: { eventId: string; items: Item[] } = await req.json()
  if (!eventId || !items?.length) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  const db = createServerClient()
  const stripe = getStripe()
  const festivalId = eventId.replace('festival-', '')

  // Validate tiers
  const { data: tiers } = await db
    .from('ticket_tiers')
    .select('id, name, price_cents, quantity_total, quantity_sold, max_per_order')
    .in('id', items.map(i => i.tierId))

  for (const item of items) {
    const tier = tiers?.find(t => t.id === item.tierId)
    if (!tier) return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
    const available = tier.quantity_total - tier.quantity_sold
    if (item.quantity > available) return NextResponse.json({ error: `Only ${available} left for "${tier.name}"` }, { status: 400 })
    if (item.quantity > tier.max_per_order) return NextResponse.json({ error: `Max ${tier.max_per_order} per order for "${tier.name}"` }, { status: 400 })
  }

  const totalCents = items.reduce((sum, item) => {
    const tier = tiers?.find(t => t.id === item.tierId)!
    return sum + tier.price_cents * item.quantity
  }, 0)

  if (totalCents === 0) {
    // Free tickets — no payment needed, handle directly
    return NextResponse.json({ free: true })
  }

  const platformFeeCents = Math.max(100, Math.round(totalCents * PLATFORM_FEE_PERCENT / 100))

  // Get organizer Stripe account for transfer
  const { data: festival } = await db.from('festivals').select('submitted_by').eq('id', festivalId).single()
  let transferAccount: string | null = null
  if (festival?.submitted_by) {
    const { data: org } = await db.from('organizer_profiles').select('stripe_account_id, stripe_onboarding_complete').eq('id', festival.submitted_by).single()
    if (org?.stripe_onboarding_complete && org?.stripe_account_id) {
      transferAccount = org.stripe_account_id
    }
  }

  const intentParams: Stripe.PaymentIntentCreateParams = {
    amount: totalCents,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
    metadata: {
      event_id: festivalId,
      user_id: userId ?? '',
      items: JSON.stringify(items),
    },
    receipt_email: userEmail ?? undefined,
  }

  if (transferAccount) {
    try {
      intentParams.application_fee_amount = platformFeeCents
      intentParams.transfer_data = { destination: transferAccount }
    } catch { /* skip transfer if account not ready */ }
  }

  try {
    const intent = await stripe.paymentIntents.create(intentParams)
    return NextResponse.json({ clientSecret: intent.client_secret, totalCents })
  } catch (err: unknown) {
    const e = err as { message?: string }
    // If transfer setup fails, retry without it
    if (intentParams.transfer_data) {
      delete intentParams.application_fee_amount
      delete intentParams.transfer_data
      const intent = await stripe.paymentIntents.create(intentParams)
      return NextResponse.json({ clientSecret: intent.client_secret, totalCents })
    }
    return NextResponse.json({ error: e?.message || 'Stripe error' }, { status: 500 })
  }
}
