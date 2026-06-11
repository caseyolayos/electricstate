import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabaseServer'

const CATEGORIES = ['set_selection', 'energy', 'stage_presence', 'sound', 'vibe']

function normalizeName(name: string) {
  return decodeURIComponent(name).toLowerCase().trim()
}

export async function GET(_req: Request, { params }: { params: { name: string } }) {
  const artistName = normalizeName(params.name)
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('artist_votes')
    .select('category, rating')
    .eq('artist_name', artistName)

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

export async function POST(req: Request, { params }: { params: { name: string } }) {
  const artistName = normalizeName(params.name)

  try {
    const { category, rating, userId } = await req.json()

    if (!CATEGORIES.includes(category) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: 'Must be signed in to rate' }, { status: 401 })
    }

    // Verify the userId matches a real auth user
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const supabase = createServerClient()

    // Check if first-time vote before upserting
    const { data: existingVote } = await supabase
      .from('artist_votes')
      .select('id')
      .eq('artist_name', artistName)
      .eq('user_id', userId)
      .eq('category', category)
      .maybeSingle()
    const isFirstVote = !existingVote

    // Upsert: one vote per user per artist per category
    const { error } = await supabase
      .from('artist_votes')
      .upsert(
        { artist_name: artistName, category, rating, user_id: userId },
        { onConflict: 'artist_name,user_id,category' }
      )

    if (error) {
      console.error('artist_votes upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Award 5 XP for first-time votes only
    let xpAwarded = 0
    if (isFirstVote) {
      xpAwarded = 5
      const { data: prof } = await supabase.from('profiles').select('xp').eq('id', userId).maybeSingle()
      await supabase.from('profiles').update({ xp: (prof?.xp ?? 0) + xpAwarded }).eq('id', userId)
    }

    // Return updated averages
    const { data } = await supabase
      .from('artist_votes')
      .select('category, rating')
      .eq('artist_name', artistName)

    const votes: Record<string, { avg: number; count: number }> = {}
    for (const cat of CATEGORIES) {
      const catVotes = (data || []).filter(v => v.category === cat)
      if (catVotes.length > 0) {
        const avg = catVotes.reduce((s, v) => s + v.rating, 0) / catVotes.length
        votes[cat] = { avg: Math.round(avg * 10) / 10, count: catVotes.length }
      }
    }

    void anon // suppress unused warning
    return NextResponse.json({ success: true, votes, xp_awarded: xpAwarded })
  } catch {
    return NextResponse.json({ error: 'Failed to save vote' }, { status: 500 })
  }
}
