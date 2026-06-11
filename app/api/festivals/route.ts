import { createServerClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export const revalidate = 300 // revalidate festival list every 5 minutes
import { Event, Organizer } from '@/lib/mockData'
import confirmedFestivals from '@/lib/confirmedFestivals.json'
import { getCountryInfo } from '@/lib/internationalFestivals'

const CONFIRMED_SLUGS = new Set(confirmedFestivals.confirmed)

interface OrganizerRow {
  id: string
  slug: string
  name: string
  description: string | null
  founded_year: number | null
  key_people: { name: string; role: string }[] | null
  logo_url: string | null
  website: string | null
  genres: string[] | null
  instagram: string | null
  twitter: string | null
}

interface FestivalRow {
  id: string
  name: string
  venue: string | null
  city: string | null
  date_start: string
  genre: string[] | null
  ticket_link: string | null
  description: string | null
  lineup: string[] | null
  image_url: string | null
  lat: number | null
  lng: number | null
  slug: string | null
  date_end: string | null
  organizer_slug: string | null
  organizer_name: string | null
  organizers: OrganizerRow | null
}

function mapOrganizer(o: OrganizerRow): Organizer {
  return {
    id: o.id,
    slug: o.slug,
    name: o.name,
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

export async function GET() {
  // Use service role key server-side to bypass RLS
  const supabase = createServerClient()

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())
  // Show festivals where end date >= today (covers ongoing multi-day events)
  // OR no end date and start >= today (single-day future events)
  const { data, error } = await supabase
    .from('festivals')
    .select('*, organizers(*)')
    .eq('status', 'approved')
    .eq('event_type', 'festival')
    .or(`date_end.gte.${today},and(date_end.is.null,date_start.gte.${today})`)
    .order('date_start', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ festivals: [], error: error.message })

  // Auto-feature the soonest upcoming festival (first in date-sorted results)
  const featuredId = data?.[0]?.id ?? null

  const festivals: Event[] = (data || []).map((f: FestivalRow) => {
    const countryInfo = getCountryInfo(f.slug)
    return {
      id: `festival-${f.id}`,
      name: f.name,
      venue: f.venue || f.city || 'TBA',
      city: f.city || '',
      date: f.date_start,
      date_end: f.date_end || undefined,
      time: 'TBA',
      genre: f.genre?.length ? f.genre : ['Electronic'],
      ticketLink: f.ticket_link || '#',
      source: 'AI Found' as const,
      description: f.description || `${f.name} — ${f.city || 'Location TBA'}.`,
      lineup: f.lineup?.length ? f.lineup : ['Lineup TBA'],
      gradient: 'from-[#C8FF00]/20 to-black',
      imageUrl: f.image_url || undefined,
      status: 'approved' as const,
      lat: f.lat || undefined,
      lng: f.lng || undefined,
      dates_confirmed: f.slug ? CONFIRMED_SLUGS.has(f.slug) : false,
      featured: f.id === featuredId,
      slug: f.slug || undefined,
      country_code: countryInfo?.countryCode,
      country_name: countryInfo?.countryName,
      organizer_slug: f.organizer_slug || undefined,
      organizer_name: f.organizer_name || undefined,
      organizer: f.organizers ? mapOrganizer(f.organizers) : undefined,
    }
  })

  return NextResponse.json({ festivals, total: festivals.length })
}
