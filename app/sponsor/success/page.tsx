'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

const TIER_NAMES: Record<string, string> = {
  supporter: 'Supporter',
  partner: 'Partner',
  presenting: 'Presenting',
  title: 'Title Sponsor',
}

function SuccessContent() {
  const params = useSearchParams()
  const tier = params.get('tier') || ''
  const brand = params.get('brand') || 'Your brand'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center pb-24">
      <div className="max-w-md w-full">
        <div className="text-6xl mb-6">⚡</div>
        <h1 className="text-3xl font-black text-white mb-3">
          Welcome to the family,<br />
          <span style={{ color: '#C8FF00' }}>{decodeURIComponent(brand)}</span>
        </h1>
        <p className="text-white/50 text-sm mb-2">
          Your <strong className="text-white">{TIER_NAMES[tier] || 'Sponsorship'}</strong> is confirmed.
        </p>
        <p className="text-white/30 text-sm mb-8">
          You&apos;ll receive a confirmation email shortly. Our team will reach out within 1 business day to get your logo, assets, and onboarding sorted.
        </p>

        <div className="glass p-5 rounded-2xl mb-6 text-left">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">What happens next</p>
          <div className="space-y-3">
            {[
              { icon: '📧', text: 'Confirmation email sent to your inbox' },
              { icon: '👋', text: 'Our team reaches out within 1 business day' },
              { icon: '🎨', text: 'Send us your logo and brand assets' },
              { icon: '🚀', text: "You're live on Electric State" },
            ].map(step => (
              <div key={step.text} className="flex items-center gap-3">
                <span className="text-lg flex-shrink-0">{step.icon}</span>
                <span className="text-white/60 text-sm">{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-full py-3 rounded-xl font-black text-sm text-center transition-all hover:opacity-90"
            style={{ background: '#C8FF00', color: '#000' }}>
            Back to Electric State
          </Link>
          <a
            href="mailto:sponsors@electricstate.app"
            className="w-full py-3 rounded-xl font-bold text-sm text-center border border-white/10 text-white/50 hover:text-white transition-colors">
            Contact sponsor team
          </a>
        </div>
      </div>
    </div>
  )
}

export default function SponsorSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
