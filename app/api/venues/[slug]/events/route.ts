import { NextResponse } from 'next/server'
import { Event } from '@/lib/mockData'
import { lookupKnownVenue, canonicalizeVenueName } from '@/lib/knownVenues'
import { createServerClient } from '@/lib/supabaseServer'

const TM_KEY = process.env.TICKETMASTER_API_KEY

function tagGenres(text: string): string[] {
  const t = text.toLowerCase()
  const tags: string[] = []
  if (t.includes('house')) tags.push('House')
  if (t.includes('techno')) tags.push('Techno')
  if (t.includes('trance')) tags.push('Trance')
  if (t.includes('drum') && (t.includes('bass') || t.includes('dnb'))) tags.push('DNB')
  if ((t.includes('bass') || t.includes('dubstep')) && !tags.includes('DNB')) tags.push('Bass')
  if (t.includes('edm') || t.includes('electronic') || t.includes('dance')) tags.push('Electronic')
  return tags.length > 0 ? tags.filter((v, i) => tags.indexOf(v) === i) : ['Music']
}

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url)
  const venueName = searchParams.get('name') || params.slug.replace(/-/g, ' ')
  const city = searchParams.get('city') || ''
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!TM_KEY) return NextResponse.json({ events: [] })

  // Check our verified venue list first — overrides TM when it returns wrong results
  const knownVenue = lookupKnownVenue(venueName, city)

  // Search TM for the venue — include city to disambiguate common names
  const venueKeyword = city ? `${venueName} ${city}` : venueName
  const venueSearchParams = new URLSearchParams({
    keyword: venueKeyword,
    countryCode: 'US',
    apikey: TM_KEY,
    size: '5',
  })
  // Bias search geographically if we have coordinates
  if (lat && lng) venueSearchParams.set('latlong', `${lat},${lng}`)

  const venueRes = await fetch(
    `https://app.ticketmaster.com/discovery/v2/venues.json?${venueSearchParams}`,
    { next: { revalidate: 3600 } }
  )

  let venueId: string | null = null
  let venueLat: number | undefined = knownVenue?.lat
  let venueLng: number | undefined = knownVenue?.lng
  if (!knownVenue && venueRes.ok) {
    const venueData = await venueRes.json()
    const candidates: Record<string, unknown>[] = venueData._embedded?.venues || []

    // Pick best match: prefer a result whose city/state matches what we know
    const cityLower = city.toLowerCase()
    const best = candidates.find(v => {
      const vCity = ((v.city as Record<string,unknown>)?.name as string || '').toLowerCase()
      const vState = ((v.state as Record<string,unknown>)?.name as string || '').toLowerCase()
      const vCode  = ((v.state as Record<string,unknown>)?.stateCode as string || '').toLowerCase()
      return cityLower && (vCity.includes(cityLower) || cityLower.includes(vCity) || vState.includes(cityLower) || vCode === cityLower)
    }) ?? candidates[0]

    if (best) {
      venueId = best.id as string
      const loc = best.location as Record<string, unknown> | undefined
      venueLat = loc?.latitude ? parseFloat(loc.latitude as string) : undefined
      venueLng = loc?.longitude ? parseFloat(loc.longitude as string) : undefined
    }
  }

  // Fetch events at this venue
  const url = venueId
    ? `https://app.ticketmaster.com/discovery/v2/events.json?venueId=${venueId}&classificationName=music&size=20&sort=date,asc&apikey=${TM_KEY}`
    : `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(venueName)}&classificationName=music&size=20&sort=date,asc&apikey=${TM_KEY}`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ events: [] })

  const data = await res.json()
  const items = data._embedded?.events || []

  const events: Event[] = items.map((tm: Record<string, unknown>) => {
    const venues = (tm._embedded as Record<string, unknown>)?._embedded
    const venue = ((tm._embedded as Record<string, unknown>)?.venues as Record<string, unknown>[])?.[0]
    const attractions = ((tm._embedded as Record<string, unknown>)?.attractions as Record<string, unknown>[]) || []
    const lineup = attractions.map((a: Record<string, unknown>) => a.name as string).filter(Boolean).slice(0, 6)
    const images = (tm.images as Record<string, unknown>[]) || []
    const img = images.find((i: Record<string, unknown>) => i.ratio === '16_9' && (i.width as number) >= 640)?.url as string || images[0]?.url as string
    const dates = tm.dates as Record<string, unknown>
    const start = (dates?.start as Record<string, unknown>)
    const classifications = (tm.classifications as Record<string, unknown>[]) || []
    const genre = classifications[0]?.genre as Record<string, unknown>
    const subGenre = classifications[0]?.subGenre as Record<string, unknown>

    return {
      id: `tm-${tm.id as string}`,
      name: tm.name as string,
      venue: canonicalizeVenueName((venue?.name as string) || venueName),
      city: ((venue?.city as Record<string, unknown>)?.name as string) || '',
      date: (start?.localDate as string) || '',
      time: ((start?.localTime as string) || 'TBA').slice(0, 5),
      genre: tagGenres([tm.name as string, genre?.name as string, subGenre?.name as string].join(' ')),
      ticketLink: (tm.url as string) || '#',
      source: 'AI Found' as const,
      description: (tm.info as string) || (tm.pleaseNote as string) || `${tm.name} at ${venueName}.`,
      lineup: lineup.length > 0 ? lineup : ['Lineup TBA'],
      gradient: 'from-black to-[#0A0A0A]',
      imageUrl: img || undefined,
      status: 'approved' as const,
      lat: venueLat,
      lng: venueLng,
    }
  }).filter((e: Event) => e.date >= new Date().toISOString().split('T')[0])

  // ── Supabase festivals for this venue ──────────────────────────────────────
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  let supabaseEvents: Event[] = []
  try {
    const supabase = createServerClient()
    const { data: festivalRows } = await supabase
      .from('festivals')
      .select('id, name, venue, city, date_start, genre, lineup, ticket_link, image_url, lat, lng, slug, description')
      .eq('status', 'approved')
      .gte('date_start', today)
      .ilike('venue', `%${venueName}%`)
      .order('date_start', { ascending: true })

    if (festivalRows?.length) {
      supabaseEvents = (festivalRows as Record<string, unknown>[]).map(f => ({
        id: `festival-${f.id as string}`,
        name: f.name as string,
        venue: (f.venue as string) || venueName,
        city: (f.city as string) || '',
        date: (f.date_start as string) || '',
        time: 'TBA',
        genre: (f.genre as string[]) || ['Electronic'],
        ticketLink: (f.ticket_link as string) || '#',
        source: 'Community Submitted' as const,
        description: (f.description as string) || `${f.name as string} at ${venueName}.`,
        lineup: (f.lineup as string[]) || ['Lineup TBA'],
        gradient: 'from-black to-[#0A0A0A]',
        imageUrl: (f.image_url as string) || undefined,
        status: 'approved' as const,
        lat: (f.lat as number) || venueLat,
        lng: (f.lng as number) || venueLng,
      }))

      // Use venue coords from Supabase if we don't have them yet
      if (!venueLat && festivalRows[0].lat) venueLat = festivalRows[0].lat as number
      if (!venueLng && festivalRows[0].lng) venueLng = festivalRows[0].lng as number
    }
  } catch {
    // Supabase unavailable — continue with TM-only results
  }

  // Merge: Supabase first, then TM. Deduplicate by normalized name+date.
  const seen = new Set<string>()
  const allEvents: Event[] = [...supabaseEvents, ...events].filter(e => {
    const key = `${e.name.toLowerCase().trim()}::${e.date}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ events: allEvents, venueLat, venueLng })
}
