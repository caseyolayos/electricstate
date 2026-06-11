import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    // Strip year
    .replace(/\b\d{4}\b/g, '')
    // Strip day-of-week after dash/pipe: "- Friday", "| Saturday Night"
    .replace(/\s*[-–—|:]\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(\s+(night|day|evening))?\b.*/gi, '')
    // Strip "Day 1", "Day 2", "Night 1" etc. anywhere in name
    .replace(/\b(day|night)\s*\d+\b/gi, '')
    // Strip standalone day names that appear to be separators
    .replace(/\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*$/gi, '')
    // Strip "presented by...", "featuring...", "feat./ft." at end
    .replace(/\s*[-–—]\s*(presented by|featuring|feat\.|ft\.).*/gi, '')
    // Remove special chars
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const TM_KEY = process.env.TICKETMASTER_API_KEY

const NAMED_FESTIVALS = [
  // Insomniac
  'EDC Las Vegas',
  'EDC Orlando',
  'Beyond Wonderland',
  'Nocturnal Wonderland',
  'Escape Halloween',
  'Hard Day of the Dead',
  'Dreamstate',
  'Factory 93',
  'Countdown NYE Insomniac',
  'Forbidden Kingdom',
  // HARD Events
  'Hard Summer',
  'Hard Summer Music Festival',
  // Major Independents
  'Ultra Music Festival',
  'Electric Forest',
  'Lightning in a Bottle',
  'SnowGlobe Music Festival',
  'Dirtybird Campout',
  'Desert Hearts',
  'CRSSD Festival',
  'Splash House',
  'Coachella',
  // East Coast
  'Electric Zoo',
  'Moonrise Festival',
  'Elements Festival',
  'Big Dub Festival',
  'Spring Awakening Music Festival',
  'BUKU Music Art Project',
  // Midwest
  'Movement Electronic Music Festival',
  'Dancefestopia',
  'Lost Lands',
  // Southeast
  'Imagine Music Festival',
  'Something Wicked',
  'Freaky Deaky',
  'Lights All Night',
  'Seismic Dance Event',
  'Okeechobee Music Festival',
  // Northwest
  'Bass Canyon',
  'Paradiso Festival',
  // Southwest / Mountain
  'Global Dance Festival',
  'Sonic Bloom',
  'Gem and Jam Festival',
  'Sun City Music Festival',
  'Life is Beautiful',
  // California
  'Desert Daze',
  'Goldenvoice',
  'Do LaB',
  // Holy Ship
  'Holy Ship Wrecked',
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface TMImage { url?: string; ratio?: string; width?: number }
interface TMFestivalEvent {
  id: string; name: string; url?: string
  dates?: { start?: { localDate?: string } }
  images?: TMImage[]
  _embedded?: {
    venues?: Array<{
      name?: string
      city?: { name?: string }
      state?: { stateCode?: string }
      location?: { latitude?: string; longitude?: string }
    }>
    attractions?: Array<{ name?: string }>
  }
}

// ── Name relevance filter ────────────────────────────────────────────────────
// Only keep TM results that actually match the search keyword.
// Prevents broad TM searches from returning unrelated events.
function matchesKeyword(eventName: string, keyword: string): boolean {
  const name = eventName.toLowerCase()
  const kw = keyword.toLowerCase()
  if (name.includes(kw)) return true
  // Check if the first two significant words (>3 chars) of the keyword both appear in the name
  const kwWords = kw.split(/\s+/).filter(w => w.length > 3)
  if (kwWords.length >= 2) return kwWords.slice(0, 2).every(w => name.includes(w))
  return kwWords.length > 0 && name.includes(kwWords[0])
}

// ── TM fetch ──────────────────────────────────────────────────────────────────

async function fetchTMFestivals(keyword: string): Promise<TMFestivalEvent[]> {
  if (!TM_KEY) return []
  const p = new URLSearchParams({
    apikey: TM_KEY,
    keyword,
    classificationName: 'music',
    sort: 'date,asc',
    size: '10',
    startDateTime: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
    countryCode: 'US',
  })
  const res = await fetch(
    `https://app.ticketmaster.com/discovery/v2/events.json?${p}`,
    { next: { revalidate: 0 } }
  )
  if (!res.ok) return []
  const d = await res.json()
  return d._embedded?.events || []
}

// ── Map TM event → festival DB row ────────────────────────────────────────────

function mapTMToFestival(tm: TMFestivalEvent, autoApprove = true) {
  const venue = tm._embedded?.venues?.[0]
  const img =
    tm.images?.find((i: TMImage) => i.ratio === '16_9' && (i.width || 0) >= 640)?.url ||
    tm.images?.[0]?.url
  const lineup = (tm._embedded?.attractions || [])
    .map((a: { name?: string }) => a.name || '')
    .filter(Boolean)

  return {
    name: tm.name,
    slug: toSlug(tm.name),
    venue: venue?.name || null,
    city: venue?.city?.name || null,
    state: venue?.state?.stateCode || null,
    date_start: tm.dates?.start?.localDate || null,
    genre: ['Electronic'],
    ticket_link: tm.url || null,
    image_url: img || null,
    lat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : null,
    lng: venue?.location?.longitude ? parseFloat(venue.location.longitude) : null,
    source: 'ticketmaster',
    external_id: `tm-${tm.id}`,
    status: autoApprove ? 'approved' : 'pending',
    lineup: lineup.slice(0, 10),
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

async function runSync() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all named festivals from TM in parallel
  const results = await Promise.allSettled(
    NAMED_FESTIVALS.map(name => fetchTMFestivals(name))
  )

  // Collect all unique events (dedupe by TM id)
  const seenIds = new Set<string>()
  const uniqueEvents: TMFestivalEvent[] = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const keyword = NAMED_FESTIVALS[i]
    if (result.status === 'fulfilled') {
      for (const ev of result.value) {
        if (!seenIds.has(ev.id) && matchesKeyword(ev.name, keyword)) {
          seenIds.add(ev.id)
          uniqueEvents.push(ev)
        }
      }
    }
  }

  let synced = 0
  const errors: string[] = []

  // Pre-fetch existing external_ids so we don't overwrite status on re-sync
  const { data: existingRecords } = await supabaseAdmin
    .from('festivals')
    .select('external_id')
  const existingIds = new Set(
    (existingRecords || []).map((r: { external_id: string }) => r.external_id)
  )

  for (const ev of uniqueEvents) {
    const mapped = mapTMToFestival(ev, true) // all named festivals auto-approved

    if (existingIds.has(mapped.external_id)) {
      // Record already exists — update metadata but NEVER overwrite status, date range, or lineup
      // date_start and date_end are managed by the dedup logic below
      // lineup is managed manually (flyer scans) and must not be clobbered by TM data
      const { status: _status, date_start: _date_start, lineup: _lineup, ...updateFields } = mapped
      // Also never overwrite date_end — managed by dedup logic
      delete (updateFields as Record<string, unknown>).date_end
      const { error } = await supabaseAdmin
        .from('festivals')
        .update(updateFields)
        .eq('external_id', mapped.external_id)
      if (error) errors.push(`${ev.name}: ${error.message}`)
      else synced++
    } else {
      // New record — insert with approved status
      const { error } = await supabaseAdmin
        .from('festivals')
        .insert(mapped)
      if (error) errors.push(`${ev.name}: ${error.message}`)
      else synced++
    }
  }

  // ── Backfill slugs for existing records that predate the slug column ───────
  try {
    const { data: noSlugs } = await supabaseAdmin
      .from('festivals')
      .select('id, name')
      .is('slug', null)
    if (noSlugs && noSlugs.length > 0) {
      for (const f of noSlugs) {
        await supabaseAdmin
          .from('festivals')
          .update({ slug: toSlug(f.name) })
          .eq('id', f.id)
      }
    }
  } catch { /* backfill failure shouldn't break sync */ }

  // ── Auto-dedup: collapse same-festival multi-day listings ────────────────────
  // Group by slug + year. Within each group, keep the most canonical entry
  // (approved > pending, exact name match, shortest name). Reject the rest.
  let dedupRejected = 0
  try {
    const { data: allWithSlugs } = await supabaseAdmin
      .from('festivals')
      .select('id, name, slug, status, date_start, date_end')
      .not('slug', 'is', null)

    if (allWithSlugs && allWithSlugs.length > 0) {
      // Group by slug + year (so EDC 2026 and EDC 2027 stay separate)
      const groups = new Map<string, typeof allWithSlugs>()
      for (const f of allWithSlugs) {
        if (!f.slug) continue
        const year = f.date_start ? f.date_start.substring(0, 4) : 'none'
        const key = `${f.slug}::${year}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(f)
      }

      const namedSet = new Set(NAMED_FESTIVALS.map(n => n.toLowerCase().trim()))

      for (const group of Array.from(groups.values())) {
        if (group.length <= 1) continue

        // Score: approved wins, then exact name match, then shortest name
        const scored = group.map(f => {
          let score = 0
          if (f.status === 'approved') score += 1000
          if (f.status === 'pending') score += 100
          if (namedSet.has(f.name.toLowerCase().trim())) score += 500
          score -= f.name.length // shorter = more canonical
          return { ...f, score }
        })
        scored.sort((a, b) => b.score - a.score)

        const winner = scored[0]
        const losers = scored.slice(1).filter(f => f.status !== 'rejected')

        // Compute date range from all entries in the group
        const validDates = group.map(f => f.date_start).filter(Boolean).sort()
        const computedStart = validDates[0] ?? winner.date_start
        const computedEnd = validDates[validDates.length - 1] ?? winner.date_start

        // Never shrink an existing date range — only expand it.
        // This prevents the daily sync from overwriting manual corrections
        // when TM is missing day-listings (e.g. only has Day 1 & 2 of a 3-day festival).
        const existingStart = winner.date_start
        const existingEnd = (winner as { date_end?: string | null }).date_end || winner.date_start
        const newStart = computedStart < (existingStart || computedStart) ? computedStart : existingStart
        const newEnd = computedEnd > (existingEnd || computedEnd) ? computedEnd : existingEnd

        // Update only if something actually changed
        if (newStart !== existingStart || newEnd !== (existingEnd ?? null)) {
          await supabaseAdmin
            .from('festivals')
            .update({
              date_start: newStart,
              date_end: newEnd !== newStart ? newEnd : null,
            })
            .eq('id', winner.id)
        }

        if (losers.length > 0) {
          await supabaseAdmin
            .from('festivals')
            .update({ status: 'rejected' })
            .in('id', losers.map(f => f.id))
          dedupRejected += losers.length
        }
      }
    }
  } catch { /* dedup failure shouldn't break sync */ }

  return NextResponse.json({ synced, errors, total: uniqueEvents.length, dedupRejected })
}

// POST — called manually or by internal triggers
export async function POST(request: Request) {
  // Allow if called with SYNC_SECRET or if SUPABASE_SERVICE_ROLE_KEY is present (internal)
  const auth = request.headers.get('Authorization')
  const syncSecret = process.env.SYNC_SECRET
  if (syncSecret && auth !== `Bearer ${syncSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runSync()
}

// GET — called by Vercel cron (crons always use GET)
export async function GET() {
  return runSync()
}
