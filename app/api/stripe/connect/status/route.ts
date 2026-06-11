import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

export async function GET(req: Request) {
  const stripe = getStripe()

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { createServerClient: createServiceClient } = await import('@/lib/supabaseServer')
  const db = createServiceClient()

  const { data: organizer } = await db
    .from('organizer_profiles')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', user.id)
    .single()

  if (!organizer?.stripe_account_id) {
    return NextResponse.json({ complete: false, reason: 'no_account' })
  }

  if (organizer.stripe_onboarding_complete) {
    return NextResponse.json({ complete: true })
  }

  // Check with Stripe
  const account = await stripe.accounts.retrieve(organizer.stripe_account_id)
  const complete = account.details_submitted && !account.requirements?.currently_due?.length

  if (complete) {
    await db
      .from('organizer_profiles')
      .update({ stripe_onboarding_complete: true, updated_at: new Date().toISOString() })
      .eq('id', user.id)
  }

  return NextResponse.json({ complete: !!complete })
}
