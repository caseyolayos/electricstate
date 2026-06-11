/**
 * Server-side Supabase client with Next.js Data Cache bypassed.
 * Use this in all API routes so Supabase fetch calls never return stale cached data.
 */
import { createClient } from '@supabase/supabase-js'

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (url: RequestInfo | URL, opts?: RequestInit) =>
          fetch(url, { ...opts, cache: 'no-store' }),
      },
    }
  )
}
