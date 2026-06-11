/**
 * Server component wrapper for the event detail page.
 *
 * Pre-fetches event data server-side so Googlebot (and other crawlers) receive
 * the full event content in the initial HTML rather than seeing a client-side
 * loading state or "Event Not Found" because the JS fetch timed out.
 *
 * Interactive features (comments, voting, check-in, etc.) live in
 * EventPageClient which hydrates on the client with the pre-fetched data.
 */

import { createServerClient } from '@/lib/supabaseServer'
import { Event, Organizer } from '@/lib/mockData'
import EventPageClient from './EventPageClient'
import confirmedFestivals from '@/lib/confirmedFestivals.json'

const CONFIRMED_SLUGS = new Set(confirmedFestivals.confirmed)

async function fetchEvent(id: string): Promise<Event | null> {
  if (id.startsWith('festival-')) {
    const festivalId = id.replace('festival-', '')
    try {
      const supabase = createServerClient()
      const { data } = await supabase
        .from('festivals')
        .select('*, organizers(*)')
        .eq('id', festivalId)
        .eq('status', 'approved')
        .maybeSingle()

      if (!data) return null

      const locationRevealed = !data.reveal_at || new Date(data.reveal_at) <= new Date()

      return {
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
        lineupByDay: data.lineup_by_day || undefined,
        gradient: 'from-[#C8FF00]/20 to-black',
        imageUrl: data.image_url || undefined,
        lineupImageUrl: data.lineup_image_url || undefined,
        status: (data.status ?? 'approved') as 'approved' | 'pending',
        lat: locationRevealed ? (data.lat || undefined) : undefined,
        lng: locationRevealed ? (data.lng || undefined) : undefined,
        dates_confirmed: data.slug ? CONFIRMED_SLUGS.has(data.slug) : false,
        event_type: data.event_type || 'mainstream',
        neighborhood: data.neighborhood || undefined,
        cover_charge: data.cover_charge || undefined,
        reveal_at: data.reveal_at || undefined,
        full_address: locationRevealed ? (data.full_address || undefined) : undefined,
        submitted_by: data.submitted_by || undefined,
        youtube_video_id: data.youtube_video_id || undefined,
        livestreams: (data.livestreams as { label: string; url: string }[] | null) || undefined,
        organizer_slug: data.organizer_slug || undefined,
        organizer_name: data.organizer_name || undefined,
        organizer: data.organizers ? (data.organizers as Organizer) : undefined,
      }
    } catch {
      return null
    }
  }

  // For TM / EB events, let the client fetch (these are dynamic and not in our DB)
  return null
}

export default async function EventPage({ params }: { params: { id: string } }) {
  const initialEvent = await fetchEvent(params.id)
  return <EventPageClient initialEvent={initialEvent} />
}
