/**
 * Server-side auth helper that supports both:
 *  1. Authorization: Bearer <token>  (desktop browser / explicit token)
 *  2. Cookie-based session            (WKWebView / mobile where getSession() returns null)
 *
 * Import and call getAuthUserFromRequest(req) in any API route handler.
 */
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

export async function getAuthUserFromRequest(req: Request): Promise<User | null> {
  // 1. Try Authorization header
  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (token) {
    try {
      const anon = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data: { user } } = await anon.auth.getUser(token)
      if (user) return user
    } catch {}
  }

  // 2. Fall back to cookie session (WKWebView / browser navigation)
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (name: string) => cookieStore.get(name)?.value } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    return user ?? null
  } catch {
    return null
  }
}
