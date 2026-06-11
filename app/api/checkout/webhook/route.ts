import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/lib/supabaseServer'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret || !sig) {
    return NextResponse.json({ error: 'Missing webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: unknown) {
    console.error('[webhook] signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data.object as Stripe.Checkout.Session
  const { event_id, user_id, items: itemsJson } = session.metadata || {}

  if (!event_id || !itemsJson) {
    return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
  }

  const items: { tierId: string; quantity: number }[] = JSON.parse(itemsJson)
  const db = createServerClient()
  const stripe = getStripe()

  // Retrieve full session for buyer details
  const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['customer_details'],
  })
  const buyerEmail = fullSession.customer_details?.email || session.customer_email || ''
  const buyerName = fullSession.customer_details?.name || ''

  // Reserve tickets atomically — refund if sold out
  for (const item of items) {
    const { data: reserved } = await db.rpc('reserve_tickets', {
      p_tier_id: item.tierId,
      p_quantity: item.quantity,
    })
    if (!reserved) {
      // Sold out — refund the payment
      if (session.payment_intent) {
        await getStripe().refunds.create({ payment_intent: session.payment_intent as string })
      }
      return NextResponse.json({ error: 'Sold out — refund issued' }, { status: 200 })
    }
  }

  // Get tier details for snapshots
  const tierIds = items.map(i => i.tierId)
  const { data: tiers } = await db.from('ticket_tiers').select('id, name, price_cents, event_id').in('id', tierIds)

  // Create order
  const totalCents = items.reduce((sum, item) => {
    const tier = tiers?.find(t => t.id === item.tierId)
    return sum + (tier?.price_cents || 0) * item.quantity
  }, 0)
  const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 6)
  const platformFeeCents = Math.round(totalCents * PLATFORM_FEE_PERCENT / 100)

  const { data: order, error: orderError } = await db.from('orders').insert({
    buyer_id: user_id || null,
    event_id: event_id,
    stripe_session_id: session.id,
    stripe_payment_intent_id: session.payment_intent as string || null,
    status: 'completed',
    total_cents: totalCents,
    platform_fee_cents: platformFeeCents,
    buyer_email: buyerEmail,
    buyer_name: buyerName,
    completed_at: new Date().toISOString(),
  }).select('id').single()

  if (orderError || !order) {
    console.error('[webhook] order insert error:', orderError)
    return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })
  }

  // Create individual tickets
  const ticketRows = items.flatMap(item => {
    const tier = tiers?.find(t => t.id === item.tierId)
    return Array.from({ length: item.quantity }, () => ({
      order_id: order.id,
      tier_id: item.tierId,
      event_id: event_id,
      buyer_id: user_id || null,
      buyer_email: buyerEmail,
      buyer_name: buyerName,
      qr_token: randomUUID(),
      price_cents: tier?.price_cents || 0,
      tier_name: tier?.name || '',
    }))
  })

  await db.from('tickets').insert(ticketRows)

  return NextResponse.json({ received: true })
}
