import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createServerClient()

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get their Stripe account
    const { data: organizer } = await supabase
      .from('organizer_profiles')
      .select('stripe_account_id, stripe_onboarding_complete')
      .eq('id', user.id)
      .single()

    if (!organizer?.stripe_account_id) {
      return NextResponse.json({ error: 'No Stripe account connected' }, { status: 400 })
    }
    if (!organizer.stripe_onboarding_complete) {
      return NextResponse.json({ error: 'Stripe onboarding not complete' }, { status: 400 })
    }

    const stripe = getStripe()

    // Get current available balance on their connected account
    const balance = await stripe.balance.retrieve({
      stripeAccount: organizer.stripe_account_id,
    } as Parameters<typeof stripe.balance.retrieve>[0])

    const availableUsd = balance.available.find(b => b.currency === 'usd')
    const availableCents = availableUsd?.amount ?? 0

    if (availableCents <= 0) {
      return NextResponse.json({ error: 'No available balance to pay out' }, { status: 400 })
    }

    // Stripe minimum payout is $1.00
    if (availableCents < 100) {
      return NextResponse.json({ error: 'Minimum payout is $1.00' }, { status: 400 })
    }

    // Create the payout to their connected bank account
    const payout = await stripe.payouts.create(
      {
        amount: availableCents,
        currency: 'usd',
        statement_descriptor: 'Electric State',
        metadata: { organizer_id: user.id },
      },
      { stripeAccount: organizer.stripe_account_id }
    )

    return NextResponse.json({
      success: true,
      payoutId: payout.id,
      amountCents: payout.amount,
      arrivalDate: payout.arrival_date,
      status: payout.status,
    })
  } catch (err) {
    const stripeErr = err as { message?: string; code?: string }
    console.error('[payout]', stripeErr)
    return NextResponse.json(
      { error: stripeErr?.message ?? 'Payout failed' },
      { status: 500 }
    )
  }
}
