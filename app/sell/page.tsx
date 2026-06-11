import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sell Tickets on Electric State — Just 6% Flat',
  description: 'Electric State is the ticketing platform built for electronic music. No hidden fees, no price gouging — just a flat 6%. List your event, set your tiers, get paid.',
  alternates: {
    canonical: 'https://www.electricstate.app/sell',
  },
  openGraph: {
    title: 'Sell Tickets on Electric State — Just 6% Flat',
    description: 'List your rave, festival, or club night and start selling tickets in minutes. Flat 6% fee. Direct payouts via Stripe. Built for the scene.',
    url: 'https://www.electricstate.app/sell',
    images: [{ url: 'https://www.electricstate.app/api/og/home', width: 1200, height: 630, alt: 'Sell Tickets on Electric State' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sell Tickets on Electric State — Just 6% Flat',
    description: 'List your rave, festival, or club night and start selling tickets in minutes. Flat 6% fee. Built for the scene.',
    images: ['https://www.electricstate.app/api/og/home'],
  },
}

const COMPARE = [
  { platform: 'Ticketmaster', fee: '27%+', color: 'text-red-400', note: 'service + facility + order fees' },
  { platform: 'Eventbrite', fee: '8–10%', color: 'text-orange-400', note: '+ payment processing' },
  { platform: 'Dice', fee: '10%+', color: 'text-orange-400', note: 'varies by volume' },
  { platform: 'Electric State', fee: '6%', color: 'text-[#C8FF00]', note: 'flat. always. no surprises.', highlight: true },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Submit Your Event',
    body: 'Fill in your event details — venue, date, lineup, flyer. Tell us if it\'s a festival, club night, warehouse event, or something else entirely.',
    cta: null,
  },
  {
    step: '02',
    title: 'Turn On Ticketing',
    body: 'After submitting, we\'ll ask if you want Electric State to handle your ticketing. One tap and you\'re in.',
    cta: null,
  },
  {
    step: '03',
    title: 'Quick Stripe Onboarding',
    body: 'Connect your bank account through Stripe in minutes. Secure, industry-standard, and your money goes directly to you.',
    cta: null,
  },
  {
    step: '04',
    title: 'Set Your Tiers & Start Selling',
    body: 'Create as many ticket tiers as you want — early bird, GA, VIP. Tickets go live immediately to Electric State\'s community of verified ravers.',
    cta: null,
  },
]

const FEATURES = [
  {
    icon: '⚡',
    title: 'Flat 6%. Nothing else.',
    body: 'Ticketmaster takes up to 27% by the time you add service fees, facility fees, and order fees. We take 6%. Flat. Every time.',
  },
  {
    icon: '🎪',
    title: 'Built for the scene.',
    body: 'Electric State is not a general events platform. It\'s built exclusively for electronic music — your event lands in front of people who actually go to raves.',
  },
  {
    icon: '🛂',
    title: 'Underground-ready.',
    body: 'Secret locations, address reveals, 21+ events, warehouse shows — we support what the big platforms won\'t.',
  },
  {
    icon: '🏅',
    title: 'Fans who actually show up.',
    body: 'Every buyer has an Electric State Passport. They earn XP, collect badges, and track their attendance. These are the lifers.',
  },
  {
    icon: '💸',
    title: 'Direct payouts via Stripe.',
    body: 'No holding your money for 30 days. Stripe pays you directly, on your schedule.',
  },
  {
    icon: '📊',
    title: 'Multiple ticket tiers.',
    body: 'Early bird, GA, VIP, table. Set any tiers you need with custom pricing, capacity limits, and names.',
  },
]

export default function SellPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 pt-24 pb-20 text-center">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, #C8FF00 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C8FF00]/30 bg-[#C8FF00]/10 text-[#C8FF00] text-xs font-bold tracking-widest uppercase mb-6">
            ⚡ Electric State Ticketing
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-none tracking-tight mb-6">
            Stop giving<br />
            <span style={{ color: '#C8FF00' }}>27%</span> to Ticketmaster.
          </h1>

          <p className="text-white/60 text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Electric State is the ticketing platform built for electronic music.
            List your event, set your tiers, and get paid — for a flat <strong className="text-white">6%</strong>. No hidden fees. No bullshit.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-black transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(200,255,0,0.4)]"
              style={{ background: '#C8FF00', color: '#000' }}
            >
              List Your Event →
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold border border-white/15 text-white/70 hover:bg-white/5 transition-all"
            >
              How it works
            </a>
          </div>
        </div>
      </section>

      {/* ── Fee Comparison ────────────────────────────────── */}
      <section className="px-6 py-16 max-w-2xl mx-auto">
        <h2 className="text-center text-sm font-bold tracking-widest uppercase text-white/30 mb-8">
          The math is pretty simple
        </h2>

        <div className="rounded-2xl overflow-hidden border border-white/10">
          {COMPARE.map((row, i) => (
            <div
              key={row.platform}
              className={`flex items-center justify-between px-6 py-4 ${
                row.highlight
                  ? 'bg-[#C8FF00]/8 border-t-2 border-[#C8FF00]/40'
                  : i % 2 === 0 ? 'bg-white/3' : 'bg-transparent'
              }`}
            >
              <div>
                <p className={`font-bold text-base ${row.highlight ? 'text-[#C8FF00]' : 'text-white'}`}>
                  {row.platform}
                  {row.highlight && <span className="ml-2 text-[10px] font-black tracking-widest bg-[#C8FF00] text-black px-2 py-0.5 rounded-full uppercase">That&apos;s us</span>}
                </p>
                <p className="text-white/35 text-xs mt-0.5">{row.note}</p>
              </div>
              <p className={`text-2xl font-black ${row.color}`}>{row.fee}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-white/25 text-xs mt-4">
          Ticketmaster fees sourced from their published fee schedules. Actual totals vary by event.
        </p>
      </section>

      {/* ── Features ──────────────────────────────────────── */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-center text-3xl md:text-4xl font-black mb-4">
          Everything you need.<br />
          <span style={{ color: '#C8FF00' }}>Nothing you don&apos;t.</span>
        </h2>
        <p className="text-center text-white/40 mb-12 max-w-lg mx-auto">
          We built this for promoters who are tired of platforms that treat electronic music like an afterthought.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="rounded-2xl p-6 border border-white/8 hover:border-[#C8FF00]/20 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-black text-white text-base mb-2">{f.title}</h3>
              <p className="text-white/45 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-center text-3xl md:text-4xl font-black mb-4">
          Live in under<br />
          <span style={{ color: '#C8FF00' }}>10 minutes.</span>
        </h2>
        <p className="text-center text-white/40 mb-12">
          No sales call. No approval process. Submit your event and start selling.
        </p>

        <div className="flex flex-col gap-6">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.step} className="flex gap-5 items-start">
              {/* Step number + connector */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: '#C8FF00', color: '#000' }}
                >
                  {s.step}
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="w-px flex-1 mt-2" style={{ background: 'rgba(200,255,0,0.2)', minHeight: 32 }} />
                )}
              </div>
              {/* Content */}
              <div className="pb-6">
                <h3 className="font-black text-white text-lg mb-1">{s.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Who It's For ──────────────────────────────────── */}
      <section className="px-6 py-16 max-w-4xl mx-auto">
        <h2 className="text-center text-3xl font-black mb-10">
          Made for <span style={{ color: '#C8FF00' }}>everyone in the scene.</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Independent promoters', 'Festival organizers', 'Club nights', 'Warehouse collectives', 'Label showcases', 'Artist headliners', 'Pop-up events', 'Underground raves'].map(who => (
            <div
              key={who}
              className="rounded-xl px-4 py-3 text-center text-sm font-semibold text-white/60 border border-white/8"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              {who}
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────── */}
      <section className="px-6 py-24 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-15"
            style={{ background: 'radial-gradient(ellipse, #C8FF00 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-black mb-4">
            Ready to stop<br />
            <span style={{ color: '#C8FF00' }}>overpaying?</span>
          </h2>
          <p className="text-white/50 mb-10 text-lg">
            Submit your event. It takes 2 minutes.<br />
            Ticketing setup takes 10.
          </p>
          <Link
            href="/submit"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-lg font-black transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(200,255,0,0.5)]"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            List Your Event — It&apos;s Free →
          </Link>
          <p className="text-white/25 text-xs mt-5">
            No monthly fees. No setup costs. 6% only when you sell a ticket.
          </p>
        </div>
      </section>

      {/* ── Footer nav ────────────────────────────────────── */}
      <div className="border-t border-white/8 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-6 text-sm text-white/30">
          <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
          <Link href="/submit" className="hover:text-white/60 transition-colors">Submit Event</Link>
          <Link href="/promoters" className="hover:text-white/60 transition-colors">Promoter Info</Link>
          <Link href="/login" className="hover:text-white/60 transition-colors">Sign In</Link>
        </div>
        <p className="text-white/15 text-xs mt-4">
          © {new Date().getFullYear()} Electric State. Built for the underground.
        </p>
      </div>

    </main>
  )
}
