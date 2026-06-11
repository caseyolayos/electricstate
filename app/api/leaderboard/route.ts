import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export const revalidate = 300 // cache for 5 minutes

export interface RaverEntry {
  rank: number
  id: string
  username: string | null
  display_name: string | null
  avatar_emoji: string
  avatar_url: string | null
  xp: number
  badge_count: number
  attended_count: number
}

export interface FestivalEntry {
  rank: number
  slug: string
  festival_id: string
  name: string
  city: string | null
  image_url: string | null
  date_start: string | null
  avg_score: number
  raver_count: number   // distinct voters
  vote_count: number    // total votes cast
}

export interface ArtistEntry {
  rank: number
  artist_name: string
  avg_score: number
  rater_count: number
  vote_count: number
  categories: Record<string, number>
}

export interface VenueEntry {
  rank: number
  venue_slug: string
  venue_name: string
  avg_score: number
  rater_count: number
  vote_count: number
  categories: Record<string, number>
}

export interface LeaderboardData {
  ravers: RaverEntry[]
  festivals: FestivalEntry[]
  artists: ArtistEntry[]
  venues: VenueEntry[]
}

export async function GET() {
  const supabase = createServerClient()

  const [raverRes, festVoteRes, artistVoteRes, venueVoteRes, festivalRes] = await Promise.all([
    // Top ravers by XP (only with username so they have a public profile)
    supabase
      .from('profiles')
      .select('id, username, display_name, xp, avatar_emoji, avatar_url, badges, attended_events')
      .not('username', 'is', null)
      .order('xp', { ascending: false })
      .limit(25),

    // All festival votes
    supabase
      .from('festival_votes')
      .select('festival_slug, festival_id, category, rating, user_id')
      .not('festival_slug', 'is', null),

    // All artist votes
    supabase
      .from('artist_votes')
      .select('artist_name, category, rating, user_id'),

    // All venue votes
    supabase
      .from('venue_votes')
      .select('venue_slug, venue_name, category, rating, user_id'),

    // Festival details for joining
    supabase
      .from('festivals')
      .select('id, slug, name, city, image_url, date_start')
      .eq('status', 'approved')
      .not('slug', 'is', null),
  ])

  // ── Ravers ────────────────────────────────────────────────────────────────
  const ravers: RaverEntry[] = (raverRes.data ?? []).map((p, i) => ({
    rank: i + 1,
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar_emoji: p.avatar_emoji || '🎵',
    avatar_url: p.avatar_url,
    xp: p.xp ?? 0,
    badge_count: (p.badges as string[] | null)?.length ?? 0,
    attended_count: (p.attended_events as string[] | null)?.length ?? 0,
  }))

  // ── Festivals ─────────────────────────────────────────────────────────────
  const festDetails = Object.fromEntries(
    (festivalRes.data ?? []).map(f => [f.slug, f])
  )

  // Group votes by slug
  const festGroups: Record<string, { ratings: number[]; users: Set<string>; ids: Set<string> }> = {}
  for (const v of (festVoteRes.data ?? []) as { festival_slug: string; festival_id: string; category: string; rating: number; user_id: string | null }[]) {
    if (!v.festival_slug) continue
    if (!festGroups[v.festival_slug]) {
      festGroups[v.festival_slug] = { ratings: [], users: new Set(), ids: new Set() }
    }
    festGroups[v.festival_slug].ratings.push(v.rating)
    festGroups[v.festival_slug].ids.add(v.festival_id)
    if (v.user_id) festGroups[v.festival_slug].users.add(v.user_id)
  }

  const festivals: FestivalEntry[] = Object.entries(festGroups)
    .map(([slug, { ratings, users, ids }]) => {
      const details = festDetails[slug]
      const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
      return {
        rank: 0,
        slug,
        festival_id: ids.values().next().value ?? '',
        name: details?.name ?? slug,
        city: details?.city ?? null,
        image_url: details?.image_url ?? null,
        date_start: details?.date_start ?? null,
        avg_score: Math.round(avg * 10) / 10,
        raver_count: users.size,
        vote_count: ratings.length,
      }
    })
    .sort((a, b) => b.avg_score - a.avg_score || b.raver_count - a.raver_count)
    .slice(0, 20)
    .map((f, i) => ({ ...f, rank: i + 1 }))

  // Normalize artist names to title case so display is consistent regardless
  // of how they were stored (e.g. "fisher" → "Fisher", "john summit" → "John Summit")
  function toArtistCase(name: string): string {
    return name.replace(/\b\w/g, c => c.toUpperCase())
  }

  // ── Artists ───────────────────────────────────────────────────────────────
  const artistGroups: Record<string, { ratings: number[]; users: Set<string>; cats: Record<string, number[]> }> = {}
  for (const v of (artistVoteRes.data ?? []) as { artist_name: string; category: string; rating: number; user_id: string | null }[]) {
    const normalized = toArtistCase(v.artist_name)
    if (!artistGroups[normalized]) {
      artistGroups[normalized] = { ratings: [], users: new Set(), cats: {} }
    }
    artistGroups[normalized].ratings.push(v.rating)
    if (v.user_id) artistGroups[normalized].users.add(v.user_id)
    if (!artistGroups[normalized].cats[v.category]) {
      artistGroups[normalized].cats[v.category] = []
    }
    artistGroups[normalized].cats[v.category].push(v.rating)
  }

  const artists: ArtistEntry[] = Object.entries(artistGroups)
    .map(([name, { ratings, users, cats }]) => {
      const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
      const categories = Object.fromEntries(
        Object.entries(cats).map(([cat, rs]) => [cat, Math.round((rs.reduce((s, r) => s + r, 0) / rs.length) * 10) / 10])
      )
      return {
        rank: 0,
        artist_name: name,
        avg_score: Math.round(avg * 10) / 10,
        rater_count: users.size,
        vote_count: ratings.length,
        categories,
      }
    })
    .filter(a => a.rater_count >= 1)
    .sort((a, b) => b.avg_score - a.avg_score || b.rater_count - a.rater_count)
    .slice(0, 20)
    .map((a, i) => ({ ...a, rank: i + 1 }))

  // ── Venues ─────────────────────────────────────────────────────────────
  const venueGroups: Record<string, { ratings: number[]; users: Set<string>; cats: Record<string, number[]>; name: string }> = {}
  for (const v of (venueVoteRes.data ?? []) as { venue_slug: string; venue_name: string; category: string; rating: number; user_id: string | null }[]) {
    if (!venueGroups[v.venue_slug]) {
      venueGroups[v.venue_slug] = { ratings: [], users: new Set(), cats: {}, name: v.venue_name }
    }
    venueGroups[v.venue_slug].ratings.push(v.rating)
    if (v.user_id) venueGroups[v.venue_slug].users.add(v.user_id)
    if (!venueGroups[v.venue_slug].cats[v.category]) venueGroups[v.venue_slug].cats[v.category] = []
    venueGroups[v.venue_slug].cats[v.category].push(v.rating)
  }

  const venues: VenueEntry[] = Object.entries(venueGroups)
    .map(([slug, { ratings, users, cats, name }]) => {
      const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length
      const categories = Object.fromEntries(
        Object.entries(cats).map(([cat, rs]) => [cat, Math.round((rs.reduce((s, r) => s + r, 0) / rs.length) * 10) / 10])
      )
      return {
        rank: 0,
        venue_slug: slug,
        venue_name: name,
        avg_score: Math.round(avg * 10) / 10,
        rater_count: users.size,
        vote_count: ratings.length,
        categories,
      }
    })
    .filter(v => v.rater_count >= 1)
    .sort((a, b) => b.avg_score - a.avg_score || b.rater_count - a.rater_count)
    .slice(0, 20)
    .map((v, i) => ({ ...v, rank: i + 1 }))

  return NextResponse.json({ ravers, festivals, artists, venues } as LeaderboardData)
}
