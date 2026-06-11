import { createClient } from '@supabase/supabase-js'
import { Metadata } from 'next'
import { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://www.electricstate.app'

interface Props {
  children: ReactNode
  params: { id: string }
}

function formatDateRange(start: string, end?: string): string {
  const fmt = (s: string) => new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  })
  return end && end !== start ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Festival events
  if (id.startsWith('festival-')) {
    const festivalId = id.replace('festival-', '')
    try {
      const { data: festival } = await supabase
        .from('festivals')
        .select('name, date_start, date_end, genre, city, venue')
        .eq('id', festivalId)
        .maybeSingle()

      if (festival) {
        const name = festival.name ?? 'Festival'
        const genres: string[] = festival.genre ?? []
        const dateStr = festival.date_start ? formatDateRange(festival.date_start, festival.date_end) : ''
        const location = [festival.venue, festival.city].filter(Boolean).join(', ')
        const description = `${name}${dateStr ? ` · ${dateStr}` : ''}${location ? ` · ${location}` : ''}${genres.length > 0 ? ` · ${genres.slice(0, 3).join(', ')}` : ''} — Track it on Electric State Passport.`
        const ogImageUrl = `${BASE_URL}/api/og/festival/${id}`

        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'MusicEvent',
          name,
          description,
          url: `${BASE_URL}/events/${id}`,
          startDate: festival.date_start,
          endDate: festival.date_end || festival.date_start,
          location: location ? { '@type': 'Place', name: location } : undefined,
          genre: genres,
          organizer: { '@type': 'Organization', name: 'Electric State', url: BASE_URL },
        }

        return {
          title: name,
          description,
          alternates: { canonical: `${BASE_URL}/events/${id}` },
          openGraph: {
            title: name,
            description,
            url: `${BASE_URL}/events/${id}`,
            images: [{ url: ogImageUrl, width: 1200, height: 630, alt: name }],
            type: 'website',
          },
          twitter: {
            card: 'summary_large_image',
            title: name,
            description,
            images: [ogImageUrl],
          },
          other: {
            'ld+json': JSON.stringify(jsonLd),
          },
        }
      }
    } catch { /* fall through */ }
  }

  // Regular events
  try {
    const { data: event } = await supabase
      .from('events')
      .select('name, venue, city, date, genre, description, lineup')
      .eq('id', id)
      .maybeSingle()

    if (event) {
      const name = event.name ?? 'Event'
      const genres: string[] = event.genre ?? []
      const lineup: string[] = event.lineup ?? []
      const dateStr = event.date ? formatDateRange(event.date) : ''
      const location = [event.venue, event.city].filter(Boolean).join(', ')
      const lineupStr = lineup.slice(0, 3).join(', ')
      const description = event.description
        ? event.description.slice(0, 155).replace(/\s+$/, '') + (event.description.length > 155 ? '…' : '')
        : `${name}${dateStr ? ` · ${dateStr}` : ''}${location ? ` at ${location}` : ''}${lineupStr ? ` ft. ${lineupStr}` : ''}${genres.length ? ` · ${genres.slice(0, 2).join(', ')}` : ''}. Get tickets on Electric State.`
      const ogImageUrl = `${BASE_URL}/api/og/home`

      const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'MusicEvent',
        name,
        description,
        url: `${BASE_URL}/events/${id}`,
        startDate: event.date,
        location: location ? {
          '@type': 'Place',
          name: location,
          address: { '@type': 'PostalAddress', addressLocality: event.city, addressRegion: 'CA' },
        } : undefined,
        genre: genres,
        performer: lineup.map((a) => ({ '@type': 'MusicGroup', name: a })),
        organizer: { '@type': 'Organization', name: 'Electric State', url: BASE_URL },
      }

      return {
        title: name,
        description,
        alternates: { canonical: `${BASE_URL}/events/${id}` },
        openGraph: {
          title: name,
          description,
          url: `${BASE_URL}/events/${id}`,
          images: [{ url: ogImageUrl, width: 1200, height: 630, alt: name }],
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: name,
          description,
          images: [ogImageUrl],
        },
        other: {
          'ld+json': JSON.stringify(jsonLd),
        },
      }
    }
  } catch { /* fall through */ }

  return {
    title: 'Event',
    description: 'Discover this event on Electric State — the passport app for underground electronic music.',
  }
}

export default function EventLayout({ children }: Props) {
  return <>{children}</>
}
