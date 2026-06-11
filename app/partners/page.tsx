import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Partner with Electric State | List Your Events',
  description: 'Electric State is the dedicated passport app for electronic music fans in SoCal. Get your events in front of the most engaged fans in the scene.',
  alternates: {
    canonical: 'https://www.electricstate.app/partners',
  },
  openGraph: {
    title: 'Partner with Electric State',
    description: 'Get your events in front of the most engaged electronic music fans in SoCal. Built for the scene, by the scene.',
    url: 'https://www.electricstate.app/partners',
    images: [{ url: 'https://www.electricstate.app/api/og/home', width: 1200, height: 630, alt: 'Partner with Electric State' }],
  },
}

const PARTNERS_LOGOS = [
  { name: 'Ultra Music Festival', emoji: '🌊' },
  { name: 'Relentless Beats', emoji: '🔊' },
  { name: 'Insomniac Events', emoji: '🦉' },
  { name: 'CRSSD Festival', emoji: '🌴' },
  { name: 'Frameworks', emoji: '🏗️' },
  { name: 'Your Organization', emoji: '⚡' },
]

const WHY_LIST = [
  {
    icon: '🎯',
    title: 'Reach fans who are already there',
    description: 'Electric State users are electronic music fans first. They\'re not scrolling past pop concerts and sports events to find yours — your event is exactly what they came for.',
  },
  {
    icon: '📱',
    title: 'Your event in their pocket',
    description: 'Fans check in at your events, earn XP, and collect stamps. That creates a direct relationship between your brand and their experience — on an app they actually want to open.',
  },
  {
    icon: '🔒',
    title: 'Underground & mainstream both work',
    description: 'Whether you\'re running a 20,000-person festival or a 200-person warehouse rave, the platform is built for both. We don\'t prioritize big names over good music.',
  },
  {
    icon: '📊',
    title: 'See who\'s going, not just who bought',
    description: 'Our "I\'m Going" feature and check-in data gives you real attendance intent signals, not just ticket purchase numbers. Know your audience before night-of.',
  },
  {
    icon: '🤝',
    title: 'We\'re early — and that\'s the point',
    description: 'Being listed now means your events are part of the foundation. Early partners get prominent placement, co-marketing, and a direct line to our team.',
  },
  {
    icon: '💸',
    title: 'Keep your existing ticketing',
    description: 'You don\'t have to switch anything. Link to your Ticketmaster, RA, or Eventbrite pages. We\'re an additional discovery and engagement layer, not a replacement.',
  },
]

const HOW_IT_WORKS = [
  {
    number: '01',
    icon: '📋',
    title: 'Submit your events',
    description: 'Use our submit form or reach out directly and we\'ll add your events for you. Takes minutes.',
  },
  {
    number: '02',
    icon: '🎟️',
    title: 'Fans discover and save',
    description: 'Your events show up in our feed, search, and venue pages. Fans save them, mark "I\'m Going," and share with their crew.',
  },
  {
    number: '03',
    icon: '📍',
    title: 'Night-of check-ins',
    description: 'Fans check in at your event in the app to earn XP and stamps. You get attendance data. They get bragging rights.',
  },
  {
    number: '04',
    icon: '📈',
    title: 'Build your following on the platform',
    description: 'Over time, fans follow your brand, get notified of new events, and become repeat attendees — not just one-time ticket buyers.',
  },
]

const SCENE_STATS = [
  { stat: '25K+', label: 'Instagram followers in the scene', source: '@electricstate_' },
  { stat: '32M+', label: 'EDM fans in the US', source: 'Statista, 2023' },
  { stat: '$9.8B', label: 'US EDM market size', source: 'IFPI, 2023' },
  { stat: '#1', label: 'SoCal — largest EDM market in the US', source: 'Pollstar' },
]

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-black text-white">

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(200,255,0,0.10) 0%, transparent 70%)',
          }}
        />
        <div className="relative max-w-2xl mx-auto px-6 pt-20 pb-16 text-center">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#C8FF00]/30 text-[#C8FF00] text-xs font-bold tracking-wider uppercase mb-6"
            style={{ background: 'rgba(200,255,0,0.08)' }}
          >
            ⚡ For Event Organizations
          </div>
          <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-5">
            Your events deserve<br />
            <span style={{ color: '#C8FF00' }}>a dedicated audience.</span>
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-lg mx-auto">
            Electric State is the passport app built exclusively for electronic music fans. Get your events listed, reach fans who are already in the scene, and build a following that comes back every time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/submit"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:scale-105"
              style={{ background: '#C8FF00', color: '#000' }}
            >
              Submit Your Events →
            </Link>
          </div>
          <p className="text-white/30 text-xs mt-4">Free to list. No contracts required.</p>
        </div>
      </div>

      {/* Social proof logos */}
      <div className="max-w-2xl mx-auto px-6 pb-12">
        <p className="text-center text-white/30 text-xs font-bold uppercase tracking-widest mb-6">
          Built for organizations like
        </p>
        <div className="grid grid-cols-3 gap-3">
          {PARTNERS_LOGOS.map((p) => (
            <div
              key={p.name}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-white/8 text-center"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <span className="text-2xl">{p.emoji}</span>
              <span className="text-white/50 text-xs font-semibold leading-snug">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Market stats */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div className="rounded-2xl p-6 border border-white/10" style={{ background: 'rgba(200,255,0,0.03)' }}>
          <p className="text-center text-[#C8FF00] text-xs font-black uppercase tracking-widest mb-6">
            The market you're already serving
          </p>
          <div className="grid grid-cols-2 gap-4">
            {SCENE_STATS.map((s) => (
              <div key={s.stat} className="text-center">
                <p className="text-3xl font-black text-white">{s.stat}</p>
                <p className="text-white/50 text-xs mt-1 leading-snug">{s.label}</p>
                <p className="text-white/20 text-[10px] mt-0.5">{s.source}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why list */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-white">Why list on Electric State</h2>
          <p className="text-white/40 text-sm mt-1">We built this for the culture. Here's what that means for you.</p>
        </div>
        <div className="grid gap-4">
          {WHY_LIST.map((item) => (
            <div
              key={item.title}
              className="flex gap-4 p-5 rounded-2xl border border-white/8"
              style={{ background: 'rgba(255,255,255,0.02)' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl"
                style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.15)' }}
              >
                {item.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-white/45 text-sm leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-black text-white">How it works</h2>
          <p className="text-white/40 text-sm mt-1">List today, reach fans tonight</p>
        </div>

        <div className="relative">
          <div className="absolute left-7 top-8 bottom-8 w-px" style={{ background: 'rgba(200,255,0,0.15)' }} />
          <div className="flex flex-col gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.number} className="flex gap-5 relative">
                <div
                  className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center text-2xl relative z-10"
                  style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.2)' }}
                >
                  {step.icon}
                </div>
                <div className="flex-1 pt-1 pb-2">
                  <span className="text-[10px] font-black tracking-widest" style={{ color: '#C8FF00' }}>
                    STEP {step.number}
                  </span>
                  <h3 className="text-white font-bold text-base leading-snug mb-1 mt-0.5">{step.title}</h3>
                  <p className="text-white/45 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Early partner pitch */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <div
          className="rounded-2xl p-8 border"
          style={{ background: 'rgba(200,255,0,0.04)', borderColor: 'rgba(200,255,0,0.2)' }}
        >
          <div className="text-3xl mb-4">🚀</div>
          <h3 className="text-xl font-black text-white mb-3">We just launched — and that's the opportunity</h3>
          <p className="text-white/55 text-sm leading-relaxed mb-4">
            Electric State is growing fast — we already have over 25,000 followers on Instagram, all electronic music fans in your target demographic. We&apos;re building the definitive home for the scene in SoCal and beyond. The organizations who list their events now become part of that foundation — not an afterthought.
          </p>
          <p className="text-white/55 text-sm leading-relaxed mb-6">
            Early partners get prominent placement in our app, co-marketing on our social channels, and a direct relationship with our team. We want to grow with you, not just list you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/submit"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: '#C8FF00', color: '#000' }}
            >
              Submit an Event Yourself
            </Link>
          </div>
        </div>
      </div>

      {/* What we need from you */}
      <div className="max-w-2xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-black text-white mb-2 text-center">What we need from you</h2>
        <p className="text-white/40 text-sm text-center mb-8">Less than you think</p>
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          {[
            { icon: '📅', title: 'Event details', desc: 'Name, venue, date, lineup. We handle the rest.' },
            { icon: '🖼️', title: 'A flyer or photo', desc: 'Optional, but makes a big difference on the listing.' },
            { icon: '🔗', title: 'Your ticket link', desc: 'We link directly to wherever you\'re already selling.' },
          ].map(item => (
            <div key={item.title} className="p-5 rounded-2xl border border-white/8" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="text-3xl mb-3">{item.icon}</div>
              <p className="text-white font-bold text-sm mb-1">{item.title}</p>
              <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl font-black text-white mb-3">Ready to get listed?</h2>
        <p className="text-white/40 text-sm mb-6">
          Submit your events directly — it takes under 5 minutes.
        </p>
        <Link
          href="/submit"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-base transition-all hover:scale-105"
          style={{ background: '#C8FF00', color: '#000' }}
        >
          Submit Your Events →
        </Link>
        <div className="mt-8 pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-center text-white/25 text-xs">
          <span>Free to list. No platform fee on external ticketing.</span>
          <span className="hidden sm:block">·</span>
          <span>Want to sell tickets through us? <Link href="/promoters" className="text-white/40 hover:text-white/60 transition-colors underline">See promoter info →</Link></span>
        </div>
      </div>

    </div>
  )
}
