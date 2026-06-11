import { NextResponse } from 'next/server'
import { Event } from '@/lib/mockData'
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

async function getFestivalEvents(artistName: string): Promise<Event[]> {
  try {
    const supabase = createServerClient()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
    const nameLower = artistName.toLowerCase()

    const { data: festivals, error } = await supabase
      .from('festivals')
      .select('id, name, venue, city, date_start, ticket_link, image_url, lineup_image_url, lineup, lineup_by_day')
      .eq('status', 'approved')
      .gte('date_start', today)
      .order('date_start', { ascending: true })

    if (error || !festivals) return []

    return festivals
      .filter(f => {
        // Check flat lineup array
        const inLineup = Array.isArray(f.lineup) && f.lineup.some((a: string) => a.toLowerCase() === nameLower)
        // Also check lineup_by_day in case lineup wasn't backfilled
        const inByDay = Array.isArray(f.lineup_by_day) && f.lineup_by_day.some(
          (day: { artists: string[] }) => Array.isArray(day.artists) && day.artists.some((a: string) => a.toLowerCase() === nameLower)
        )
        return inLineup || inByDay
      })
      .map(f => ({
        id: `festival-${f.id}`,
        name: f.name,
        venue: f.venue || 'Festival Grounds',
        city: f.city || '',
        date: f.date_start,
        time: 'TBA',
        genre: ['Electronic'],
        ticketLink: f.ticket_link || '#',
        source: 'AI Found' as const,
        description: `${artistName} performing at ${f.name}`,
        lineup: [],
        gradient: 'from-black to-[#0A0A0A]',
        imageUrl: f.lineup_image_url || f.image_url || undefined,
        status: 'approved' as const,
      }))
  } catch {
    return []
  }
}

function toArtistCase(name: string): string {
  return name.replace(/\b\w/g, c => c.toUpperCase())
}

export async function GET(req: Request, { params }: { params: { name: string } }) {
  const artistName = toArtistCase(decodeURIComponent(params.name))

  // Always fetch festival events from Supabase regardless of TM key
  const festivalEvents = await getFestivalEvents(artistName)

  if (!TM_KEY) return NextResponse.json({ events: festivalEvents })

  // Search for the attraction (artist) by name first to get their TM ID
  const attractionRes = await fetch(
    `https://app.ticketmaster.com/discovery/v2/attractions.json?keyword=${encodeURIComponent(artistName)}&size=1&apikey=${TM_KEY}`,
    { next: { revalidate: 3600 } }
  )

  let attractionId: string | null = null
  if (attractionRes.ok) {
    const data = await attractionRes.json()
    attractionId = data._embedded?.attractions?.[0]?.id || null
  }

  // Fetch upcoming events for this artist
  const url = attractionId
    ? `https://app.ticketmaster.com/discovery/v2/events.json?attractionId=${attractionId}&size=20&sort=date,asc&apikey=${TM_KEY}`
    : `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${encodeURIComponent(artistName)}&classificationName=music&size=20&sort=date,asc&apikey=${TM_KEY}`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ events: [] })

  const data = await res.json()
  const items = data._embedded?.events || []
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())

  const events: Event[] = items
    .map((tm: Record<string, unknown>) => {
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
      const date = (start?.localDate as string) || ''

      return {
        id: `tm-${tm.id as string}`,
        name: tm.name as string,
        venue: (venue?.name as string) || 'TBA',
        city: ((venue?.city as Record<string, unknown>)?.name as string) || '',
        date,
        time: ((start?.localTime as string) || 'TBA').slice(0, 5),
        genre: tagGenres([tm.name as string, genre?.name as string, subGenre?.name as string].join(' ')),
        ticketLink: (tm.url as string) || '#',
        source: 'AI Found' as const,
        description: (tm.info as string) || `${tm.name} at ${venue?.name || 'TBA'}.`,
        lineup: lineup.length > 0 ? lineup : [artistName],
        gradient: 'from-black to-[#0A0A0A]',
        imageUrl: img || undefined,
        status: 'approved' as const,
      }
    })
    .filter((e: Event) => e.date >= today)

  // Merge Ticketmaster + festival events, deduplicated and sorted by date
  const allEvents = [...festivalEvents, ...events]
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({ events: allEvents, attractionId })
}
