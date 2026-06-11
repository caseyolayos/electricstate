import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import blockedVenueWindows from '@/lib/blockedVenueWindows.json'

export const dynamic = 'force-dynamic'

const TM_KEY = process.env.TICKETMASTER_API_KEY

export interface SearchResult {
  type: 'event' | 'artist' | 'venue' | 'raver'
  id: string
  name: string
  subtitle?: string
  imageUrl?: string
  avatarEmoji?: string
  href: string
}

// ── Blocked venue windows ────────────────────────────────────────────────────

function isVenueBlocked(venueName: string, date: string): boolean {
  const d = date.slice(0, 10)
  return blockedVenueWindows.windows.some(w =>
    venueName.toLowerCase().includes(w.venueName.toLowerCase()) &&
    d >= w.dateStart &&
    d <= w.dateEnd
  )
}

// ── Ticketmaster helpers ──────────────────────────────────────────────────────

async function tmSearch<T>(path: string, params: Record<string, string>): Promise<T[]> {
  if (!TM_KEY) return []
  const p = new URLSearchParams({ apikey: TM_KEY, size: '5', ...params })
  try {
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), 4000) // 4s max
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/${path}.json?${p}`, {
      next: { revalidate: 60 },
      signal: ctrl.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return []
    const d = await res.json()
    return (d._embedded?.[path] as T[]) || []
  } catch {
    return []
  }
}

interface TMEventResult {
  id: string
  name: string
  dates?: { start?: { localDate?: string } }
  _embedded?: { venues?: Array<{ name?: string; city?: { name?: string } }> }
  images?: Array<{ url?: string; ratio?: string; width?: number }>
}

interface TMAttractionResult {
  id: string
  name: string
  images?: Array<{ url?: string; ratio?: string; width?: number }>
  classifications?: Array<{ genre?: { name?: string } }>
}

interface TMVenueResult {
  id: string
  name: string
  city?: { name?: string }
  state?: { name?: string }
  images?: Array<{ url?: string }>
}

function bestImage(images?: Array<{ url?: string; ratio?: string; width?: number }>): string | undefined {
  if (!images?.length) return undefined
  return (
    images.find(i => i.ratio === '16_9' && (i.width || 0) >= 640)?.url ||
    images[0]?.url
  )
}

// ── Supabase festivals ───────────────────────────────────────────────────────

interface FestivalRow {
  id: string
  name: string
  city?: string | null
  date_start?: string | null
  image_url?: string | null
  slug?: string | null
}

async function searchFestivals(q: string): Promise<SearchResult[]> {
  try {
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data } = await supabaseClient
      .from('festivals')
      .select('id, name, city, date_start, image_url, slug')
      .eq('status', 'approved')
      .ilike('name', `%${q}%`)
      .limit(5)

    if (!data?.length) return []
    return (data as FestivalRow[]).map(f => ({
      type: 'event',
      id: `festival-${f.id}`,
      name: f.name,
      subtitle: [f.city, f.date_start].filter(Boolean).join(' · '),
      imageUrl: f.image_url || undefined,
      href: `/events/festival-${f.id}`,
    }))
  } catch {
    return []
  }
}

// ── Raver search ─────────────────────────────────────────────────────────────

async function searchRavers(q: string): Promise<SearchResult[]> {
  try {
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const cols = 'id, username, display_name, avatar_emoji, avatar_url, xp'

    // Two separate ilike queries (OR across columns isn't reliable in .or())
    const [byUsername, byDisplay] = await Promise.all([
      supabaseClient.from('profiles').select(cols).not('username', 'is', null).ilike('username', `%${q}%`).limit(5),
      supabaseClient.from('profiles').select(cols).not('username', 'is', null).ilike('display_name', `%${q}%`).limit(5),
    ])

    type Row = { id: string; username: string; display_name: string | null; avatar_emoji: string; avatar_url: string | null; xp: number }
    const seen = new Set<string>()
    const rows: Row[] = []
    for (const r of [...(byUsername.data ?? []), ...(byDisplay.data ?? [])] as Row[]) {
      if (!seen.has(r.id)) { seen.add(r.id); rows.push(r) }
    }

    return rows.slice(0, 5).map(p => ({
      type: 'raver' as const,
      id: `raver-${p.id}`,
      name: p.display_name || p.username,
      subtitle: `@${p.username} · ${p.xp.toLocaleString()} XP`,
      imageUrl: p.avatar_url || undefined,
      avatarEmoji: p.avatar_emoji || '🎵',
      href: `/passport/${p.username}`,
    }))
  } catch {
    return []
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const [tmEvents, tmArtists, tmVenues, festivalResults, raverResults] = await Promise.all([
    // Events — no location filter, broad search
    tmSearch<TMEventResult>('events', {
      keyword: q,
      classificationName: 'music',
      sort: 'date,asc',
      startDateTime: new Date().toISOString().split('.')[0] + 'Z',
    }),
    // Artists (TM calls them "attractions")
    tmSearch<TMAttractionResult>('attractions', { keyword: q }),
    // Venues
    tmSearch<TMVenueResult>('venues', { keyword: q }),
    // Supabase festivals
    searchFestivals(q),
    // Ravers
    searchRavers(q),
  ])

  const eventResults: SearchResult[] = tmEvents
    .filter(ev => {
      const venueName = ev._embedded?.venues?.[0]?.name ?? ''
      const date = ev.dates?.start?.localDate ?? ''
      return !isVenueBlocked(venueName, date)
    })
    .map(ev => {
      const venue = ev._embedded?.venues?.[0]
      return {
        type: 'event',
        id: `tm-${ev.id}`,
        name: ev.name,
        subtitle: [venue?.name, venue?.city?.name, ev.dates?.start?.localDate].filter(Boolean).join(' · '),
        imageUrl: bestImage(ev.images),
        href: `/events/tm-${ev.id}`,
      }
    })

  const artistResults: SearchResult[] = tmArtists.map(a => {
    const genre = a.classifications?.[0]?.genre?.name
    return {
      type: 'artist',
      id: `tm-artist-${a.id}`,
      name: a.name,
      subtitle: genre && genre !== 'Undefined' ? genre : 'Artist',
      imageUrl: bestImage(a.images),
      href: `/artists/${encodeURIComponent(a.name)}`,
    }
  })

  const venueResults: SearchResult[] = tmVenues.map(v => ({
    type: 'venue',
    id: `tm-venue-${v.id}`,
    name: v.name,
    subtitle: [v.city?.name, v.state?.name].filter(Boolean).join(', '),
    imageUrl: v.images?.[0]?.url,
    href: `/venues/${encodeURIComponent(v.name.toLowerCase().replace(/\s+/g, '-'))}?name=${encodeURIComponent(v.name)}${v.city?.name ? `&city=${encodeURIComponent(v.city.name)}` : ''}`,
  }))

  // Ravers first (direct person searches), then events, artists, venues
  const allResults: SearchResult[] = [
    ...raverResults,
    ...festivalResults,
    ...eventResults,
    ...artistResults,
    ...venueResults,
  ]

  // Deduplicate within each type by name, but allow same name across different types
  // e.g. "SOSA" the event and "Sosa" the raver should both appear
  const seen = new Set<string>()
  const deduped = allResults.filter(r => {
    const key = `${r.type}::${r.name.toLowerCase()}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ results: deduped.slice(0, 12) })
}
