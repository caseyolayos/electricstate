'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

function OnboardingCompleteContent() {
  const { user, loading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const eventId = searchParams.get('event_id')

  const [status, setStatus] = useState<'checking' | 'complete' | 'incomplete' | 'error'>('checking')

  useEffect(() => {
    if (loading) return
    if (!user) { router.replace('/login'); return }

    async function checkOnboarding() {
      try {
        const supabase = createClient()!
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        if (!token) { setStatus('error'); return }
        const res = await fetch('/api/stripe/connect/status', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        const data = await res.json()
        setStatus(data.complete ? 'complete' : 'incomplete')
      } catch {
        setStatus('error')
      }
    }

    checkOnboarding()
  }, [user, loading, router])

  if (loading || status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'complete') {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center">
        <div className="glass p-10">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-black text-white mb-2">You&apos;re set up!</h2>
          <p className="text-white/50 mb-6">
            Your Stripe account is connected. Now add your ticket tiers and you&apos;re ready to sell.
          </p>
          <a
            href={eventId ? `/organizer/events/${eventId}/tickets` : '/organizer/events'}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            {eventId ? 'Set up ticket tiers →' : 'Go to my events →'}
          </a>
        </div>
      </div>
    )
  }

  if (status === 'incomplete') {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center">
        <div className="glass p-10">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-black text-white mb-2">Almost there</h2>
          <p className="text-white/50 mb-6">
            Your Stripe setup isn&apos;t complete yet. Finish it to start selling tickets.
          </p>
          {eventId && (
            <a
              href={`/api/stripe/connect/onboard?event_id=${eventId}`}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border border-white/20 text-white hover:bg-white/5 transition-all mb-3"
            >
              Continue Stripe setup →
            </a>
          )}
          <button onClick={() => router.push('/submit')}
            className="text-white/30 text-sm hover:text-white/60 transition-colors">
            Skip for now
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-16 max-w-lg mx-auto text-center">
      <div className="glass p-10">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-2xl font-black text-white mb-2">Something went wrong</h2>
        <p className="text-white/50 mb-6">We couldn&apos;t verify your Stripe setup. Try again.</p>
        <button onClick={() => router.push('/submit')}
          className="text-white/40 text-sm hover:text-white/70 transition-colors">
          Back to submit
        </button>
      </div>
    </div>
  )
}

export default function OnboardingCompletePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    }>
      <OnboardingCompleteContent />
    </Suspense>
  )
}
