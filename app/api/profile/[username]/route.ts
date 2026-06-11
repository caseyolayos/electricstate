import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export const revalidate = 60

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const username = decodeURIComponent(params.username).toLowerCase().trim()

  try {
    const supabase = createServerClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji, avatar_url, xp, badges, attended_events, followed_artists, created_at, spotify_url')
      .eq('username', username)
      .single()

    if (error || !profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    // Follower / following counts + organizer check — all in parallel
    const today = new Date().toISOString().split('T')[0]
    const [{ count: followers }, { count: following }, organizerRes, eventsRes, checkInsRes] = await Promise.all([
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
      supabase.from('organizer_profiles').select('id').eq('id', profile.id).maybeSingle(),
      // Fetch their approved events — upcoming first, then recent past, max 12
      supabase.from('festivals')
        .select('id, name, date_start, city, image_url, venue, slug')
        .eq('submitted_by', profile.id)
        .eq('status', 'approved')
        .order('date_start', { ascending: false })
        .limit(12),
      // Fetch real check-in history
      supabase.from('check_ins')
        .select('event_id, event_name, venue_name, venue_city, event_date, xp_awarded')
        .eq('user_id', profile.id)
        .order('event_date', { ascending: false })
        .limit(24),
    ])

    const isOrganizer = !!organizerRes.data
    const organizerEvents = isOrganizer ? (eventsRes.data ?? []) : []
    const checkIns = checkInsRes.data ?? []

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_emoji: profile.avatar_emoji ?? '⚡',
        avatar_url: profile.avatar_url ?? null,
        xp: profile.xp ?? 0,
        badges: profile.badges ?? [],
        attended_events: profile.attended_events ?? [],
        followed_artists: profile.followed_artists ?? [],
        followers: followers ?? 0,
        following: following ?? 0,
        is_organizer: isOrganizer,
        organizer_events: organizerEvents,
        check_ins: checkIns,
      }
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
