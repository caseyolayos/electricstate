import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Curated named festivals that should always be auto-approved
const NAMED_FESTIVALS = [
  'EDC Las Vegas', 'EDC Orlando', 'Beyond Wonderland', 'Nocturnal Wonderland',
  'Escape Halloween', 'Hard Day of the Dead', 'Dreamstate', 'Factory 93',
  'Countdown NYE Insomniac', 'Forbidden Kingdom', 'Hard Summer',
  'Hard Summer Music Festival', 'Ultra Music Festival', 'Electric Forest',
  'Lightning in a Bottle', 'SnowGlobe Music Festival', 'Dirtybird Campout',
  'Desert Hearts', 'CRSSD Festival', 'Splash House', 'Coachella',
  'Electric Zoo', 'Moonrise Festival', 'Elements Festival', 'Big Dub Festival',
  'Spring Awakening Music Festival', 'BUKU Music Art Project',
  'Movement Electronic Music Festival', 'Dancefestopia', 'Lost Lands',
  'Imagine Music Festival', 'Something Wicked', 'Freaky Deaky',
  'Lights All Night', 'Seismic Dance Event', 'Okeechobee Music Festival',
  'Bass Canyon', 'Paradiso Festival', 'Global Dance Festival', 'Sonic Bloom',
  'Gem and Jam Festival', 'Sun City Music Festival', 'Life is Beautiful',
  'Desert Daze', 'Goldenvoice', 'Do LaB', 'Holy Ship Wrecked',
]

const NAMED_FESTIVALS_LOWER = new Set(NAMED_FESTIVALS.map(n => n.toLowerCase().trim()))

function isNamedFestival(name: string): boolean {
  const lower = name.toLowerCase().trim()
  if (NAMED_FESTIVALS_LOWER.has(lower)) return true
  // Also match if the name contains a named festival (e.g. "EDC Las Vegas 2026")
  return NAMED_FESTIVALS.some(n => lower.includes(n.toLowerCase()))
}

// Known EDM festivals — anything not matching gets rejected
const EDM_KEYWORDS = [
  'edc', 'electric daisy', 'ultra', 'electric forest', 'dreamstate',
  'hard summer', 'hard day', 'beyond wonderland', 'nocturnal', 'lightning in a bottle',
  'snowglobe', 'escape halloween', 'holy ship', 'dirtybird', 'desert hearts',
  'factory 93', 'coachella', 'lollapalooza', 'klangkuenstler', 'sara landry',
  'edm', 'rave', 'techno', 'house music', 'trance', 'dubstep', 'dnb',
  'drum and bass', 'bass music', 'electronic', 'dance music', 'nightclub',
  'sea.hear.now', 'seahearnow',
]

function isEDM(name: string): boolean {
  const lower = name.toLowerCase()
  return EDM_KEYWORDS.some(kw => lower.includes(kw))
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b\d{4}\b/g, '')
    .replace(/\s*[-–—|:]\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(\s+(night|day|evening))?\b.*/gi, '')
    .replace(/\b(day|night)\s*\d+\b/gi, '')
    .replace(/\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*$/gi, '')
    .replace(/\s*[-–—]\s*(presented by|featuring|feat\.|ft\.).*/gi, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 1. Backfill slugs for all festivals missing them
  const { data: allFestivals } = await supabase
    .from('festivals')
    .select('id, name, slug, status')

  // 0. Auto-approve any pending named festivals (fixes records reset by old sync logic)
  let namedApproved = 0
  const pendingNamed = (allFestivals || [])
    .filter(f => f.status === 'pending' && isNamedFestival(f.name))
    .map(f => f.id)
  if (pendingNamed.length > 0) {
    await supabase.from('festivals').update({ status: 'approved' }).in('id', pendingNamed)
    namedApproved = pendingNamed.length
  }

  // Reject non-EDM junk that crept in from broad TM searches
  let junkRejected = 0
  const junkIds = (allFestivals || [])
    .filter(f => f.status === 'pending' && !isEDM(f.name))
    .map(f => f.id)
  if (junkIds.length > 0) {
    await supabase.from('festivals').update({ status: 'rejected' }).in('id', junkIds)
    junkRejected = junkIds.length
  }

  // Backfill slugs
  let slugsWritten = 0
  for (const f of allFestivals || []) {
    const slug = toSlug(f.name)
    if (f.slug !== slug) {
      await supabase.from('festivals').update({ slug }).eq('id', f.id)
      slugsWritten++
    }
  }

  // 2. Dedup: for each slug+year group, keep the best, reject the rest
  const { data: withSlugs } = await supabase
    .from('festivals')
    .select('id, name, slug, status, date_start')
    .not('slug', 'is', null)

  const groups = new Map<string, typeof withSlugs>()
  for (const f of withSlugs || []) {
    if (!f.slug) continue
    const year = f.date_start ? f.date_start.substring(0, 4) : 'none'
    const key = `${f.slug}::${year}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(f)
  }

  let dedupRejected = 0
  for (const group of Array.from(groups.values())) {
    if (!group || group.length <= 1) continue
    const scored = group.map(f => {
      let score = 0
      if (f.status === 'approved') score += 1000
      if (f.status === 'pending') score += 100
      score -= f.name.length
      return { ...f, score }
    })
    scored.sort((a, b) => b.score - a.score)
    const losers = scored.slice(1).filter(f => f.status !== 'rejected')
    if (losers.length > 0) {
      await supabase.from('festivals').update({ status: 'rejected' }).in('id', losers.map(f => f.id))
      dedupRejected += losers.length
    }
  }

  return NextResponse.json({ slugsWritten, dedupRejected, junkRejected, namedApproved, total: allFestivals?.length ?? 0 })
}
