import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  let userId: string | null = null
  let userEmail: string | null = null
  if (token) {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await anon.auth.getUser(token)
    if (user) { userId = user.id; userEmail = user.email ?? null }
  }

  const { paymentIntentId, buyerEmail, buyerName } = await req.json()
  if (!paymentIntentId) return NextResponse.json({ error: 'Missing paymentIntentId' }, { status: 400 })

  const stripe = getStripe()
  const db = createServerClient()

  // Verify payment succeeded
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId)
  if (intent.status !== 'succeeded') {
    return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
  }

  // Check if order already exists (idempotency)
  const { data: existing } = await db.from('orders').select('id').eq('stripe_payment_intent_id', paymentIntentId).single()
  if (existing) return NextResponse.json({ orderId: existing.id })

  const { event_id, items: itemsJson } = intent.metadata
  const items: { tierId: string; quantity: number }[] = JSON.parse(itemsJson)
  const email = buyerEmail || userEmail || intent.receipt_email || ''
  const name = buyerName || ''

  // Reserve tickets atomically
  for (const item of items) {
    const { data: reserved } = await db.rpc('reserve_tickets', { p_tier_id: item.tierId, p_quantity: item.quantity })
    if (!reserved) {
      await stripe.refunds.create({ payment_intent: paymentIntentId })
      return NextResponse.json({ error: 'Sold out — refund issued' }, { status: 409 })
    }
  }

  const { data: tiers } = await db.from('ticket_tiers').select('id, name, price_cents').in('id', items.map(i => i.tierId))

  const totalCents = intent.amount
  const platformFeeCents = intent.application_fee_amount ?? 0

  const { data: order } = await db.from('orders').insert({
    buyer_id: userId,
    event_id: event_id,
    stripe_payment_intent_id: paymentIntentId,
    status: 'completed',
    total_cents: totalCents,
    platform_fee_cents: platformFeeCents,
    buyer_email: email,
    buyer_name: name,
    completed_at: new Date().toISOString(),
  }).select('id').single()

  if (!order) return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })

  const ticketRows = items.flatMap(item => {
    const tier = tiers?.find(t => t.id === item.tierId)
    return Array.from({ length: item.quantity }, () => ({
      order_id: order.id,
      tier_id: item.tierId,
      event_id: event_id,
      buyer_id: userId,
      buyer_email: email,
      buyer_name: name,
      qr_token: randomUUID(),
      price_cents: tier?.price_cents ?? 0,
      tier_name: tier?.name ?? '',
    }))
  })

  await db.from('tickets').insert(ticketRows)
  return NextResponse.json({ orderId: order.id })
}
