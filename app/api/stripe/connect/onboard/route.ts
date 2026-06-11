import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://electric-state.vercel.app'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY to environment variables.' }, { status: 500 })
  }
  const stripe = getStripe()

  // Read auth token from Authorization header (client sends it explicitly)
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify the JWT with Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const eventId = body.event_id

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event_id' }, { status: 400 })
  }

  // Use service role for DB queries (the user-aware client is anon key, RLS blocks reads)
  const { createServerClient: createServiceClient } = await import('@/lib/supabaseServer')
  const db = createServiceClient()

  // Confirm event belongs to this user
  const { data: event } = await db
    .from('festivals')
    .select('id, name, submitted_by')
    .eq('id', eventId)
    .single()

  if (!event || event.submitted_by !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  // Get or create their Stripe Connect account
  let stripeAccountId: string

  const { data: organizer } = await db
    .from('organizer_profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  try {
    if (organizer?.stripe_account_id) {
      stripeAccountId = organizer.stripe_account_id
    } else {
      const account = await stripe.accounts.create({
        controller: {
          stripe_dashboard: { type: 'none' },
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          requirement_collection: 'application',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      })
      stripeAccountId = account.id

      await db.from('organizer_profiles').upsert({
        id: user.id,
        payout_email: user.email,
        stripe_account_id: stripeAccountId,
        stripe_onboarding_complete: false,
      })
    }

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${APP_URL}/submit`,
      return_url: `${APP_URL}/organizer/onboarding/complete?event_id=${eventId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: unknown) {
    const stripeErr = err as { message?: string; code?: string; param?: string; type?: string }
    console.error('[stripe/connect/onboard]', stripeErr)
    return NextResponse.json({
      error: stripeErr?.message || 'Stripe error',
      code: stripeErr?.code,
      param: stripeErr?.param,
      type: stripeErr?.type,
    }, { status: 500 })
  }
}
