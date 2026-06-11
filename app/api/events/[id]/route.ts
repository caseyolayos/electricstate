import { NextResponse } from 'next/server'
import { Event } from '@/lib/mockData'
import confirmedFestivals from '@/lib/confirmedFestivals.json'

export const revalidate = 60 // revalidate event details every 60 seconds

const CONFIRMED_SLUGS = new Set(confirmedFestivals.confirmed)

const TM_KEY = process.env.TICKETMASTER_API_KEY
const EB_KEY = process.env.EVENTBRITE_API_KEY

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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const { id } = params

  // Ticketmaster event
  if (id.startsWith('tm-') && TM_KEY) {
    const tmId = id.replace('tm-', '')
    const res = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events/${tmId}.json?apikey=${TM_KEY}`,
      { next: { revalidate: 3600 } }
    )
    if (res.ok) {
      const tm = await res.json()
      const venue = tm._embedded?.venues?.[0]
      const lineup = (tm._embedded?.attractions || []).map((a: { name?: string }) => a.name || '').filter(Boolean).slice(0, 8)
      const img = tm.images?.find((i: { ratio?: string; width?: number }) => i.ratio === '16_9' && (i.width || 0) >= 640)?.url || tm.images?.[0]?.url
      const event: Event = {
        id: `tm-${tm.id}`,
        name: tm.name,
        venue: venue?.name || 'TBA',
        city: venue?.city?.name || 'Los Angeles',
        date: tm.dates?.start?.localDate || '',
        time: tm.dates?.start?.localTime?.slice(0, 5) || 'TBA',
        genre: tagGenres([tm.name, tm.classifications?.[0]?.genre?.name, tm.classifications?.[0]?.subGenre?.name].join(' ')),
        ticketLink: tm.url || '#',
        source: 'AI Found',
        description: tm.info || tm.pleaseNote || `${tm.name} — live in ${venue?.city?.name || 'SoCal'}.`,
        lineup: lineup.length > 0 ? lineup : ['Lineup TBA'],
        gradient: 'from-black to-[#0A0A0A]',
        imageUrl: img || undefined,
        status: 'approved',
      }
      return NextResponse.json({ event })
    }
  }

  // Eventbrite event
  if (id.startsWith('eb-') && EB_KEY) {
    const ebId = id.replace('eb-', '')
    const res = await fetch(
      `https://www.eventbriteapi.com/v3/events/${ebId}/?expand=venue,organizer`,
      { headers: { Authorization: `Bearer ${EB_KEY}` }, next: { revalidate: 3600 } }
    )
    if (res.ok) {
      const eb = await res.json()
      const nameText = eb.name?.text || 'Untitled Event'
      const event: Event = {
        id: `eb-${eb.id}`,
        name: nameText,
        venue: eb.venue?.name || 'TBA',
        city: eb.venue?.city?.name || 'Los Angeles',
        date: eb.start?.local ? eb.start.local.split('T')[0] : '',
        time: eb.start?.local ? eb.start.local.split('T')[1]?.slice(0, 5) : 'TBA',
        genre: tagGenres(nameText + ' ' + (eb.description?.text || '')),
        ticketLink: eb.url || '#',
        source: 'Community Submitted',
        description: eb.description?.text?.slice(0, 500) || `${nameText} at ${eb.venue?.name || 'TBA'}.`,
        lineup: eb.organizer?.name ? [eb.organizer.name] : ['Lineup TBA'],
        gradient: 'from-black to-[#001A00]',
        imageUrl: eb.logo?.original?.url || undefined,
        status: 'approved',
      }
      return NextResponse.json({ event })
    }
  }

  // Festival from Supabase
  if (id.startsWith('festival-')) {
    const festivalId = id.replace('festival-', '')
    const { createServerClient } = await import('@/lib/supabaseServer')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createServerClient()

    // Resolve requesting user (if authenticated) so submitters can preview pending events
    let requestingUserId: string | null = null
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (token) {
      const anonClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await anonClient.auth.getUser(token)
      requestingUserId = user?.id ?? null
    }

    // Fetch the event — approved events are public; pending visible to their submitter
    const { data } = await supabase
      .from('festivals')
      .select('*')
      .eq('id', festivalId)
      .in('status', ['approved', 'pending'])
      .single()

    // Gate pending events to their submitter only
    if (data && data.status === 'pending' && data.submitted_by !== requestingUserId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    if (data) {
      // Fetch all sibling dates (same slug) within 10 days = full multi-day festival range
      let festivalDates: string[] = [data.date_start].filter(Boolean)
      if (data.slug && data.date_start) {
        const anchor = new Date(data.date_start + 'T00:00:00Z')
        const windowStart = new Date(anchor); windowStart.setDate(anchor.getDate() - 10)
        const windowEnd = new Date(anchor); windowEnd.setDate(anchor.getDate() + 10)
        const { data: siblings } = await supabase
          .from('festivals')
          .select('date_start')
          .eq('slug', data.slug)
          .not('date_start', 'is', null)
          .gte('date_start', windowStart.toISOString().split('T')[0])
          .lte('date_start', windowEnd.toISOString().split('T')[0])
          .order('date_start', { ascending: true })
        if (siblings && siblings.length > 1) {
          // Deduplicate dates
          const seen = new Set<string>()
          festivalDates = siblings
            .map((s: { date_start: string }) => s.date_start)
            .filter((d: string) => { if (!d || seen.has(d)) return false; seen.add(d); return true })
        }
      }

      const event: Event = {
        id: `festival-${data.id}`,
        name: data.name,
        venue: data.venue || data.city || 'TBA',
        city: data.city || '',
        date: data.date_start,
        date_end: data.date_end || undefined,
        time: 'TBA',
        genre: data.genre?.length ? data.genre : ['Electronic'],
        ticketLink: data.ticket_link || '#',
        source: 'AI Found' as const,
        description: data.description || `${data.name} — ${data.city || 'Location TBA'}.`,
        lineup: data.lineup?.length ? data.lineup : ['Lineup TBA'],
        gradient: 'from-[#C8FF00]/20 to-black',
        imageUrl: data.image_url || undefined,
        lineupImageUrl: data.lineup_image_url || undefined,
        status: (data.status ?? 'approved') as 'approved' | 'pending',
        // Only expose precise coords once reveal time has passed
        lat: (data.reveal_at && new Date(data.reveal_at) > new Date()) ? undefined : (data.lat || undefined),
        lng: (data.reveal_at && new Date(data.reveal_at) > new Date()) ? undefined : (data.lng || undefined),
        dates_confirmed: data.slug ? CONFIRMED_SLUGS.has(data.slug) : false,
        event_type: data.event_type || 'mainstream',
        neighborhood: data.neighborhood || undefined,
        cover_charge: data.cover_charge || undefined,
        reveal_at: data.reveal_at || undefined,
        // Only expose full_address once reveal time has passed
        full_address: data.reveal_at && new Date(data.reveal_at) <= new Date()
          ? (data.full_address || undefined)
          : undefined,
        submitted_by: data.submitted_by || undefined,
        youtube_video_id: data.youtube_video_id || undefined,
        livestreams: (data.livestreams as { label: string; url: string }[] | null) || undefined,
      }
      return NextResponse.json({ event, festivalDates })
    }
  }

  // Community event from Supabase (submitted via /submit, event_type != 'festival')
  if (id.startsWith('community-')) {
    const communityId = id.replace('community-', '')
    const { createServerClient: createSC } = await import('@/lib/supabaseServer')
    const { createClient: createAnonClient } = await import('@supabase/supabase-js')
    const supabase2 = createSC()

    // Resolve requesting user for pending event gating
    let reqUserId: string | null = null
    const authHeader2 = req.headers.get('authorization')
    const token2 = authHeader2?.replace('Bearer ', '')
    if (token2) {
      const anonClient2 = createAnonClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await anonClient2.auth.getUser(token2)
      reqUserId = user?.id ?? null
    }

    const { data: row } = await supabase2
      .from('festivals')
      .select('*')
      .eq('id', communityId)
      .in('status', ['approved', 'pending'])
      .single()

    if (!row) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    if (row.status === 'pending' && row.submitted_by !== reqUserId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const locationRevealed = !row.reveal_at || new Date(row.reveal_at) <= new Date()
    const event: Event = {
      id: `community-${row.id}`,
      name: row.name,
      venue: row.venue || row.city || 'TBA',
      city: row.city || '',
      date: row.date_start,
      date_end: row.date_end || undefined,
      time: 'TBA',
      genre: row.genre?.length ? row.genre : ['Electronic'],
      ticketLink: row.ticket_link || '#',
      source: 'Community Submitted' as const,
      description: row.description || `${row.name} — ${row.city || 'Location TBA'}.`,
      lineup: row.lineup?.length ? row.lineup : ['Lineup TBA'],
      gradient: 'from-black to-[#0A0A0A]',
      imageUrl: row.image_url || undefined,
      status: (row.status ?? 'approved') as 'approved' | 'pending',
      lat: locationRevealed ? (row.lat || undefined) : undefined,
      lng: locationRevealed ? (row.lng || undefined) : undefined,
      event_type: row.event_type || 'mainstream',
      neighborhood: row.neighborhood || undefined,
      cover_charge: row.cover_charge || undefined,
      reveal_at: row.reveal_at || undefined,
      full_address: locationRevealed ? (row.full_address || undefined) : undefined,
      submitted_by: row.submitted_by || undefined,
    }
    return NextResponse.json({ event })
  }

  return NextResponse.json({ error: 'Event not found' }, { status: 404 })
}
