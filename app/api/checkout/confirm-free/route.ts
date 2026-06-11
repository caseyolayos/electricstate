import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  let userId: string | null = null
  let userEmail: string | null = null
  if (token) {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await anon.auth.getUser(token)
    if (user) { userId = user.id; userEmail = user.email ?? null }
  }

  const { eventId, items } = await req.json()
  if (!eventId || !items?.length) return NextResponse.json({ error: 'Missing params' }, { status: 400 })

  // Safety: cap total tickets at 20 per order
  const totalQty = items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
  if (totalQty > 20) return NextResponse.json({ error: 'Too many tickets in one order' }, { status: 400 })

  const db = createServerClient()

  // Reserve tickets atomically
  for (const item of items) {
    const { data: reserved } = await db.rpc('reserve_tickets', { p_tier_id: item.tierId, p_quantity: item.quantity })
    if (!reserved) return NextResponse.json({ error: `Sold out for one of your selections` }, { status: 409 })
  }

  const { data: tiers } = await db.from('ticket_tiers').select('id, name, price_cents').in('id', items.map((i: { tierId: string }) => i.tierId))

  const { data: order } = await db.from('orders').insert({
    buyer_id: userId,
    event_id: eventId,
    status: 'completed',
    total_cents: 0,
    platform_fee_cents: 0,
    buyer_email: userEmail || '',
    completed_at: new Date().toISOString(),
  }).select('id').single()

  if (!order) return NextResponse.json({ error: 'Order creation failed' }, { status: 500 })

  const ticketRows = items.flatMap((item: { tierId: string; quantity: number }) => {
    const tier = tiers?.find(t => t.id === item.tierId)
    return Array.from({ length: item.quantity }, () => ({
      order_id: order.id,
      tier_id: item.tierId,
      event_id: eventId,
      buyer_id: userId,
      buyer_email: userEmail || '',
      qr_token: randomUUID(),
      price_cents: 0,
      tier_name: tier?.name ?? '',
    }))
  })

  await db.from('tickets').insert(ticketRows)
  return NextResponse.json({ orderId: order.id })
}
