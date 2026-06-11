import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // Verify auth
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId, tiers } = await req.json()
  if (!eventId || !Array.isArray(tiers)) {
    return NextResponse.json({ error: 'Missing eventId or tiers' }, { status: 400 })
  }

  // Use service role to bypass RLS
  const db = createServerClient()

  // Verify the user owns this event (submitted_by matches, or fall back to organizer_profiles)
  const { data: event } = await db
    .from('festivals')
    .select('id, submitted_by')
    .eq('id', eventId)
    .single()

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  // Allow if submitted_by matches, or if submitted_by is null and user has an organizer profile
  // (handles events submitted before submitted_by was tracked)
  const isOwner = event.submitted_by === user.id
  if (!isOwner && event.submitted_by !== null) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (!isOwner && event.submitted_by === null) {
    // Check if they have an organizer profile (they went through onboarding)
    const { data: org } = await db
      .from('organizer_profiles')
      .select('id')
      .eq('id', user.id)
      .single()
    if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    // Opportunistically fix the submitted_by field
    await db.from('festivals').update({ submitted_by: user.id }).eq('id', eventId)
  }

  // Delete existing tiers and re-insert
  await db.from('ticket_tiers').delete().eq('event_id', eventId)

  const rows = tiers.map((t: {
    name: string; description?: string; price_cents: number;
    quantity_total: number; sale_starts_at?: string; sale_ends_at?: string;
    max_per_order: number; sort_order: number;
  }, i: number) => ({
    event_id: eventId,
    name: t.name,
    description: t.description || null,
    price_cents: t.price_cents,
    quantity_total: t.quantity_total,
    quantity_sold: 0,
    sale_starts_at: t.sale_starts_at || null,
    sale_ends_at: t.sale_ends_at || null,
    max_per_order: t.max_per_order,
    sort_order: i,
  }))

  const { error: insertError } = await db.from('ticket_tiers').insert(rows)
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Enable ticketing and auto-approve the event (organizer verified via Stripe)
  await db.from('festivals')
    .update({ ticketing_enabled: true, status: 'approved' })
    .eq('id', eventId)

  return NextResponse.json({ success: true })
}
