import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Promote Events on Electric State',
  description: 'Sell tickets to your electronic music events, grow your crowd, and get paid — built for underground promoters and independent DJs in SoCal.',
  alternates: {
    canonical: 'https://www.electricstate.app/promoters',
  },
  openGraph: {
    title: 'Promote Events on Electric State',
    description: 'Sell tickets to your electronic music events, grow your crowd, and get paid. Built for underground promoters and independent DJs.',
    url: 'https://www.electricstate.app/promoters',
    images: [{ url: 'https://www.electricstate.app/api/og/home', width: 1200, height: 630, alt: 'Promote on Electric State' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Promote Events on Electric State',
    description: 'Sell tickets, grow your crowd, and get paid. Built for underground promoters and DJs.',
    images: ['https://www.electricstate.app/api/og/home'],
  },
}

const STEPS = [
  {
    number: '01',
    title: 'Sign In or Create an Account',
    description: 'A free Electric State account is all you need to get started. Takes 30 seconds.',
    icon: '👤',
  },
  {
    number: '02',
    title: 'Submit Your Event',
    description: 'Tap "+ Submit" in the app. Choose Mainstream or Underground, fill in your event details — name, venue, date, lineup, and flyer.',
    icon: '📋',
  },
  {
    number: '03',
    title: 'Connect Your Payout Account',
    description: 'Enter your personal info and bank details once. We use Stripe to process payments — your money goes directly to your bank account.',
    icon: '🏦',
  },
  {
    number: '04',
    title: 'Set Up Ticket Tiers',
    description: 'Create as many tiers as you want — Early Bird, GA, VIP, or even free RSVP. You control the price, quantity, and sale window.',
    icon: '🎟️',
  },
  {
    number: '05',
    title: 'Share Your Event Link',
    description: 'Your event gets a clean public page. Share the link anywhere — Instagram, group chats, wherever your crowd is.',
    icon: '🔗',
  },
  {
    number: '06',
    title: 'Get Paid',
    description: 'Payouts land in your bank account automatically after each sale. Track ticket sales and revenue in real time from your dashboard.',
    icon: '💸',
  },
]

const BENEFITS = [
  {
    label: 'Platform fee',
    us: '6%',
    tm: '25–30%',
    eb: '3.5% + $1.99/ticket',
    highlight: true,
  },
  {
    label: 'Free events',
    us: '✓ Always free',
    tm: '✗ Not supported',
    eb: '✓ Free tier only',
  },
  {
    label: 'Payout speed',
    us: 'Instant via Stripe',
    tm: '5–7 business days',
    eb: '5+ business days',
  },
  {
    label: 'Audience',
    us: 'Electronic music fans',
    tm: 'General (all genres)',
    eb: 'General (all types)',
    highlight: true,
  },
  {
    label: 'Ticket scanning',
    us: '✓ Built-in QR scanner',
    tm: '✓ Their app only',
    eb: '✓ Their app only',
  },
  {
    label: 'Underground events',
    us: '✓ First-class support',
    tm: '✗ Not a focus',
    eb: '△ Limited visibility',
    highlight: true,
  },
  {
    label: 'Setup time',
    us: 'Under 10 minutes',
    tm: '24–72hr approval',
    eb: 'Hours of setup',
  },
]

export default function PromotersPage() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(200,255,0,0.12) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C8FF00]/30 text-[#C8FF00] text-xs font-bold tracking-wider uppercase mb-6"
            style={{ background: 'rgba(200,255,0,0.08)' }}>
            ⚡ For Promoters
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
            Sell tickets.<br />
            Keep your money.<br />
            <span style={{ color: '#C8FF00' }}>Build your crowd.</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg mx-auto">
            Electric State is built for electronic music promoters. No bloated fees, no corporate gatekeeping — just a clean way to sell tickets to people who actually care about the music.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:scale-105"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            Submit Your Event →
          </Link>
          <p className="text-white/30 text-xs mt-3">Free to list. We only make money when you do.</p>
        </div>
      </div>

      {/* Fee comparison */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white">How we stack up</h2>
          <p className="text-white/40 text-sm mt-1">The platforms you&apos;ve used before — and why this is different</p>
        </div>

        {/* Mobile layout: stacked rows */}
        <div className="sm:hidden rounded-2xl overflow-hidden border border-white/10">
          {/* Mobile header */}
          <div className="grid grid-cols-3 text-[10px] font-black uppercase tracking-wider border-b border-white/10"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="col-start-2 px-3 py-2.5 text-center" style={{ color: '#C8FF00' }}>Electric State</div>
            <div className="px-3 py-2.5 text-center text-white/40">Competitors</div>
          </div>
          {BENEFITS.map((row) => (
            <div key={row.label} className={`border-t border-white/5 ${row.highlight ? 'bg-[#C8FF00]/[0.03]' : ''}`}>
              <div className="px-4 pt-3 pb-1 text-white/50 text-xs font-medium">{row.label}</div>
              <div className="grid grid-cols-3 pb-3">
                <div />
                <div className="px-3 text-center text-xs font-bold leading-snug" style={{ color: '#C8FF00' }}>{row.us}</div>
                <div className="px-3 text-center text-[11px] text-white/35 leading-snug">
                  <div>{row.tm}</div>
                  <div className="mt-1 pt-1 border-t border-white/5">{row.eb}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop layout: 4-column grid */}
        <div className="hidden sm:block rounded-2xl overflow-hidden border border-white/10">
          {/* Header */}
          <div className="grid grid-cols-4 text-xs font-black uppercase tracking-wider"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <div className="px-4 py-3 text-white/30">Feature</div>
            <div className="px-4 py-3 text-center" style={{ color: '#C8FF00' }}>Electric State</div>
            <div className="px-4 py-3 text-center text-white/40">Ticketmaster</div>
            <div className="px-4 py-3 text-center text-white/40">Eventbrite</div>
          </div>
          {BENEFITS.map((row) => (
            <div
              key={row.label}
              className={`grid grid-cols-4 border-t border-white/5 ${row.highlight ? 'bg-[#C8FF00]/[0.03]' : ''}`}
            >
              <div className="px-4 py-3.5 text-white/50 text-xs font-medium">{row.label}</div>
              <div className="px-4 py-3.5 text-center text-xs font-bold leading-snug" style={{ color: '#C8FF00' }}>{row.us}</div>
              <div className="px-4 py-3.5 text-center text-xs text-white/35 leading-snug">{row.tm}</div>
              <div className="px-4 py-3.5 text-center text-xs text-white/35 leading-snug">{row.eb}</div>
            </div>
          ))}
        </div>

        <p className="text-white/25 text-xs text-center mt-3">
          + standard Stripe processing (2.9% + 30¢ per transaction, passed to buyer)
        </p>
      </div>

      {/* Steps */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-white">How it works</h2>
          <p className="text-white/40 text-sm mt-1">From zero to selling tickets in under 10 minutes</p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-7 top-8 bottom-8 w-px" style={{ background: 'rgba(200,255,0,0.15)' }} />

          <div className="flex flex-col gap-6">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-5 relative">
                {/* Step number bubble */}
                <div
                  className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl relative z-10"
                  style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.2)' }}
                >
                  {step.icon}
                </div>
                {/* Content */}
                <div className="flex-1 pt-1 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black tracking-widest" style={{ color: '#C8FF00' }}>
                      STEP {step.number}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-base leading-snug mb-1">{step.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social proof / trust */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div
          className="rounded-2xl p-8 text-center border border-white/8"
          style={{ background: 'rgba(200,255,0,0.04)' }}
        >
          <div className="text-4xl mb-4">🎧</div>
          <h3 className="text-xl font-black text-white mb-2">Built for the underground</h3>
          <p className="text-white/50 text-sm leading-relaxed max-w-md mx-auto">
            We built Electric State because the existing platforms don&apos;t get electronic music. No algorithms burying your event. No corporate approval process. Just you, your crowd, and your music.
          </p>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl font-black text-white mb-3">Ready to run your first show?</h2>
        <p className="text-white/40 text-sm mb-6">It&apos;s free to list. No commitment, no contracts.</p>
        <Link
          href="/submit"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:scale-105"
          style={{ background: '#C8FF00', color: '#000' }}
        >
          Submit Your Event →
        </Link>
        <div className="mt-8 pt-8 border-t border-white/5">
          <p className="text-white/25 text-xs">
            Questions? Reach out at{' '}
            <a href="mailto:hello@electricstate.app" className="text-white/40 hover:text-white/60 transition-colors">
              hello@electricstate.app
            </a>
          </p>
        </div>
      </div>

    </div>
  )
}
