'use client'

import { useState } from 'react'

const TIERS = [
  {
    id: 'supporter',
    name: 'Supporter',
    price: 199,
    badge: null,
    color: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)',
    textColor: '#fff',
    perks: [
      'Logo + link on electricstate.app/sponsor',
      '1 social media mention per month',
      'Access to monthly audience report',
    ],
  },
  {
    id: 'partner',
    name: 'Partner',
    price: 499,
    badge: 'Popular',
    color: 'rgba(200,255,0,0.05)',
    borderColor: 'rgba(200,255,0,0.25)',
    textColor: '#C8FF00',
    perks: [
      'Everything in Supporter',
      'Logo featured on all event pages',
      '2 social media mentions per month',
      'Monthly analytics & audience report',
    ],
  },
  {
    id: 'presenting',
    name: 'Presenting',
    price: 999,
    badge: null,
    color: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.15)',
    textColor: '#fff',
    perks: [
      'Everything in Partner',
      'Homepage banner placement',
      'Monthly push notification blast to all users',
      '4 social media mentions per month',
      'Priority brand integration planning call',
    ],
  },
  {
    id: 'title',
    name: 'Title Sponsor',
    price: 2499,
    badge: '⚡ Premier',
    color: 'rgba(200,255,0,0.08)',
    borderColor: 'rgba(200,255,0,0.4)',
    textColor: '#C8FF00',
    perks: [
      '"Powered by [Brand]" across the entire app',
      'Everything in Presenting',
      '2 push notification blasts per month',
      'Dedicated brand feature post',
      'Co-branded festival activations',
      'Weekly analytics & audience insights',
      'Direct line to founding team',
    ],
  },
]

const STATS = [
  { value: '50K+', label: 'Monthly active users' },
  { value: '200+', label: 'Festivals & events listed' },
  { value: '18–34', label: 'Core audience age' },
  { value: '92%', label: 'Push notification open rate' },
]

const AUDIENCE = [
  { emoji: '🎵', label: 'Festival & rave attendees' },
  { emoji: '💰', label: 'High disposable income (experience-first spenders)' },
  { emoji: '📍', label: 'US-based, coast-to-coast' },
  { emoji: '🔥', label: 'Early adopters & tastemakers' },
  { emoji: '📱', label: 'Mobile-first, always connected' },
  { emoji: '🎶', label: 'Underground to mainstage — all scenes' },
]

export default function SponsorPage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null)
  const [form, setForm] = useState({ brandName: '', contactName: '', contactEmail: '', website: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    if (!selectedTier) return
    if (!form.brandName.trim() || !form.contactEmail.trim()) {
      setError('Brand name and contact email are required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/sponsor/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: selectedTier, ...form }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong.')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  const tier = TIERS.find(t => t.id === selectedTier)

  return (
    <div className="min-h-screen pb-32">
      {/* Hero */}
      <div className="relative overflow-hidden px-4 py-16 text-center"
        style={{ background: 'linear-gradient(180deg, rgba(200,255,0,0.08) 0%, transparent 100%)' }}>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(200,255,0,0.12), transparent)' }} />
        <p className="text-[#C8FF00] text-xs font-bold uppercase tracking-[0.2em] mb-3">Sponsor Electric State</p>
        <h1 className="text-4xl font-black text-white leading-tight mb-4">
          Reach the underground.<br />
          <span style={{ color: '#C8FF00' }}>Own the moment.</span>
        </h1>
        <p className="text-white/50 text-base max-w-xl mx-auto leading-relaxed">
          Electric State is where festival culture lives. Put your brand in front of the most passionate, experience-driven music fans in the country.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-4">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-12">
          {STATS.map(s => (
            <div key={s.label} className="glass p-4 rounded-2xl text-center">
              <p className="text-2xl font-black" style={{ color: '#C8FF00' }}>{s.value}</p>
              <p className="text-white/40 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Audience */}
        <div className="glass p-6 rounded-2xl mb-12">
          <h2 className="text-white font-black text-sm uppercase tracking-wider mb-4">Who You&apos;re Reaching</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AUDIENCE.map(a => (
              <div key={a.label} className="flex items-center gap-3">
                <span className="text-xl flex-shrink-0">{a.emoji}</span>
                <span className="text-white/60 text-sm">{a.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tiers */}
        <h2 className="text-white font-black text-sm uppercase tracking-wider mb-4">Sponsorship Packages</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          {TIERS.map(t => {
            const isSelected = selectedTier === t.id
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTier(t.id)}
                className="text-left p-5 rounded-2xl transition-all relative"
                style={{
                  background: isSelected ? (t.id === 'partner' || t.id === 'title' ? 'rgba(200,255,0,0.1)' : 'rgba(255,255,255,0.08)') : t.color,
                  border: `1.5px solid ${isSelected ? t.textColor : t.borderColor}`,
                  boxShadow: isSelected ? `0 0 24px ${t.textColor}20` : 'none',
                }}
              >
                {/* Selected check */}
                {isSelected && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: '#C8FF00' }}>
                    <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3 pr-8">
                  <div>
                    {t.badge && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-2 inline-block"
                        style={{ background: t.textColor === '#C8FF00' ? 'rgba(200,255,0,0.15)' : 'rgba(255,255,255,0.1)', color: t.textColor }}>
                        {t.badge}
                      </span>
                    )}
                    <h3 className="text-white font-black text-lg">{t.name}</h3>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-black" style={{ color: t.textColor }}>${t.price.toLocaleString()}</p>
                    <p className="text-white/30 text-xs">/month</p>
                  </div>
                </div>

                <ul className="space-y-2">
                  {t.perks.map(perk => (
                    <li key={perk} className="flex items-start gap-2">
                      <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: '#C8FF00' }}>✓</span>
                      <span className="text-white/60 text-xs">{perk}</span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        {/* Checkout form */}
        <div className="glass p-6 rounded-2xl">
          <h2 className="text-white font-black text-sm uppercase tracking-wider mb-1">
            {selectedTier ? `Complete Your ${tier?.name} Sponsorship` : 'Select a Package Above to Get Started'}
          </h2>
          {selectedTier && (
            <p className="text-white/40 text-xs mb-5">
              You&apos;ll be charged <span style={{ color: '#C8FF00' }}>${tier?.price.toLocaleString()}/month</span>, cancel anytime.
            </p>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${selectedTier ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            <div>
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">Brand Name *</label>
              <input
                value={form.brandName}
                onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
                placeholder="Liquid Death"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 border outline-none focus:border-[#C8FF00]/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">Contact Name</label>
              <input
                value={form.contactName}
                onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                placeholder="Jane Smith"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 border outline-none focus:border-[#C8FF00]/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">Contact Email *</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={e => setForm(f => ({ ...f, contactEmail: e.target.value }))}
                placeholder="jane@brand.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 border outline-none focus:border-[#C8FF00]/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>
            <div>
              <label className="text-white/40 text-xs font-bold uppercase tracking-wider block mb-1.5">Website</label>
              <input
                value={form.website}
                onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="https://yourbrand.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/20 border outline-none focus:border-[#C8FF00]/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs mt-3">{error}</p>
          )}

          <button
            onClick={handleCheckout}
            disabled={!selectedTier || loading}
            className="mt-5 w-full py-4 rounded-xl font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 hover:shadow-[0_0_24px_rgba(200,255,0,0.3)]"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            {loading
              ? 'Redirecting to checkout…'
              : selectedTier
              ? `Start ${tier?.name} — $${tier?.price.toLocaleString()}/mo`
              : 'Select a package to continue'}
          </button>

          <p className="text-white/20 text-xs text-center mt-3">
            Secured by Stripe · Cancel anytime · Billed monthly
          </p>
        </div>

        {/* Custom / contact */}
        <div className="mt-6 p-5 rounded-2xl text-center"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-white/50 text-sm mb-1">Need something custom?</p>
          <p className="text-white/30 text-xs mb-3">Multi-event activations, co-branding, festival integrations — we&apos;ll build the right package for you.</p>
          <a
            href="sms:+12038925790"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
            style={{ background: 'rgba(200,255,0,0.08)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.2)' }}>
            💬 Text Casey: (203) 892-5790
          </a>
        </div>

      </div>
    </div>
  )
}
