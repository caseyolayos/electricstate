import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')?.replace('Bearer ', '')
  const body = await req.json()
  const { qrToken, scannerToken } = body

  if (!qrToken) return NextResponse.json({ status: 'invalid' })

  const db = createServerClient()

  // Look up the ticket
  const { data: ticket } = await db
    .from('tickets')
    .select('id, tier_name, buyer_name, checked_in, checked_in_at, event_id')
    .eq('qr_token', qrToken)
    .single()

  if (!ticket) return NextResponse.json({ status: 'invalid' })

  // Look up the event
  const { data: event } = await db
    .from('festivals')
    .select('name, submitted_by, scanner_token')
    .eq('id', ticket.event_id)
    .single()

  if (!event) return NextResponse.json({ status: 'invalid' })

  // Auth: either organizer bearer token OR valid scanner token
  let authorized = false

  if (scannerToken) {
    // Scanner link auth — validate token matches this event
    authorized = !!(event.scanner_token && event.scanner_token === scannerToken)
  } else if (authHeader) {
    // Organizer auth — validate bearer token
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await anon.auth.getUser(authHeader)
    authorized = !!(user && event.submitted_by === user.id)
  }

  if (!authorized) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 })
  }

  if (ticket.checked_in) {
    return NextResponse.json({
      status: 'already_used',
      tierName: ticket.tier_name,
      eventName: event.name,
      checkedInAt: ticket.checked_in_at,
    })
  }

  // Mark as checked in
  await db.from('tickets').update({
    checked_in: true,
    checked_in_at: new Date().toISOString(),
  }).eq('id', ticket.id)

  return NextResponse.json({
    status: 'valid',
    ticketId: ticket.id,
    tierName: ticket.tier_name,
    buyerName: ticket.buyer_name || '',
    eventName: event.name,
  })
}
