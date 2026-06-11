import { createBrowserClient } from '@supabase/ssr'

export type Profile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_emoji: string
  bio: string | null
  xp: number
  attended_events: string[]
  saved_events: string[]
  checked_in_events: string[]
  badges: string[]
  followed_artists: string[]
  going_events: string[]
  avatar_url: string | null
  spotify_url: string | null
  _followingCount?: number
  _followerCount?: number
  created_at: string
  updated_at: string
}

export const SUPABASE_ENABLED = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

// Singleton: reuse the same client instance across all calls to avoid
// "Multiple GoTrueClient instances" warnings, orphaned auth locks, and
// ERR_INSUFFICIENT_RESOURCES from hundreds of concurrent connections.
// Use @supabase/ssr's createBrowserClient so it shares cookie storage
// with the server-side createServerClient used in route handlers.
// This fixes session sync after server-side OAuth code exchange.
let _client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!SUPABASE_ENABLED) return null
  if (!_client) {
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client
}
