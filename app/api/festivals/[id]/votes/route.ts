import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const CATEGORIES = ['food', 'security', 'bathrooms', 'parking', 'venue', 'bar_prices', 'sound', 'vibe']

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const festivalId = params.id.replace('festival-', '')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get the festival slug for year-over-year continuity
    const { data: festival } = await supabase
      .from('festivals')
      .select('slug')
      .eq('id', festivalId)
      .single()

    const slug = festival?.slug

    let query = supabase.from('festival_votes').select('category, rating')
    if (slug) {
      query = query.eq('festival_slug', slug)
    } else {
      query = query.eq('festival_id', festivalId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ votes: {}, slug: null })

    const votes: Record<string, { avg: number; count: number }> = {}
    for (const cat of CATEGORIES) {
      const catVotes = (data || []).filter(v => v.category === cat)
      if (catVotes.length > 0) {
        const avg = catVotes.reduce((s, v) => s + v.rating, 0) / catVotes.length
        votes[cat] = { avg: Math.round(avg * 10) / 10, count: catVotes.length }
      }
    }

    return NextResponse.json({ votes, slug: slug || null })
  } catch {
    return NextResponse.json({ votes: {}, slug: null })
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const festivalId = params.id.replace('festival-', '')

  try {
    const { category, rating, userId } = await req.json()

    if (!CATEGORIES.includes(category) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get slug for year-over-year continuity
    const { data: festival } = await supabase
      .from('festivals')
      .select('slug')
      .eq('id', festivalId)
      .single()

    const slug = festival?.slug

    const voteRecord: Record<string, unknown> = {
      festival_id: festivalId,
      festival_slug: slug || null,
      category,
      rating,
    }

    let xpAwarded = 0

    if (userId) {
      voteRecord.user_id = userId
      // Check if this is a first-time vote (before deleting/upserting)
      const existingQuery = slug
        ? supabase.from('festival_votes').select('id').eq('festival_slug', slug).eq('user_id', userId).eq('category', category).maybeSingle()
        : supabase.from('festival_votes').select('id').eq('festival_id', festivalId).eq('user_id', userId).eq('category', category).maybeSingle()
      const { data: existingVote } = await existingQuery
      const isFirstVote = !existingVote

      if (slug) {
        await supabase.from('festival_votes').delete().eq('festival_slug', slug).eq('user_id', userId).eq('category', category)
        await supabase.from('festival_votes').insert(voteRecord)
      } else {
        await supabase.from('festival_votes').upsert(voteRecord, { onConflict: 'festival_id,user_id,category' })
      }

      // Award XP for first-time votes only
      if (isFirstVote) {
        xpAwarded = 10
        const { data: prof } = await supabase.from('profiles').select('xp').eq('id', userId).maybeSingle()
        await supabase.from('profiles').update({ xp: (prof?.xp ?? 0) + xpAwarded }).eq('id', userId)
      }
    } else {
      await supabase.from('festival_votes').insert(voteRecord)
    }

    return NextResponse.json({ success: true, xp_awarded: xpAwarded })
  } catch {
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }
}
