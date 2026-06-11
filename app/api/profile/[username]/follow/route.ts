import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { sendPush } from '@/lib/fcm'

export const dynamic = 'force-dynamic'

async function getAuthUser(req: Request) {
  // 1. Try Authorization header
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (token) {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const { data: { user } } = await anon.auth.getUser(token)
    if (user) return user
  }

  // 2. Fall back to cookie-based session (WKWebView / browser)
  try {
    const { createServerClient: createSSRClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
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

// POST → follow
export async function POST(req: Request, { params }: { params: { username: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  // Fetch both profiles in parallel — need follower's name + target's token
  const [{ data: target }, { data: follower }] = await Promise.all([
    supabase.from('profiles')
      .select('id, display_name, username, fcm_token')
      .eq('username', params.username).single(),
    supabase.from('profiles')
      .select('id, display_name, username')
      .eq('id', user.id).single(),
  ])

  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (target.id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  await supabase.from('user_follows').upsert(
    { follower_id: user.id, following_id: target.id },
    { onConflict: 'follower_id,following_id' }
  )

  // Fire-and-forget: notify the person being followed
  const followerName = follower?.display_name || follower?.username || 'Someone'
  const notifTitle = `${followerName} started following you`
  const notifBody = `@${follower?.username ?? 'them'} is now following your Electric State passport`
  const profileUrl = `/passport/${follower?.username ?? ''}`

  const fcmToken = (target as { fcm_token?: string | null }).fcm_token

  // Only send FCM push — the in-app notification is generated dynamically
  // from user_follows in the GET /api/notifications handler (with avatar data).
  // Inserting into the notifications table here would create duplicates.
  if (fcmToken) {
    await sendPush({ fcmToken, title: notifTitle, body: notifBody, url: profileUrl })
  }

  return NextResponse.json({ following: true })
}

// DELETE → unfollow
export async function DELETE(req: Request, { params }: { params: { username: string } }) {
  const user = await getAuthUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()
  const { data: target } = await supabase
    .from('profiles').select('id').eq('username', params.username).single()
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  await supabase.from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', target.id)
  return NextResponse.json({ following: false })
}

// GET → check if current user follows this person
export async function GET(req: Request, { params }: { params: { username: string } }) {
  // Use the full cookie-aware helper so mobile WKWebView works
  const { getAuthUserFromRequest } = await import('@/lib/authServer')
  const user = await getAuthUserFromRequest(req)
  if (!user) return NextResponse.json({ following: false })

  const supabase = createServerClient()
  const { data: target } = await supabase
    .from('profiles').select('id').eq('username', params.username).single()
  if (!target) return NextResponse.json({ following: false })

  const { data } = await supabase.from('user_follows')
    .select('follower_id').eq('follower_id', user.id).eq('following_id', target.id).single()
  return NextResponse.json({ following: !!data })
}
