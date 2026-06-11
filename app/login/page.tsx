'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type View = 'signin' | 'signup' | 'forgot'

export default function LoginPage() {
  const { signInWithPassword, signUpWithPassword, resetPasswordForEmail, signInWithGoogle, user } = useAuth()
  const router = useRouter()

  const [view, setView] = useState<View>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  // Show errors passed back from server-side OAuth callback
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const [googleError, setGoogleError] = useState<string | null>(searchParams?.get('error') ?? null)

  if (user) {
    router.replace('/passport')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (view === 'forgot') {
      const { error } = await resetPasswordForEmail(email.trim())
      setLoading(false)
      if (error) setError(error)
      else setResetSent(true)
      return
    }

    if (!email.trim() || !password.trim()) { setLoading(false); return }

    if (view === 'signin') {
      const { error } = await signInWithPassword(email.trim(), password)
      setLoading(false)
      if (error) setError(error)
    } else {
      const { error } = await signUpWithPassword(email.trim(), password)
      setLoading(false)
      if (error) setError(error)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1 text-xl font-bold tracking-tight mb-4">
            <span className="text-white">ELECTRIC</span>
            <span className="gradient-text"> STATE</span>
          </Link>
          <h1 className="text-2xl font-black text-white mt-2">
            {view === 'forgot' ? 'Reset Password' : 'Sign In'}
          </h1>
          <p className="text-white/40 text-sm mt-1">Your passport awaits</p>
        </div>

        <div className="glass p-6 flex flex-col gap-4">

          {/* Google OAuth button — desktop only (Google blocks OAuth in iOS WKWebView) */}
          {view !== 'forgot' && (
            <div className="hidden md:contents">
              <a
                href="/api/auth/google"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setGoogleLoading(true)}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold border transition-all hover:bg-white/10 active:scale-95"
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)', color: '#fff' }}
              >
                {googleLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {googleLoading ? 'Redirecting…' : 'Continue with Google'}
              </a>

              {googleError && <p className="text-red-400/80 text-xs text-center">{googleError}</p>}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/25 text-xs">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
            </div>
          )}

          {/* Forgot password — sent state */}
          {view === 'forgot' && resetSent ? (
            <div className="text-center py-2">
              <div className="text-4xl mb-3">📬</div>
              <p className="text-white font-bold mb-1">Check your inbox</p>
              <p className="text-white/50 text-sm mb-4">
                We sent a reset link to <span className="text-[#C8FF00]">{email}</span>.<br />
                Open it on the same device/browser you use for Electric State.
              </p>
              <button
                onClick={() => { setView('signin'); setResetSent(false) }}
                className="text-white/30 text-xs hover:text-white/60 transition-colors"
              >
                ← Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Sign in / Sign up tabs (hidden on forgot view) */}
              {view !== 'forgot' && (
                <div className="flex gap-4 border-b border-white/10 pb-3 mb-1">
                  <button
                    onClick={() => { setView('signin'); setError(null) }}
                    className={`text-sm font-bold pb-1 border-b-2 transition-all ${view === 'signin' ? 'border-[#C8FF00] text-[#C8FF00]' : 'border-transparent text-white/30'}`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setView('signup'); setError(null) }}
                    className={`text-sm font-bold pb-1 border-b-2 transition-all ${view === 'signup' ? 'border-[#C8FF00] text-[#C8FF00]' : 'border-transparent text-white/30'}`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs text-white/50 mb-1.5 font-medium">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  />
                </div>

                {view !== 'forgot' && (
                  <div>
                    <label className="block text-xs text-white/50 mb-1.5 font-medium">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || (view !== 'forgot' && !password.trim())}
                  className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(200,255,0,0.3)]"
                  style={{ background: '#C8FF00', color: '#000' }}
                >
                  {loading
                    ? 'Please wait…'
                    : view === 'signin'
                    ? 'Sign In →'
                    : view === 'signup'
                    ? 'Create Account →'
                    : 'Send Reset Link ⚡'}
                </button>
              </form>

              {error && <p className="text-red-400/80 text-xs text-center">{error}</p>}

              {/* Forgot / Back links */}
              <div className="text-center">
                {view === 'signin' && (
                  <button
                    onClick={() => { setView('forgot'); setError(null) }}
                    className="text-white/30 text-xs hover:text-white/60 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
                {view === 'forgot' && (
                  <button
                    onClick={() => { setView('signin'); setError(null) }}
                    className="text-white/30 text-xs hover:text-white/60 transition-colors"
                  >
                    ← Back to sign in
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-white/30 text-sm hover:text-white/60 transition-colors">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
