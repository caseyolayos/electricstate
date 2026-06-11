import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Returns the UTC offset (in ms) for a given moment in the target timezone
function getTimezoneOffsetMs(utcDate: Date, tzName: string): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(utcDate)
    const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value ?? '0')
    const localDate = new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second')))
    return localDate.getTime() - utcDate.getTime()
  } catch {
    return 0
  }
}

// Get the UTC Date for a wall-clock time on a given date string in the given timezone
function localWallToUTC(dateStr: string, hours: number, minutes: number, tz: string): Date {
  const pad = (n: number) => String(n).padStart(2, '0')
  const localStr = `${dateStr}T${pad(hours)}:${pad(minutes)}:00`
  const naiveUtc = new Date(localStr + 'Z') // treat as UTC first
  const offsetMs = getTimezoneOffsetMs(naiveUtc, tz)
  return new Date(naiveUtc.getTime() - offsetMs)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      name, venue, city, date, time, genres, lineup, ticketLink,
      description, eventType, neighborhood, fullAddress, revealAt, coverCharge,
      timezone, userId, organizer_name,
    } = body

    if (!name || !city || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServerClient()

    const slug = slugify(name)

    // Geocode the location using Nominatim
    let lat: number | null = null
    let lng: number | null = null
    try {
      const query = fullAddress || (venue ? `${venue}, ${city}` : city)
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'ElectricStateApp/1.0' } }
      )
      const geoData = await geoRes.json()
      if (geoData?.[0]) {
        lat = parseFloat(geoData[0].lat)
        lng = parseFloat(geoData[0].lon)
      }
    } catch { /* geocoding failed — coords will be null */ }

    // Try to match organizer_name to an existing organizer
    let resolvedOrganizerSlug: string | null = null
    if (organizer_name && typeof organizer_name === 'string' && organizer_name.trim()) {
      try {
        const { data: orgMatch } = await supabase
          .from('organizers')
          .select('slug')
          .ilike('name', `%${organizer_name.trim()}%`)
          .limit(1)
          .maybeSingle()
        if (orgMatch?.slug) resolvedOrganizerSlug = orgMatch.slug
      } catch { /* non-blocking */ }
    }

    const record: Record<string, unknown> = {
      name,
      city,
      date_start: date,
      venue: eventType === 'underground' ? (neighborhood || city) : (venue || city),
      genre: genres?.length ? genres : ['Electronic'],
      lineup: lineup ? lineup.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      ticket_link: ticketLink || null,
      description: description || null,
      status: 'pending',
      source: 'community',
      slug,
      event_type: eventType || 'mainstream',
      submitted_by: userId || null,
      lat,
      lng,
      organizer_name: organizer_name?.trim() || null,
      organizer_slug: resolvedOrganizerSlug,
    }

    // Underground-specific fields
    if (eventType === 'underground') {
      record.neighborhood = neighborhood || null
      record.full_address = fullAddress || null
      record.cover_charge = coverCharge || null
      if (revealAt) {
        // revealAt is a string like '1h', '3h', '6pm', 'midnight', 'noon'
        // Use the client's timezone to compute the correct UTC timestamp
        const tz = (typeof timezone === 'string' && timezone) ? timezone : 'UTC'

        let revealDate: Date | null = null

        if (revealAt === '1h' || revealAt === '3h') {
          // Relative to event start time — compute start in local timezone then subtract
          const startLocal = time ? parseTime(time, new Date(date + 'T00:00:00Z')) : null
          const defaultHour = 21 // 9pm fallback
          const startUtc = startLocal
            ? localWallToUTC(date, startLocal.getUTCHours(), startLocal.getUTCMinutes(), tz)
            : localWallToUTC(date, defaultHour, 0, tz)
          const hoursBack = revealAt === '1h' ? 1 : 3
          revealDate = new Date(startUtc.getTime() - hoursBack * 3600000)
        } else if (revealAt === '6pm') {
          revealDate = localWallToUTC(date, 18, 0, tz)
        } else if (revealAt === 'midnight') {
          revealDate = localWallToUTC(date, 0, 0, tz)
        } else if (revealAt === 'noon') {
          revealDate = localWallToUTC(date, 12, 0, tz)
        }

        if (revealDate) record.reveal_at = revealDate.toISOString()
      }
    }

    const { data, error } = await supabase
      .from('festivals')
      .insert(record)
      .select('id')
      .single()

    if (error) {
      console.error('Submit error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (err) {
    console.error('Submit route error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function parseTime(timeStr: string, baseDate: Date): Date {
  const d = new Date(baseDate)
  const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)?/i)
  if (!match) return new Date(d.getTime() + 21 * 3600000)
  let hours = parseInt(match[1])
  const mins = parseInt(match[2])
  const ampm = match[3]?.toLowerCase()
  if (ampm === 'pm' && hours !== 12) hours += 12
  if (ampm === 'am' && hours === 12) hours = 0
  d.setHours(hours, mins, 0, 0)
  return d
}
