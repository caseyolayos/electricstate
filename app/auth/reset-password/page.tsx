'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError("Passwords don't match")
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    if (!supabase) { setError('Auth not configured'); setLoading(false); return }
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError(error.message)
    else setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm glass p-8 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-black text-white mb-2">Password updated!</h1>
          <p className="text-white/50 text-sm mb-6">You can now sign in with your new password.</p>
          <button
            onClick={() => router.replace('/login')}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:shadow-[0_0_20px_rgba(200,255,0,0.3)]"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            Go to Sign In →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1 text-xl font-bold tracking-tight mb-4">
            <span className="text-white">ELECTRIC</span>
            <span className="gradient-text"> STATE</span>
          </Link>
          <h1 className="text-2xl font-black text-white mt-2">Set New Password</h1>
          <p className="text-white/40 text-sm mt-1">Choose something you'll remember</p>
        </div>

        <div className="glass p-6 flex flex-col gap-4">
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">New password</label>
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
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(200,255,0,0.3)]"
              style={{ background: '#C8FF00', color: '#000' }}
            >
              {loading ? 'Saving…' : 'Set Password →'}
            </button>
          </form>
          {error && <p className="text-red-400/80 text-xs text-center">{error}</p>}
        </div>
      </div>
    </div>
  )
}
