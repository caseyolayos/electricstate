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

  // Verify auth
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const {
    firstName, lastName,
    dobDay, dobMonth, dobYear,
    ssnLast4,
    addressLine1, city, state, postalCode,
    phone, website,
    accountHolderName, routingNumber, accountNumber, accountType,
  } = body

  // Basic validation
  if (!firstName || !lastName || !dobDay || !dobMonth || !dobYear ||
      !ssnLast4 || !phone || !addressLine1 || !city || !state || !postalCode ||
      !routingNumber || !accountNumber) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }

  const stripe = getStripe()
  const db = createServerClient()

  try {
    // Get or create Stripe Connect account
    let stripeAccountId: string
    const { data: organizer } = await db
      .from('organizer_profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single()

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
        country: 'US',
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

    // Get client IP for TOS acceptance
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || '0.0.0.0'

    // Update account with personal info + TOS acceptance
    // If the account was created with requirement_collection:'stripe' it will reject these fields —
    // detect that and create a fresh account with the correct settings.
    let updateError: unknown = null
    try {
      await stripe.accounts.update(stripeAccountId, {
        business_type: 'individual',
        individual: {
          first_name: firstName,
          last_name: lastName,
          dob: {
            day: parseInt(dobDay),
            month: parseInt(dobMonth),
            year: parseInt(dobYear),
          },
          ssn_last_4: ssnLast4,
          phone: phone || undefined,
          address: {
            line1: addressLine1,
            city,
            state,
            postal_code: postalCode,
            country: 'US',
          },
          email: user.email ?? undefined,
        },
        business_profile: {
          url: website || undefined,
          mcc: '7922', // Theatrical producers / ticket agencies
        },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: clientIp,
        },
      })
    } catch (e: unknown) {
      updateError = e
    }

    // If the existing account rejected the update (wrong requirement_collection), create a fresh one
    if (updateError) {
      const errMsg = (updateError as { message?: string })?.message || ''
      const isPermissionError = errMsg.includes('required permissions') || errMsg.includes('requirement_collection')
      if (!isPermissionError) throw updateError // re-throw unrelated errors

      // Create a new account with application-controlled requirements
      const newAccount = await stripe.accounts.create({
        controller: {
          stripe_dashboard: { type: 'none' },
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          requirement_collection: 'application',
        },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        country: 'US',
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      })
      stripeAccountId = newAccount.id
      await db.from('organizer_profiles').update({
        stripe_account_id: stripeAccountId,
        stripe_onboarding_complete: false,
      }).eq('id', user.id)

      // Retry the update on the new account
      await stripe.accounts.update(stripeAccountId, {
        business_type: 'individual',
        individual: {
          first_name: firstName, last_name: lastName,
          dob: { day: parseInt(dobDay), month: parseInt(dobMonth), year: parseInt(dobYear) },
          ssn_last_4: ssnLast4,
          phone: phone || undefined,
          address: { line1: addressLine1, city, state, postal_code: postalCode, country: 'US' },
          email: user.email ?? undefined,
        },
        business_profile: { url: website || undefined, mcc: '7922' },
        tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: clientIp },
      })
    }

    // Attach bank account
    await stripe.accounts.createExternalAccount(stripeAccountId, {
      external_account: {
        object: 'bank_account',
        country: 'US',
        currency: 'usd',
        routing_number: routingNumber,
        account_number: accountNumber,
        account_holder_name: accountHolderName || `${firstName} ${lastName}`,
        account_holder_type: 'individual',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    })

    // Mark as complete in DB
    await db.from('organizer_profiles').update({
      stripe_onboarding_complete: true,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string; param?: string }
    console.error('[stripe/connect/submit]', e)
    return NextResponse.json({
      error: e?.message || 'Stripe error',
      code: e?.code,
      param: e?.param,
    }, { status: 500 })
  }
}
