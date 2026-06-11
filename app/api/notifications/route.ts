import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export interface AppNotification {
  id: string
  type: 'new_follower' | 'event_reminder' | 'friend_going' | 'push' | string
  title: string
  body: string
  created_at: string   // used for unread detection & social sorting
  display_date?: string // if set, UI shows this instead of timeAgo(created_at)
  href?: string
  actor?: {
    display_name: string | null
    username: string | null
    avatar_emoji: string
    avatar_url: string | null
  }
  event?: {
    id: string
    name: string
    date: string
    venue: string
    city: string
    image_url?: string
  }
}

async function getAuthUser(req: Request) {
  // 1. Try Authorization header (used by app fetch calls)
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (token) {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await anon.auth.getUser(token)
    if (user) return user
  }

  // 2. Fall back to cookie-based session (WKWebView / browser navigation)
  try {
    const cookieStore = cookies()
    const supabase = createSSRClient(
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

export async function GET(req: Request) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // ── Stored notifications (push alerts, blasts, etc.) ──────────────────────
  // Wrapped in try/catch so the page still loads if the table doesn't exist yet
  try {
    const { data: storedRows } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .neq('type', 'new_follower') // handled dynamically from user_follows (with avatar data)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(30)

    for (const row of (storedRows ?? []) as {
      id: string; type: string; title: string; body: string | null;
      data: Record<string, string>; read: boolean; created_at: string
    }[]) {
      notifications.push({
        id: `stored-${row.id}`,
        type: row.type as AppNotification['type'],
        title: row.title,
        body: row.body ?? '',
        created_at: row.created_at,
        href: row.data?.url,
      })
    }
  } catch { /* table not created yet — skip */ }

  const [followsResult, remindersResult, followingResult] = await Promise.all([
    // 1. New followers in the last 30 days
    supabase
      .from('user_follows')
      .select('follower_id, created_at')
      .eq('following_id', user.id)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(30),

    // 2. Upcoming events the user is going to
    supabase
      .from('event_reminders')
      .select('*')
      .eq('user_id', user.id)
      .gte('event_date', today)
      .lte('event_date', thirtyDaysFromNow)
      .order('event_date', { ascending: true })
      .limit(20),

    // 3. Get IDs of people this user follows (for friend activity)
    supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .limit(100),
  ])

  const notifications: AppNotification[] = []

  // ── New followers ──────────────────────────────────────────────────────────
  const follows = followsResult.data ?? []
  if (follows.length) {
    const followerIds = follows.map((f: { follower_id: string }) => f.follower_id)
    const { data: followerProfiles } = await supabase
      .from('profiles')
      .select('id, display_name, username, avatar_emoji, avatar_url')
      .in('id', followerIds)

    const profileMap = Object.fromEntries(
      (followerProfiles ?? []).map((p: { id: string; display_name: string | null; username: string | null; avatar_emoji: string; avatar_url: string | null }) => [p.id, p])
    )

    for (const follow of follows as { follower_id: string; created_at: string }[]) {
      const p = profileMap[follow.follower_id]
      const name = p?.display_name || p?.username || 'Someone'
      notifications.push({
        id: `follower-${follow.follower_id}`,
        type: 'new_follower',
        title: `${name} started following you`,
        body: p?.username ? `@${p.username}` : 'Tap to view their passport',
        created_at: follow.created_at,
        href: p?.username ? `/passport/${p.username}` : `/passport/followers`,
        actor: p
          ? { display_name: p.display_name, username: p.username, avatar_emoji: p.avatar_emoji || '🎵', avatar_url: p.avatar_url }
          : undefined,
      })
    }
  }

  // ── Upcoming event reminders ───────────────────────────────────────────────
  // Deduplicate: a user may have both a 'saved' and 'going' row for the same
  // event. Keep only one notification per event_id (prefer 'going' > 'saved').
  const seenEventIds = new Set<string>()
  const deduplicatedReminders = ((remindersResult.data ?? []) as {
    id: string; event_id: string; event_name: string; event_date: string;
    event_venue: string; event_city: string; created_at: string; type: string
  }[])
    .sort((a, b) => (a.type === 'going' ? -1 : 1) - (b.type === 'going' ? -1 : 1)) // going first
    .filter(r => {
      if (seenEventIds.has(r.event_id)) return false
      seenEventIds.add(r.event_id)
      return true
    })

  for (const r of deduplicatedReminders) {
    const eventDay = new Date(r.event_date + 'T00:00:00')
    const msUntil = eventDay.getTime() - Date.now()
    const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24))
    const daysLabel =
      daysUntil <= 0 ? '🔥 Today!' :
      daysUntil === 1 ? '⏰ Tomorrow' :
      `📅 In ${daysUntil} days`

    // Use the event date (midnight UTC) as the display timestamp so the UI
    // shows 'Today', 'Tomorrow', or the date — not when the row was created.
    const eventDateIso = r.event_date + 'T00:00:00.000Z'

    notifications.push({
      id: `reminder-${r.id}`,
      type: 'event_reminder',
      title: r.event_name,
      body: `${r.event_venue}${r.event_city ? `, ${r.event_city}` : ''}`,
      created_at: r.created_at,     // kept for unread badge logic
      display_date: eventDateIso,   // shown in the timestamp slot
      href: `/events/${r.event_id}`,
      event: {
        id: r.event_id,
        name: r.event_name,
        date: r.event_date,
        venue: r.event_venue || '',
        city: r.event_city || '',
      },
    })
  }

  // ── Friends going to events ────────────────────────────────────────────────
  const friendIds = (followingResult.data ?? []).map((f: { following_id: string }) => f.following_id)
  if (friendIds.length) {
    const { data: friendReminders } = await supabase
      .from('event_reminders')
      .select('id, event_id, event_name, event_date, event_venue, event_city, created_at, user_id')
      .in('user_id', friendIds)
      .gte('event_date', today)
      .lte('event_date', thirtyDaysFromNow)
      .order('event_date', { ascending: true })
      .limit(20)

    if (friendReminders?.length) {
      const friendProfileIds = Array.from(new Set(friendReminders.map((r: { user_id: string }) => r.user_id)))
      const { data: friendProfiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_emoji, avatar_url')
        .in('id', friendProfileIds)

      const friendProfileMap = Object.fromEntries(
        (friendProfiles ?? []).map((p: { id: string; display_name: string | null; username: string | null; avatar_emoji: string; avatar_url: string | null }) => [p.id, p])
      )

      // Deduplicate friend reminders by event_id + user_id pair
      const seenFriendEvents = new Set<string>()
      const dedupedFriendReminders = (friendReminders as {
        id: string; event_id: string; event_name: string; event_date: string;
        event_venue: string; event_city: string; created_at: string; user_id: string
      }[]).filter(r => {
        const key = `${r.user_id}::${r.event_id}`
        if (seenFriendEvents.has(key)) return false
        seenFriendEvents.add(key)
        return true
      })

      for (const r of dedupedFriendReminders as {
        id: string; event_id: string; event_name: string; event_date: string;
        event_venue: string; event_city: string; created_at: string; user_id: string
      }[]) {
        const p = friendProfileMap[r.user_id]
        const name = p?.display_name || p?.username || 'A friend'
        const dateStr = new Date(r.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

        notifications.push({
          id: `friend-going-${r.id}`,
          type: 'friend_going',
          title: `${name} is going to ${r.event_name}`,
          body: `${dateStr} · ${r.event_venue}${r.event_city ? `, ${r.event_city}` : ''}`,
          created_at: r.created_at,
          href: `/events/${r.event_id}`,
          actor: p
            ? { display_name: p.display_name, username: p.username, avatar_emoji: p.avatar_emoji || '🎵', avatar_url: p.avatar_url }
            : undefined,
          event: {
            id: r.event_id,
            name: r.event_name,
            date: r.event_date,
            venue: r.event_venue || '',
            city: r.event_city || '',
          },
        })
      }
    }
  }

  // Sort: social notifications by created_at desc, event reminders by event_date asc (already ordered)
  // We'll just return them all and let the client split into tabs
  return NextResponse.json({ notifications })
}
