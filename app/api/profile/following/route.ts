import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user } } = await anon.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  // Get everyone this user follows, with their profile info
  const { data, error } = await supabase
    .from('user_follows')
    .select(`
      following_id,
      profiles!user_follows_following_id_fkey (
        id, username, display_name, avatar_emoji, avatar_url, xp, badges
      )
    `)
    .eq('follower_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ following: [], count: 0 })

  const following = (data || []).map((row: Record<string, unknown>) => {
    const p = row.profiles as Record<string, unknown> | null
    return {
      id: p?.id,
      username: p?.username,
      display_name: p?.display_name,
      avatar_emoji: p?.avatar_emoji ?? '⚡',
      avatar_url: p?.avatar_url ?? null,
      xp: p?.xp ?? 0,
      badges: p?.badges ?? [],
    }
  }).filter(p => p.id)

  return NextResponse.json({ following, count: following.length })
}
