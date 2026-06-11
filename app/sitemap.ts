import { MetadataRoute } from 'next'
import { createServerClient } from '@/lib/supabaseServer'

const BASE_URL = 'https://www.electricstate.app'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createServerClient()

  // Static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/submit`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/promoters`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Dynamic event pages
  const { data: events } = await supabase
    .from('events')
    .select('id, updated_at')
    .eq('status', 'approved')

  const eventRoutes: MetadataRoute.Sitemap = (events ?? []).map((event) => ({
    url: `${BASE_URL}/events/${event.id}`,
    lastModified: event.updated_at ? new Date(event.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Dynamic venue pages (distinct venues from approved events)
  const { data: venueRows } = await supabase
    .from('events')
    .select('venue')
    .eq('status', 'approved')
    .not('venue', 'is', null)

  const uniqueVenues = Array.from(new Set((venueRows ?? []).map((r) => r.venue).filter(Boolean)))
  const venueRoutes: MetadataRoute.Sitemap = uniqueVenues.map((venue) => ({
    url: `${BASE_URL}/venues/${toSlug(venue)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Dynamic artist pages (from event lineups)
  const { data: lineupRows } = await supabase
    .from('events')
    .select('lineup')
    .eq('status', 'approved')
    .not('lineup', 'is', null)

  const allArtists = (lineupRows ?? []).flatMap((r) => r.lineup ?? [])
  const uniqueArtists = Array.from(new Set(allArtists.filter(Boolean)))
  const artistRoutes: MetadataRoute.Sitemap = uniqueArtists.map((artist) => ({
    url: `${BASE_URL}/artists/${encodeURIComponent(artist)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticRoutes, ...eventRoutes, ...venueRoutes, ...artistRoutes]
}
