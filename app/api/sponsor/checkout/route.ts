import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.electricstate.app'

const TIERS: Record<string, { name: string; amountCents: number; description: string }> = {
  supporter: {
    name: 'Supporter Sponsorship',
    amountCents: 19900,
    description: 'Logo + link on /sponsor page, 1 social mention/month',
  },
  partner: {
    name: 'Partner Sponsorship',
    amountCents: 49900,
    description: 'Logo on all event pages, 2 social mentions/month, monthly analytics report',
  },
  presenting: {
    name: 'Presenting Sponsorship',
    amountCents: 99900,
    description: 'Homepage banner, push notification blast/month, 4 social mentions/month',
  },
  title: {
    name: 'Title Sponsorship',
    amountCents: 249900,
    description: '"Powered by [Brand]" across app, 2 push blasts/month, weekly analytics',
  },
}

export async function POST(req: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
  }

  const { tier, brandName, contactName, contactEmail, website } = await req.json()

  const tierId = tier?.toLowerCase()
  const tierData = TIERS[tierId]
  if (!tierData) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }
  if (!brandName || !contactEmail) {
    return NextResponse.json({ error: 'Brand name and contact email are required' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          recurring: { interval: 'month' },
          product_data: {
            name: tierData.name,
            description: tierData.description,
          },
          unit_amount: tierData.amountCents,
        },
        quantity: 1,
      },
    ],
    customer_email: contactEmail,
    success_url: `${APP_URL}/sponsor/success?tier=${tierId}&brand=${encodeURIComponent(brandName)}`,
    cancel_url: `${APP_URL}/sponsor`,
    metadata: {
      tier: tierId,
      brandName,
      contactName: contactName || '',
      contactEmail,
      website: website || '',
    },
  })

  return NextResponse.json({ url: session.url })
}
