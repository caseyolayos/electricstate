/**
 * POST /api/profile/[username]/follow/notify
 *
 * Called client-side after a successful follow to fire the in-app notification
 * and FCM push. Does NOT need user auth — the follow row already exists in
 * user_follows by the time this is called. We validate the follower_id is
 * a real profile before acting.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { sendPush } from '@/lib/fcm'

export const dynamic = 'force-dynamic'

export async function POST(req: Request, { params }: { params: { username: string } }) {
  try {
    const { follower_id } = await req.json()
    if (!follower_id) return NextResponse.json({ ok: false })

    const supabase = createServerClient()

    // Fetch both profiles in parallel
    const [{ data: target }, { data: follower }] = await Promise.all([
      supabase.from('profiles')
        .select('id, display_name, username, fcm_token')
        .eq('username', params.username)
        .single(),
      supabase.from('profiles')
        .select('id, display_name, username')
        .eq('id', follower_id)
        .single(),
    ])

    if (!target || !follower) return NextResponse.json({ ok: false })

    // Verify the follow row actually exists (prevents abuse)
    const { data: followRow } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('follower_id', follower.id)
      .eq('following_id', target.id)
      .maybeSingle()

    if (!followRow) return NextResponse.json({ ok: false })

    const followerName = follower.display_name || follower.username || 'Someone'
    const title = `${followerName} started following you`
    const body = `@${follower.username ?? 'them'} is now following your Electric State passport`
    const url = `/passport/${follower.username ?? ''}`

    // Only send FCM push — the in-app notification is generated dynamically
    // from user_follows in the GET /api/notifications handler (with avatar data).
    // Inserting into the notifications table here would create duplicates.
    const fcmToken = (target as { fcm_token?: string | null }).fcm_token
    if (fcmToken) {
      await sendPush({ fcmToken, title, body, url })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false })
  }
}
