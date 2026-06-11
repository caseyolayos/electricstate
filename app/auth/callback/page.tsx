'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [lines, setLines] = useState<string[]>(['Starting…'])

  const log = (msg: string) => {
    console.log('[auth]', msg)
    setLines(prev => [...prev, msg])
  }

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) { log('No supabase client'); return }

    // Listen for PASSWORD_RECOVERY event — fires when reset link is clicked
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      log(`authStateChange: ${event}`)
      if (event === 'PASSWORD_RECOVERY') {
        log('✓ Password recovery detected — redirecting to reset password…')
        subscription.unsubscribe()
        router.replace('/auth/reset-password')
      } else if (event === 'SIGNED_IN' && session) {
        log('✓ Signed in — redirecting to passport…')
        subscription.unsubscribe()
        router.replace('/passport')
      }
    })

    async function handleCallback() {
      if (!supabase) return

      const search = window.location.search
      const hash = window.location.hash
      log(`search: ${search || '(empty)'}`)
      log(`hash: ${hash ? hash.substring(0, 60) + '…' : '(empty)'}`)

      const params = new URLSearchParams(search)
      const code = params.get('code')
      const tokenHash = params.get('token_hash')
      const type = params.get('type') as 'magiclink' | 'email' | 'recovery' | null
      const errorParam = params.get('error')
      const errorDesc = params.get('error_description')

      if (errorParam) {
        log(`Supabase error: ${errorParam} — ${errorDesc}`)
        return
      }

      log(`code: ${code ? code.substring(0, 20) + '…' : 'null'}`)
      log(`token_hash: ${tokenHash ? tokenHash.substring(0, 20) + '…' : 'null'}`)
      log(`type: ${type ?? 'null'}`)

      try {
        if (code) {
          log('Calling exchangeCodeForSession…')
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          log(`exchange result: ${error ? 'ERROR: ' + error.message : 'ok, user=' + data.session?.user?.email}`)
          if (error) throw error
        } else if (tokenHash && type) {
          log('Calling verifyOtp…')
          const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
          log(`verifyOtp result: ${error ? 'ERROR: ' + error.message : 'ok, user=' + data.session?.user?.email}`)
          if (error) throw error
        } else {
          log('No code or token_hash — checking session from hash…')
          await new Promise(r => setTimeout(r, 800))
        }
      } catch (err) {
        log(`Caught: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    handleCallback()
    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
      <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      <div className="glass p-4 w-full max-w-sm font-mono text-xs space-y-1">
        {lines.map((l, i) => (
          <p key={i} className={l.includes('ERROR') || l.includes('Caught') ? 'text-red-400' : l.includes('✓') ? 'text-[#C8FF00]' : 'text-white/50'}>{l}</p>
        ))}
      </div>
    </div>
  )
}
