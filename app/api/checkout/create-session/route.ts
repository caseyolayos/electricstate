import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 6)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://electric-state.vercel.app'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

interface Item { tierId: string; quantity: number }

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  // Auth — optional (guest checkout supported)
  let userId: string | null = null
  let userEmail: string | null = null
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (token) {
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user } } = await anonClient.auth.getUser(token)
    if (user) { userId = user.id; userEmail = user.email ?? null }
  }

  const { eventId, items }: { eventId: string; items: Item[] } = await req.json()
  if (!eventId || !items?.length) {
    return NextResponse.json({ error: 'Missing eventId or items' }, { status: 400 })
  }

  const db = createServerClient()
  const stripe = getStripe()

  // Validate tiers and build line items
  const tierIds = items.map(i => i.tierId)
  const { data: tiers } = await db
    .from('ticket_tiers')
    .select('id, name, price_cents, quantity_total, quantity_sold, max_per_order, event_id')
    .in('id', tierIds)

  if (!tiers?.length) return NextResponse.json({ error: 'Tiers not found' }, { status: 404 })

  // Check availability
  for (const item of items) {
    const tier = tiers.find(t => t.id === item.tierId)
    if (!tier) return NextResponse.json({ error: `Tier not found: ${item.tierId}` }, { status: 404 })
    const available = tier.quantity_total - tier.quantity_sold
    if (item.quantity > available) {
      return NextResponse.json({ error: `Only ${available} tickets left for ${tier.name}` }, { status: 400 })
    }
    if (item.quantity > tier.max_per_order) {
      return NextResponse.json({ error: `Max ${tier.max_per_order} tickets per order for ${tier.name}` }, { status: 400 })
    }
  }

  // Get organizer Stripe account for transfer
  const festivalId = eventId.replace('festival-', '')
  const { data: festival } = await db
    .from('festivals')
    .select('id, name, submitted_by')
    .eq('id', festivalId)
    .single()

  let organizerStripeAccountId: string | null = null
  if (festival?.submitted_by) {
    const { data: organizer } = await db
      .from('organizer_profiles')
      .select('stripe_account_id')
      .eq('id', festival.submitted_by)
      .single()
    organizerStripeAccountId = organizer?.stripe_account_id ?? null
  }

  // Build Stripe line items
  const lineItems = items.map(item => {
    const tier = tiers.find(t => t.id === item.tierId)!
    return {
      price_data: {
        currency: 'usd',
        product_data: {
          name: `${tier.name}${festival?.name ? ` — ${festival.name}` : ''}`,
        },
        unit_amount: tier.price_cents,
      },
      quantity: item.quantity,
    }
  })

  const totalCents = items.reduce((sum, item) => {
    const tier = tiers.find(t => t.id === item.tierId)!
    return sum + tier.price_cents * item.quantity
  }, 0)

  const platformFeeCents = Math.max(100, Math.round(totalCents * PLATFORM_FEE_PERCENT / 100))

  // Create Stripe Checkout Session
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: lineItems,
    success_url: `${APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/events/${eventId}`,
    customer_email: userEmail ?? undefined,
    metadata: {
      event_id: festivalId,
      user_id: userId ?? '',
      items: JSON.stringify(items),
    },
  }

  // Add platform fee + transfer if organizer has a connected Stripe account
  if (organizerStripeAccountId && totalCents > 0) {
    sessionParams.payment_intent_data = {
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: organizerStripeAccountId },
    }
  }

  let session: Stripe.Checkout.Session
  try {
    session = await stripe.checkout.sessions.create(sessionParams)
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; param?: string }
    console.error('[create-session] Stripe error:', JSON.stringify(e))

    // If the transfer/fee setup failed, retry without it (account not ready / capabilities pending)
    const isAccountError = e?.message?.includes('pattern') ||
      e?.message?.includes('destination account') ||
      e?.message?.includes('capabilities') ||
      e?.message?.includes('transfers') ||
      e?.code === 'account_invalid'
    if (sessionParams.payment_intent_data && isAccountError) {
      console.log('[create-session] Retrying without transfer_data')
      delete sessionParams.payment_intent_data
      session = await stripe.checkout.sessions.create(sessionParams)
    } else {
      return NextResponse.json({ error: e?.message || 'Stripe error', code: e?.code, param: e?.param }, { status: 500 })
    }
  }
  return NextResponse.json({ url: session.url, sessionId: session.id })
}
