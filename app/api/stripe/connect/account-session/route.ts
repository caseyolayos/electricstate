import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServerClient()
  const { data: organizer } = await db
    .from('organizer_profiles')
    .select('stripe_account_id')
    .eq('id', user.id)
    .single()

  // If no account yet, create one first
  let stripeAccountId = organizer?.stripe_account_id
  if (!stripeAccountId) {
    const stripe = getStripe()
    const account = await stripe.accounts.create({
      controller: {
        stripe_dashboard: { type: 'none' },
        fees: { payer: 'application' },
        losses: { payments: 'application' },
        requirement_collection: 'stripe',
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

  try {
    const stripe = getStripe()
    const accountSession = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        account_onboarding: { enabled: true },
      },
    })
    return NextResponse.json({ client_secret: accountSession.client_secret })
  } catch (err: unknown) {
    const e = err as { message?: string }
    console.error('[account-session]', e)
    return NextResponse.json({ error: e?.message || 'Stripe error' }, { status: 500 })
  }
}
