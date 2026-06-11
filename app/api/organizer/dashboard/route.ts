import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()

  // Fetch organizer profile + events in parallel (first wave)
  // Show ALL submitted events (pending + approved) so organizers can set up ticketing anytime
  const [{ data: organizer }, { data: events }] = await Promise.all([
    db.from('organizer_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single(),
    db.from('festivals')
      .select('id, name, date_start, city, image_url, ticketing_enabled, status')
      .eq('submitted_by', user.id)
      .in('status', ['pending', 'approved'])
      .order('date_start', { ascending: false }),
  ])

  const eventIds = (events || []).map(e => e.id)

  // Fetch tiers, orders, tickets, and Stripe balance all in parallel (second wave)
  const stripePromise = (organizer?.stripe_account_id && organizer?.stripe_onboarding_complete && process.env.STRIPE_SECRET_KEY)
    ? getStripe().balance.retrieve({ stripeAccount: organizer.stripe_account_id } as Parameters<ReturnType<typeof getStripe>['balance']['retrieve']>[0]).catch(() => null)
    : Promise.resolve(null)

  const [{ data: tiers }, { data: orders }, { data: tickets }, { data: analytics }, stripeBalance] = await Promise.all([
    eventIds.length > 0
      ? db.from('ticket_tiers').select('*').in('event_id', eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length > 0
      ? db.from('orders').select('event_id, total_cents, platform_fee_cents, status').in('event_id', eventIds).eq('status', 'completed')
      : Promise.resolve({ data: [] }),
    eventIds.length > 0
      ? db.from('tickets').select('event_id, tier_id').in('event_id', eventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length > 0
      ? db.from('event_analytics').select('event_id, views, ticket_clicks').in('event_id', eventIds)
      : Promise.resolve({ data: [] }),
    stripePromise,
  ])

  // Build per-event stats
  const eventStats = (events || []).map(event => {
    const eventTiers = (tiers || []).filter((t: { event_id: string }) => t.event_id === event.id)
    const eventOrders = (orders || []).filter((o: { event_id: string }) => o.event_id === event.id)
    const eventTickets = (tickets || []).filter((t: { event_id: string }) => t.event_id === event.id)
    const eventAnalytics = (analytics || []).filter((a: { event_id: string }) => a.event_id === event.id)
    const totalSold = eventTickets.length
    const totalCapacity = eventTiers.reduce((s: number, t: { quantity_total: number }) => s + t.quantity_total, 0)
    const grossRevenueCents = eventOrders.reduce((s: number, o: { total_cents: number }) => s + o.total_cents, 0)
    const platformFeeCents = eventOrders.reduce((s: number, o: { platform_fee_cents: number }) => s + o.platform_fee_cents, 0)
    const netRevenueCents = grossRevenueCents - platformFeeCents
    const totalViews = eventAnalytics.reduce((s: number, a: { views: number }) => s + a.views, 0)
    const totalTicketClicks = eventAnalytics.reduce((s: number, a: { ticket_clicks: number }) => s + a.ticket_clicks, 0)
    return {
      id: event.id,
      name: event.name,
      date: event.date_start,
      city: event.city,
      imageUrl: event.image_url,
      ticketingEnabled: event.ticketing_enabled,
      status: event.status,
      totalSold,
      totalCapacity,
      grossRevenueCents,
      netRevenueCents,
      tierCount: eventTiers.length,
      totalViews,
      totalTicketClicks,
    }
  })

  // Parse Stripe balance
  let balance = null
  if (stripeBalance) {
    const available = stripeBalance.available.find((b: { currency: string }) => b.currency === 'usd')
    const pending = stripeBalance.pending.find((b: { currency: string }) => b.currency === 'usd')
    balance = {
      availableCents: available?.amount ?? 0,
      pendingCents: pending?.amount ?? 0,
    }
  }

  return NextResponse.json({
    events: eventStats,
    balance,
    isOnboarded: organizer?.stripe_onboarding_complete ?? false,
  })
}
