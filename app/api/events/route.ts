import { NextResponse } from 'next/server'
import { Event, Organizer } from '@/lib/mockData'
import { createServerClient } from '@/lib/supabaseServer'
import confirmedFestivals from '@/lib/confirmedFestivals.json'
import blockedVenueWindows from '@/lib/blockedVenueWindows.json'
import { getCountryInfo } from '@/lib/internationalFestivals'
import { canonicalizeVenueName, lookupKnownVenue } from '@/lib/knownVenues'

const CONFIRMED_SLUGS = new Set(confirmedFestivals.confirmed)
const TM_KEY = process.env.TICKETMASTER_API_KEY
const EB_KEY = process.env.EVENTBRITE_API_KEY

const DEFAULT_LATLONG = '34.0522,-118.2437'
const RADIUS = '75'
const TM_TERMS = ['EDM', 'house music', 'techno', 'bass music', 'trance', 'drum and bass', 'rave', 'electronic music', 'dance music']
const EB_QUERIES = ['EDM', 'techno', 'house music', 'rave', 'trance']

// TM genre names that clearly indicate non-EDM events
const NON_EDM_GENRES = new Set([
  'Rock', 'Pop', 'Country', 'Hip-Hop/Rap', 'R&B', 'Jazz', 'Classical', 'Folk',
  'Latin', 'Metal', 'Punk', 'Blues', 'Reggae', 'Gospel', 'Soul', 'Alternative',
  'Indie', 'Comedy', 'Sports', 'Theatre', 'Arts', 'Family', 'Holiday',
  'Dance', 'Ballet', 'Cabaret', 'Burlesque', 'Variety', 'Magic',
])

// EDM-specific sub-genres and genres TM uses
const EDM_GENRES = new Set([
  'Electronic', 'Dance/Electronic', 'House', 'Techno', 'Trance',
  'Drum and Bass', 'Dubstep', 'Ambient', 'Club/Dance',
])

// Name-based rejection: catch events that slip through genre classification
const NON_EDM_NAME_PATTERNS = [
  /riverdance/i, /drag\s+show/i, /drag\s+brunch/i, /drag\s+queen/i,
  /drag\s+race/i, /ballet/i, /broadway/i, /musical/i, /opera/i,
  /comedy\s+show/i, /stand.?up/i, /open\s+mic/i, /trivia/i,
  /bingo/i, /karaoke/i, /jazz\s+night/i, /swing\s+dance/i,
  /salsa\s+night/i, /latin\s+night/i, /country\s+night/i,
  /jabbawockeez/i,
]

// Suppress TM/EB events at venues we have curated festival listings for
function isVenueBlocked(venueName: string, date: string): boolean {
  const d = date.slice(0, 10)
  return blockedVenueWindows.windows.some(w =>
    venueName.toLowerCase().includes(w.venueName.toLowerCase()) &&
    d >= w.dateStart &&
    d <= w.dateEnd
  )
}

function isTMEventEDM(tm: TMEvent): boolean {
  const cls = tm.classifications?.[0]
  const genreName = cls?.genre?.name ?? ''
  const subGenreName = cls?.subGenre?.name ?? ''

  // Reject by genre
  if (NON_EDM_GENRES.has(genreName)) return false

  // Reject by event name patterns (catches misclassified or unclassified non-EDM events)
  if (NON_EDM_NAME_PATTERNS.some(re => re.test(tm.name))) return false

  // Accept if genre or sub-genre is explicitly EDM
  if (EDM_GENRES.has(genreName) || EDM_GENRES.has(subGenreName)) return true

  // Accept if no classification — TM often leaves underground/niche electronic events untagged
  if (!genreName || genreName === 'Undefined') return true

  // Reject everything else
  return false
}

// ── Types ────────────────────────────────────────────────────────────────────

interface OrganizerRow {
  id: string; slug: string; name: string; description: string | null
  founded_year: number | null; key_people: { name: string; role: string }[] | null
  logo_url: string | null; website: string | null; genres: string[] | null
  instagram: string | null; twitter: string | null
}

function mapOrganizer(o: OrganizerRow): Organizer {
  return {
    id: o.id, slug: o.slug, name: o.name,
    description: o.description || undefined,
    founded_year: o.founded_year || undefined,
    key_people: o.key_people || undefined,
    logo_url: o.logo_url || undefined,
    website: o.website || undefined,
    genres: o.genres || undefined,
    instagram: o.instagram || undefined,
    twitter: o.twitter || undefined,
  }
}

interface FestivalRow {
  id: string; name: string; venue: string | null; city: string | null
  date_start: string; date_end?: string | null; genre: string[] | null; ticket_link: string | null
  description: string | null; lineup: string[] | null; image_url: string | null
  lat: number | null; lng: number | null; slug?: string | null
  organizer_slug?: string | null; organizer_name?: string | null
  organizers?: OrganizerRow | null
}

interface TMVenue { name?: string; city?: { name?: string }; location?: { latitude?: string; longitude?: string } }
interface TMClassification { genre?: { name?: string }; subGenre?: { name?: string } }
interface TMImage { url?: string; ratio?: string; width?: number }
interface TMPriceRange { type?: string; currency?: string; min?: number; max?: number }
interface TMEvent {
  id: string; name: string; url?: string
  dates?: { start?: { localDate?: string; localTime?: string } }
  info?: string; pleaseNote?: string
  _embedded?: { venues?: TMVenue[]; attractions?: Array<{ name?: string }> }
  classifications?: TMClassification[]
  images?: TMImage[]
  priceRanges?: TMPriceRange[]
}

interface EBVenue { name?: string; address?: { localized_address_display?: string }; city?: { name?: string }; latitude?: string; longitude?: string }
interface EBEvent {
  id: string; name?: { text?: string }; description?: { text?: string }
  url?: string; start?: { local?: string }
  logo?: { original?: { url?: string } }
  venue?: EBVenue
  category_id?: string
}

// ── Genre tagging ────────────────────────────────────────────────────────────

function tagGenres(text: string): string[] {
  const t = text.toLowerCase()
  const tags: string[] = []
  if (t.includes('house')) tags.push('House')
  if (t.includes('techno')) tags.push('Techno')
  if (t.includes('trance')) tags.push('Trance')
  if (t.includes('drum') && (t.includes('bass') || t.includes('dnb'))) tags.push('DNB')
  if ((t.includes('bass') || t.includes('dubstep')) && !tags.includes('DNB')) tags.push('Bass')
  if (t.includes('edm') || t.includes('electronic') || t.includes('dance')) tags.push('Electronic')
  return tags.length > 0 ? tags.filter((v, i) => tags.indexOf(v) === i) : ['Electronic']
}

// ── Ticketmaster ─────────────────────────────────────────────────────────────

function mapTMEvent(tm: TMEvent): Event {
  const venue = tm._embedded?.venues?.[0]
  const lineup = (tm._embedded?.attractions || []).map(a => a.name || '').filter(Boolean).slice(0, 6)
  const img = tm.images?.find(i => i.ratio === '16_9' && (i.width || 0) >= 640)?.url || tm.images?.[0]?.url
  const genreText = [
    tm.name,
    tm.classifications?.[0]?.genre?.name,
    tm.classifications?.[0]?.subGenre?.name,
  ].join(' ')

  const rawLat = venue?.location?.latitude ? parseFloat(venue.location.latitude) : undefined
  const rawLng = venue?.location?.longitude ? parseFloat(venue.location.longitude) : undefined
  const canonicalName = canonicalizeVenueName(venue?.name || 'TBA')
  const knownVenue = lookupKnownVenue(canonicalName, venue?.city?.name || '')
  const venueLat = knownVenue?.lat ?? rawLat
  const venueLng = knownVenue?.lng ?? rawLng

  return {
    id: `tm-${tm.id}`,
    name: tm.name,
    venue: canonicalName,
    city: venue?.city?.name || 'Los Angeles',
    lat: venueLat,
    lng: venueLng,
    date: tm.dates?.start?.localDate || '',
    time: tm.dates?.start?.localTime?.slice(0, 5) || 'TBA',
    genre: tagGenres(genreText),
    ticketLink: tm.url || '#',
    source: 'AI Found',
    description: tm.info || tm.pleaseNote || `${tm.name} — live in ${venue?.city?.name || 'SoCal'}.`,
    lineup: lineup.length > 0 ? lineup : ['Lineup TBA'],
    gradient: 'from-black to-[#0A0A0A]',
    imageUrl: img || undefined,
    status: 'approved',
    minPrice: tm.priceRanges?.[0]?.min ?? undefined,
  }
}

async function fetchTMByKeyword(keyword: string, ll: string): Promise<TMEvent[]> {
  if (!TM_KEY) return []
  const p = new URLSearchParams({
    apikey: TM_KEY, keyword, latlong: ll, radius: RADIUS, unit: 'miles',
    classificationName: 'music', sort: 'date,asc', size: '20',
    startDateTime: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
    includePriceRanges: 'yes',
  })
  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${p}`, { next: { revalidate: 3600 } })
  if (!res.ok) return []
  const d = await res.json()
  return d._embedded?.events || []
}

// Fetch ALL events TM has classified as Electronic/Dance in the radius — no keyword needed.
// This catches venue events (e.g. "Saturday Night at Time Nightclub") that don't have
// genre keywords in their title but are correctly tagged by TM's own classification team.
async function fetchTMByClassification(ll: string): Promise<TMEvent[]> {
  if (!TM_KEY) return []
  const startDateTime = new Date().toISOString().split('T')[0] + 'T00:00:00Z'
  // Only the two unambiguous Electronic classifications — 'Dance' and 'Club/Dance' are too broad
  // and pull in Riverdance, drag shows, salsa nights, etc.
  const classifications = ['Electronic', 'Dance/Electronic']
  const results = await Promise.allSettled(
    classifications.map(cls => {
      const p = new URLSearchParams({
        apikey: TM_KEY!, latlong: ll, radius: RADIUS, unit: 'miles',
        classificationName: cls, sort: 'date,asc', size: '100',
        startDateTime, includePriceRanges: 'yes',
      })
      return fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${p}`, { next: { revalidate: 3600 } })
        .then(r => r.ok ? r.json() : { _embedded: null })
        .then(d => (d._embedded?.events || []) as TMEvent[])
    })
  )
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
}

// ── Eventbrite ───────────────────────────────────────────────────────────────

function mapEBEvent(eb: EBEvent): Event {
  const dateStr = eb.start?.local ? eb.start.local.split('T')[0] : ''
  const timeStr = eb.start?.local ? eb.start.local.split('T')[1]?.slice(0, 5) : 'TBA'
  const venueName = canonicalizeVenueName(eb.venue?.name || 'TBA')
  const city = eb.venue?.city?.name || 'Los Angeles'
  const nameText = eb.name?.text || 'Untitled Event'

  return {
    id: `eb-${eb.id}`,
    name: nameText,
    venue: venueName,
    city,
    lat: eb.venue?.latitude ? parseFloat(eb.venue.latitude) : undefined,
    lng: eb.venue?.longitude ? parseFloat(eb.venue.longitude) : undefined,
    date: dateStr,
    time: timeStr || 'TBA',
    genre: tagGenres(nameText + ' ' + (eb.description?.text || '')),
    ticketLink: eb.url || '#',
    source: 'Community Submitted',
    description: eb.description?.text?.slice(0, 300) || `${nameText} at ${venueName}.`,
    lineup: ['Lineup TBA'],
    gradient: 'from-black to-[#001A00]',
    imageUrl: eb.logo?.original?.url || undefined,
    status: 'approved',
  }
}

async function fetchEBByQuery(q: string, lat: string, lng: string): Promise<EBEvent[]> {
  if (!EB_KEY) return []
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const p = new URLSearchParams({
    q,
    'location.latitude': lat,
    'location.longitude': lng,
    'location.within': '75mi',
    categories: '103', expand: 'venue', page_size: '20',
    'start_date.range_start': tomorrow.toISOString(),
    sort_by: 'date',
  })
  const res = await fetch(`https://www.eventbriteapi.com/v3/events/search/?${p}`, {
    headers: { Authorization: `Bearer ${EB_KEY}` },
    next: { revalidate: 3600 },
  })
  if (!res.ok) return []
  const d = await res.json()
  return d.events || []
}

// ── Haversine distance (miles) ──────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// ── Main handler ─────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat') || '34.0522'
  const lng = searchParams.get('lng') || '-118.2437'
  const ll = `${lat},${lng}`

  const allTM: TMEvent[] = []
  const seenTM = new Set<string>()
  const allEB: EBEvent[] = []
  const seenEB = new Set<string>()

  // Fetch TM (keywords + classification sweep) + EB all in parallel
  const [tmKeywordResults, tmClassificationResults, ebResults] = await Promise.all([
    Promise.allSettled(TM_TERMS.map(kw => fetchTMByKeyword(kw, ll))),
    fetchTMByClassification(ll),
    Promise.allSettled(EB_QUERIES.map(q => fetchEBByQuery(q, lat, lng))),
  ])

  for (const r of tmKeywordResults) {
    if (r.status === 'fulfilled') {
      for (const ev of r.value) {
        if (!seenTM.has(ev.id) && isTMEventEDM(ev)) { seenTM.add(ev.id); allTM.push(ev) }
      }
    }
  }
  // Classification results are filtered to Electronic but still run name-pattern check
  for (const ev of tmClassificationResults) {
    if (!seenTM.has(ev.id) && !NON_EDM_NAME_PATTERNS.some(re => re.test(ev.name))) { seenTM.add(ev.id); allTM.push(ev) }
  }

  for (const r of ebResults) {
    if (r.status === 'fulfilled') {
      for (const ev of r.value) {
        if (!seenEB.has(ev.id)) { seenEB.add(ev.id); allEB.push(ev) }
      }
    }
  }

  const tmEventsMapped = allTM.map(mapTMEvent).filter(ev => !isVenueBlocked(ev.venue, ev.date))
  const ebEventsMapped = allEB.map(mapEBEvent).filter(ev => !isVenueBlocked(ev.venue, ev.date))

  // Community-submitted events — geo-filtered within 75 miles
  let communityEvents: Event[] = []
  try {
    const supabaseClient = createServerClient()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
    const { data: communityData } = await supabaseClient
      .from('festivals')
      .select('id, name, venue, city, date_start, genre, ticket_link, description, lineup, image_url, lat, lng, neighborhood, cover_charge, event_type, reveal_at')
      .eq('status', 'approved')
      .eq('source', 'community')
      .neq('event_type', 'festival')
      // Keep multi-day events live until their end date
      .or(`date_end.gte.${today},date_start.gte.${today}`)
      .order('date_start', { ascending: true })
      .limit(200)

    if (communityData?.length) {
      const userLat = parseFloat(lat)
      const userLng = parseFloat(lng)
      communityEvents = communityData
        .filter((e: { lat: number | null; lng: number | null; city: string | null }) => {
          // If coordinates exist, use precise distance check
          if (e.lat != null && e.lng != null) {
            return haversine(userLat, userLng, e.lat, e.lng) <= 75
          }
          // Fallback: include events in SoCal cities without coordinates
          const socal = ['los angeles', 'la', 'santa monica', 'west hollywood', 'culver city',
            'hollywood', 'silverlake', 'echo park', 'dtla', 'long beach', 'anaheim',
            'san diego', 'san bernardino', 'riverside', 'pomona', 'pasadena',
            'inglewood', 'compton', 'torrance', 'carson', 'garden grove',
            'orange', 'irvine', 'newport beach', 'costa mesa', 'huntington beach',
            'palm springs', 'coachella', 'indio', 'temecula', 'ventura', 'oxnard']
          const city = (e.city ?? '').toLowerCase()
          return socal.some(c => city.includes(c))
        })
        .map((e: {
          id: string; name: string; venue: string | null; city: string | null
          date_start: string; genre: string[] | null; ticket_link: string | null
          description: string | null; lineup: string[] | null; image_url: string | null
          lat: number; lng: number; neighborhood: string | null; cover_charge: string | null
          event_type: string | null; reveal_at: string | null
        }) => {
          const locationRevealed = !e.reveal_at || new Date(e.reveal_at) <= new Date()
          return ({
          id: `community-${e.id}`,
          name: e.name,
          venue: e.venue || e.city || 'TBA',
          city: e.city || '',
          lat: locationRevealed ? e.lat : undefined,
          lng: locationRevealed ? e.lng : undefined,
          date: e.date_start,
          time: 'TBA',
          genre: e.genre?.length ? e.genre : ['Electronic'],
          ticketLink: e.ticket_link || '#',
          source: 'Community Submitted' as const,
          description: e.description || `${e.name} — ${e.city || 'Location TBA'}.`,
          lineup: e.lineup?.length ? e.lineup : ['Lineup TBA'],
          gradient: 'from-black to-[#0A0A0A]',
          imageUrl: e.image_url || undefined,
          status: 'approved' as const,
        })
        }
      )
    }
  } catch { /* don't fail the main request */ }

  // Curated festivals always included — no cap (we control this list)
  let festivalEvents: Event[] = []
  try {
    const supabaseClient = createServerClient()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
    // Fetch festivals + their cheapest ticket tier in one query
    const { data: festivalData } = await supabaseClient
      .from('festivals')
      .select('*, ticket_tiers(price_cents), organizers(*)')
      .eq('status', 'approved')
      .eq('event_type', 'festival')
      // Keep multi-day festivals live until their end date
      .or(`date_end.gte.${today},date_start.gte.${today}`)
      .order('date_start', { ascending: true })
      .limit(200)

    if (festivalData?.length) {
      // Deduplicate by slug — only show one listing per festival brand
      const seenSlugs = new Set<string>()
      const dedupedFestivals = festivalData.filter((f: FestivalRow & { slug?: string }) => {
        if (!f.slug) return true
        if (seenSlugs.has(f.slug)) return false
        seenSlugs.add(f.slug)
        return true
      })

      // Auto-feature the soonest upcoming festival
      const featuredId = dedupedFestivals[0]?.id ?? null

      festivalEvents = dedupedFestivals.map((f: FestivalRow & { ticket_tiers?: { price_cents: number }[] }) => {
        const tiers = f.ticket_tiers || []
        const minTierPrice = tiers.length
          ? Math.min(...tiers.map(t => t.price_cents)) / 100
          : undefined
        const countryInfo = getCountryInfo(f.slug)
        const festivalLocationRevealed = !(f as FestivalRow & { reveal_at?: string }).reveal_at ||
          new Date((f as FestivalRow & { reveal_at?: string }).reveal_at!) <= new Date()
        return ({
        id: `festival-${f.id}`,
        name: f.name,
        venue: f.venue || f.city || 'TBA',
        city: f.city || '',
        date: f.date_start,
        date_end: (f as FestivalRow & { date_end?: string }).date_end || undefined,
        time: 'TBA',
        genre: f.genre?.length ? f.genre : ['Electronic'],
        ticketLink: f.ticket_link || '#',
        source: 'AI Found' as const,
        description: f.description || `${f.name} — ${f.city || 'Location TBA'}.`,
        lineup: f.lineup?.length ? f.lineup : ['Lineup TBA'],
        gradient: 'from-[#C8FF00]/20 to-black',
        imageUrl: f.image_url || undefined,
        status: 'approved' as const,
        lat: festivalLocationRevealed ? (f.lat || undefined) : undefined,
        lng: festivalLocationRevealed ? (f.lng || undefined) : undefined,
        dates_confirmed: f.slug ? CONFIRMED_SLUGS.has(f.slug) : false,
        featured: f.id === featuredId,
        slug: f.slug || undefined,
        country_code: countryInfo?.countryCode,
        country_name: countryInfo?.countryName,
        minPrice: minTierPrice,
        livestreams: (f as FestivalRow & { livestreams?: { label: string; url: string }[] }).livestreams || undefined,
        youtube_video_id: (f as FestivalRow & { youtube_video_id?: string }).youtube_video_id || undefined,
        organizer_slug: f.organizer_slug || undefined,
        organizer_name: f.organizer_name || undefined,
        organizer: f.organizers ? mapOrganizer(f.organizers) : undefined,
        })
      })
    }
  } catch { /* don't fail the main request */ }

  // Build a normalized name set from curated festivals to suppress matching TM/EB duplicates.
  // Only suppress when the TM/EB event name *contains* the festival name (not the reverse),
  // and require a minimum length to avoid false positives from short acronyms.
  function normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '')
  }
  const festivalNameTokens = festivalEvents
    .map(f => normalizeName(f.name))
    .filter(fn => fn.length >= 8) // ignore very short names that would over-match
  function isSuppressedByFestival(eventName: string): boolean {
    const norm = normalizeName(eventName)
    return festivalNameTokens.some(fn => norm.includes(fn))
  }

  // TM + EB: filter out anything whose name matches a curated festival, then cap at 120
  const thirdPartyEvents = [...tmEventsMapped, ...ebEventsMapped]
    .filter(ev => !isSuppressedByFestival(ev.name))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 120)

  // Merge: curated festivals + community events + capped third-party, sorted by date
  const combined = [...thirdPartyEvents, ...communityEvents, ...festivalEvents]
    .sort((a, b) => a.date.localeCompare(b.date))

  // Dedupe by id (in case a festival appears in both TM and our DB)
  const seenIds = new Set<string>()
  const deduped = combined.filter(e => {
    if (seenIds.has(e.id)) return false
    seenIds.add(e.id)
    return true
  })

  return NextResponse.json(
    { events: deduped, sources: { ticketmaster: tmEventsMapped.length, eventbrite: ebEventsMapped.length }, total: deduped.length },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
