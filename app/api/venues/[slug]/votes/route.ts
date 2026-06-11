import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

const CATEGORIES = ['sound', 'dance_floor', 'bar', 'bathrooms', 'location', 'vibe']

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('venue_votes')
    .select('category, rating')
    .eq('venue_slug', params.slug)

  if (error) return NextResponse.json({ votes: {} })

  const votes: Record<string, { avg: number; count: number }> = {}
  for (const cat of CATEGORIES) {
    const catVotes = (data || []).filter(v => v.category === cat)
    if (catVotes.length > 0) {
      const avg = catVotes.reduce((s, v) => s + v.rating, 0) / catVotes.length
      votes[cat] = { avg: Math.round(avg * 10) / 10, count: catVotes.length }
    }
  }
  return NextResponse.json({ votes })
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  try {
    const { category, rating, userId, venueName } = await req.json()

    if (!CATEGORIES.includes(category) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    if (!userId) return NextResponse.json({ error: 'Must be signed in' }, { status: 401 })

    const supabase = createServerClient()

    // Check if first-time vote before upserting
    const { data: existingVote } = await supabase
      .from('venue_votes')
      .select('id')
      .eq('venue_slug', params.slug)
      .eq('user_id', userId)
      .eq('category', category)
      .maybeSingle()
    const isFirstVote = !existingVote

    const { error } = await supabase
      .from('venue_votes')
      .upsert(
        { venue_slug: params.slug, venue_name: venueName || params.slug, category, rating, user_id: userId },
        { onConflict: 'venue_slug,user_id,category' }
      )

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Award 5 XP for first-time votes only
    let xpAwarded = 0
    if (isFirstVote) {
      xpAwarded = 5
      const { data: prof } = await supabase.from('profiles').select('xp').eq('id', userId).maybeSingle()
      await supabase.from('profiles').update({ xp: (prof?.xp ?? 0) + xpAwarded }).eq('id', userId)
    }

    // Return fresh aggregates
    const { data } = await supabase
      .from('venue_votes')
      .select('category, rating')
      .eq('venue_slug', params.slug)

    const votes: Record<string, { avg: number; count: number }> = {}
    for (const cat of CATEGORIES) {
      const catVotes = (data || []).filter(v => v.category === cat)
      if (catVotes.length > 0) {
        const avg = catVotes.reduce((s, v) => s + v.rating, 0) / catVotes.length
        votes[cat] = { avg: Math.round(avg * 10) / 10, count: catVotes.length }
      }
    }
    return NextResponse.json({ success: true, votes, xp_awarded: xpAwarded })
  } catch {
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }
}
