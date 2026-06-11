import { createServerClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const festivalId = params.id.replace('festival-', '')

  try {
    const supabase = createServerClient()

    // Get the festival slug
    const { data: festival } = await supabase
      .from('festivals')
      .select('slug')
      .eq('id', festivalId)
      .maybeSingle()

    const slug = festival?.slug

    let query = supabase
      .from('festival_votes')
      .select('id', { count: 'exact', head: true })
      .eq('category', '_going')
      .eq('rating', 1)

    if (slug) {
      query = query.eq('festival_slug', slug)
    } else {
      query = query.eq('festival_id', festivalId)
    }

    const { count, error } = await query
    if (error) return NextResponse.json({ count: 0 })

    // Fetch up to 6 attendee avatars
    let avatarQuery = supabase
      .from('festival_votes')
      .select('user_id, profiles(id, display_name, username, avatar_emoji, avatar_url)')
      .eq('category', '_going')
      .eq('rating', 1)
      .limit(6)

    if (slug) {
      avatarQuery = avatarQuery.eq('festival_slug', slug)
    } else {
      avatarQuery = avatarQuery.eq('festival_id', festivalId)
    }

    const { data: attendees } = await avatarQuery
    const avatars = (attendees || []).map((a: any) => ({
      id: a.profiles?.id,
      display_name: a.profiles?.display_name || 'Fan',
      username: a.profiles?.username || null,
      avatar_emoji: a.profiles?.avatar_emoji || '🎵',
      avatar_url: a.profiles?.avatar_url || null,
    })).filter((a: any) => a.id)

    return NextResponse.json({ count: count ?? 0, slug: slug || null, avatars })
  } catch {
    return NextResponse.json({ count: 0, avatars: [] })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const festivalId = params.id.replace('festival-', '')

  try {
    const { going, userId } = await req.json()

    const supabase = createServerClient()

    // Get the festival slug
    const { data: festival } = await supabase
      .from('festivals')
      .select('slug')
      .eq('id', festivalId)
      .maybeSingle()

    const slug = festival?.slug

    if (going) {
      // Insert or update going record
      const record: Record<string, unknown> = {
        festival_id: festivalId,
        festival_slug: slug || null,
        category: '_going',
        rating: 1,
      }
      if (userId) {
        record.user_id = userId
        // Remove existing first, then insert
        let delQ = supabase
          .from('festival_votes')
          .delete()
          .eq('category', '_going')
          .eq('user_id', userId)
        if (slug) {
          delQ = delQ.eq('festival_slug', slug)
        } else {
          delQ = delQ.eq('festival_id', festivalId)
        }
        await delQ
      }
      await supabase.from('festival_votes').insert(record)
    } else {
      // Remove going record
      if (userId) {
        let delQ = supabase
          .from('festival_votes')
          .delete()
          .eq('category', '_going')
          .eq('user_id', userId)
        if (slug) {
          delQ = delQ.eq('festival_slug', slug)
        } else {
          delQ = delQ.eq('festival_id', festivalId)
        }
        await delQ
      }
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update going status' }, { status: 500 })
  }
}
