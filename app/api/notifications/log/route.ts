/**
 * POST /api/notifications/log
 * Logs a notification to the `notifications` table.
 * Called server-side (from push send scripts, edge functions, etc.)
 * Requires service role — not exposed to the public.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

export interface LogNotificationPayload {
  user_id: string
  type: string         // 'push', 'new_follower', 'event_reminder', 'friend_going', 'blast'
  title: string
  body?: string
  data?: Record<string, string>
}

export async function POST(req: Request) {
  // Require internal secret so this can't be called by end users
  const secret = req.headers.get('x-internal-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: LogNotificationPayload = await req.json()
  if (!payload.user_id || !payload.title || !payload.type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerClient()
  const { error } = await supabase.from('notifications').insert({
    user_id:    payload.user_id,
    type:       payload.type,
    title:      payload.title,
    body:       payload.body ?? null,
    data:       payload.data ?? {},
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
