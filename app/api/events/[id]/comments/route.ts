import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import { createClient } from '@supabase/supabase-js'
import { getAuthUserFromRequest } from '@/lib/authServer'

export const dynamic = 'force-dynamic'

interface CommentRow {
  id: string
  event_id: string
  user_id: string
  content: string
  created_at: string
  flagged: boolean
  profiles: {
    display_name: string | null
    username: string | null
    avatar_emoji: string | null
    avatar_url: string | null
  } | null
  username?: string | null
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const eventId = params.id

  try {
    const supabase = createServerClient()

    // Try the joined query first (requires FK constraint on event_comments.user_id → profiles.id)
    const { data, error } = await supabase
      .from('event_comments')
      .select(`
        id, event_id, user_id, content, created_at, flagged,
        profiles ( display_name, username, avatar_emoji, avatar_url )
      `)
      .eq('event_id', eventId)
      .eq('flagged', false)
      .order('created_at', { ascending: true })
      .limit(200)

    // If the join fails (missing FK), fall back to fetching profiles separately
    if (error) {
      const { data: rawComments } = await supabase
        .from('event_comments')
        .select('id, user_id, content, created_at')
        .eq('event_id', eventId)
        .eq('flagged', false)
        .order('created_at', { ascending: true })
        .limit(200)

      if (!rawComments?.length) return NextResponse.json({ comments: [] })

      const userIds = Array.from(new Set(rawComments.map((c: { user_id: string }) => c.user_id)))
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_emoji, avatar_url')
        .in('id', userIds)

      const profileMap = Object.fromEntries((profileData || []).map((p: { id: string; display_name: string | null; username: string | null; avatar_emoji: string | null; avatar_url: string | null }) => [p.id, p]))

      return NextResponse.json({
        comments: rawComments.map((c: { id: string; user_id: string; content: string; created_at: string }) => ({
          id: c.id,
          user_id: c.user_id,
          content: c.content,
          created_at: c.created_at,
          display_name: profileMap[c.user_id]?.display_name || profileMap[c.user_id]?.username || 'Anonymous',
          username: profileMap[c.user_id]?.username || null,
          avatar_emoji: profileMap[c.user_id]?.avatar_emoji || '🎵',
          avatar_url: profileMap[c.user_id]?.avatar_url || null,
        }))
      })
    }

    const comments = (data as unknown as CommentRow[]).map(c => ({
      id: c.id,
      user_id: c.user_id,
      content: c.content,
      created_at: c.created_at,
      display_name: c.profiles?.display_name || c.profiles?.username || 'Anonymous',
      username: c.profiles?.username || null,
      avatar_emoji: c.profiles?.avatar_emoji || '🎵',
      avatar_url: c.profiles?.avatar_url || null,
    }))

    return NextResponse.json({ comments })
  } catch {
    return NextResponse.json({ comments: [] })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const eventId = params.id

  try {
    const user = await getAuthUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { content } = await req.json()
    const trimmed = content?.trim()
    if (!trimmed || trimmed.length > 500) {
      return NextResponse.json({ error: 'Invalid content' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Insert then fetch profile separately (avoids FK schema cache issues)
    const { data: inserted, error } = await supabase
      .from('event_comments')
      .insert({ event_id: eventId, user_id: user.id, content: trimmed })
      .select('id, user_id, content, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: prof } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_emoji, avatar_url')
      .eq('id', user.id)
      .single()

    const row = inserted as { id: string; user_id: string; content: string; created_at: string }
    return NextResponse.json({
      comment: {
        id: row.id,
        user_id: row.user_id,
        content: row.content,
        created_at: row.created_at,
        display_name: prof?.display_name || prof?.username || 'Anonymous',
        username: prof?.username || null,
        avatar_emoji: prof?.avatar_emoji || '🎵',
        avatar_url: (prof as { avatar_url?: string | null } | null)?.avatar_url || null,
      }
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const eventId = params.id

  try {
    const user = await getAuthUserFromRequest(req)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { commentId } = await req.json()

    const supabase = createServerClient()
    const { error } = await supabase
      .from('event_comments')
      .delete()
      .eq('id', commentId)
      .eq('event_id', eventId)
      .eq('user_id', user.id) // can only delete own

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
