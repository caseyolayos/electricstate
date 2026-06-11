import { createServerClient } from '@/lib/supabaseServer'
import { NextResponse } from 'next/server'

export const revalidate = 300

interface GraphNode {
  id: string
  type: 'organizer' | 'festival' | 'artist' | 'venue'
  label: string
  val: number        // controls node size
  color: string
  imageUrl?: string
  slug?: string      // for navigation
  entityId?: string  // original DB id
}

interface GraphLink {
  source: string
  target: string
  type: 'organized_by' | 'lineup' | 'at_venue'
}

const NODE_COLORS = {
  organizer: '#C8FF00',
  festival:  '#7C3AED',
  artist:    '#F59E0B',
  venue:     '#0891B2',
}

export async function GET() {
  const supabase = createServerClient()
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date())

  // Fetch all organizers
  const { data: organizers } = await supabase
    .from('organizers')
    .select('id, slug, name, logo_url')

  // Fetch upcoming approved festivals with organizer + lineup + venue
  const { data: festivals } = await supabase
    .from('festivals')
    .select('id, name, slug, image_url, organizer_slug, lineup, venue, city')
    .eq('status', 'approved')
    .or(`date_end.gte.${today},and(date_end.is.null,date_start.gte.${today})`)
    .limit(100)

  const nodes: GraphNode[] = []
  const links: GraphLink[] = []

  // Add organizer nodes
  const orgIds = new Set<string>()
  for (const org of organizers || []) {
    const nodeId = `org-${org.slug}`
    nodes.push({
      id: nodeId,
      type: 'organizer',
      label: org.name,
      val: 20,
      color: NODE_COLORS.organizer,
      imageUrl: org.logo_url || undefined,
      slug: org.slug,
    })
    orgIds.add(org.slug)
  }

  // Track artist appearances for sizing
  const artistCount: Record<string, number> = {}
  const venueSet = new Set<string>()

  for (const f of festivals || []) {
    // Add festival node
    const festNodeId = `festival-${f.id}`
    nodes.push({
      id: festNodeId,
      type: 'festival',
      label: f.name,
      val: 12,
      color: NODE_COLORS.festival,
      imageUrl: f.image_url || undefined,
      slug: f.slug || undefined,
      entityId: f.id,
    })

    // Link festival → organizer
    if (f.organizer_slug && orgIds.has(f.organizer_slug)) {
      links.push({ source: festNodeId, target: `org-${f.organizer_slug}`, type: 'organized_by' })
    }

    // Count artist appearances
    const lineup: string[] = f.lineup || []
    for (const artist of lineup) {
      if (!artist || artist === 'Lineup TBA') continue
      artistCount[artist] = (artistCount[artist] || 0) + 1
    }

    // Track venue
    if (f.venue && f.venue !== 'TBA' && f.city) {
      const venueKey = `${f.venue}|${f.city}`
      venueSet.add(venueKey)
    }
  }

  // Add artist nodes — only artists appearing in 2+ festivals (keeps graph clean)
  // Cap at 80 artists, sorted by most appearances
  const topArtists = Object.entries(artistCount)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 80)

  const artistNodeIds = new Set<string>()
  for (const [artist] of topArtists) {
    const nodeId = `artist-${artist.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    nodes.push({
      id: nodeId,
      type: 'artist',
      label: artist,
      val: Math.min(3 + artistCount[artist] * 1.5, 10),
      color: NODE_COLORS.artist,
      slug: artist,
    })
    artistNodeIds.add(artist)
  }

  // Add festival → artist links
  for (const f of festivals || []) {
    const festNodeId = `festival-${f.id}`
    const lineup: string[] = f.lineup || []
    for (const artist of lineup) {
      if (!artist || artist === 'Lineup TBA') continue
      if (!artistNodeIds.has(artist)) continue
      const artistNodeId = `artist-${artist.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      links.push({ source: festNodeId, target: artistNodeId, type: 'lineup' })
    }
  }

  // Add venue nodes (cap at 30 most common venues)
  const venueList = Array.from(venueSet).slice(0, 30)
  for (const venueKey of venueList) {
    const [venueName] = venueKey.split('|')
    const nodeId = `venue-${venueName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    nodes.push({
      id: nodeId,
      type: 'venue',
      label: venueName,
      val: 6,
      color: NODE_COLORS.venue,
      slug: venueName, // used for /venues/[slug]
    })
  }

  // Festival → venue links
  for (const f of festivals || []) {
    if (!f.venue || f.venue === 'TBA') continue
    const venueKey = `${f.venue}|${f.city}`
    if (!venueSet.has(venueKey)) continue
    const festNodeId = `festival-${f.id}`
    const venueNodeId = `venue-${f.venue.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
    links.push({ source: festNodeId, target: venueNodeId, type: 'at_venue' })
  }

  return NextResponse.json({ nodes, links })
}
