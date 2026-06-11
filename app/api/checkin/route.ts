import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TM_KEY = process.env.TICKETMASTER_API_KEY
const EB_KEY = process.env.EVENTBRITE_API_KEY

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.asin(Math.sqrt(a))
}

export async function POST(request: Request) {
  // 1. Auth — require Bearer token
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accessToken = auth.slice(7)

  // Create supabase client acting as the user
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )

  // Verify the token and get user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  // 2. Parse body
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

  const { eventId, lat, lng, eventName, venueName: clientVenueName, venueCity: clientVenueCity } = body

  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  }

  // lat/lng may be null if the user denied location — distance check is skipped in that case
  const locationAvailable = lat != null && lng != null && !(lat === 0 && lng === 0)

  // 3. Check for duplicate (DB unique constraint is the real guard, this is just a fast pre-check)
  const { data: existing } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', user.id)
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'already_checked_in' }, { status: 409 })

  // 4. Fetch event from authoritative source to verify date + venue
  let eventDate: string | null = null
  let venueName: string | null = null
  let venueCity: string | null = null

  const tmId = eventId.startsWith('tm-') ? eventId.slice(3) : null
  const ebId = eventId.startsWith('eb-') ? eventId.slice(3) : null

  if (tmId && TM_KEY) {
    try {
      const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events/${tmId}.json?apikey=${TM_KEY}`)
      if (res.ok) {
        const data = await res.json()
        eventDate = data.dates?.start?.localDate ?? null
        venueName = data._embedded?.venues?.[0]?.name ?? null
        venueCity = data._embedded?.venues?.[0]?.city?.name ?? null
      }
    } catch { /* fall through to client fallback */ }
  } else if (ebId && EB_KEY) {
    try {
      const res = await fetch(`https://www.eventbriteapi.com/v3/events/${ebId}/?expand=venue`, {
        headers: { Authorization: `Bearer ${EB_KEY}` }
      })
      if (res.ok) {
        const data = await res.json()
        eventDate = data.start?.local?.split('T')[0] ?? null
        venueName = data.venue?.name ?? null
        venueCity = data.venue?.address?.city ?? null
      }
    } catch { /* fall through */ }
  }

  // Fallback to client-provided values if authoritative fetch failed
  if (!eventDate) eventDate = body.eventDate ?? null
  if (!venueName) venueName = clientVenueName ?? null
  if (!venueCity) venueCity = clientVenueCity ?? null

  // 5. Validate: must be within the event date range
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

  // For multi-day festivals, look up date_end from DB
  let eventDateEnd: string | null = body.eventDateEnd ?? null
  if (!eventDateEnd && eventId.startsWith('festival-')) {
    try {
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const festivalId = eventId.slice('festival-'.length)
      const { data: fest } = await adminSupabase
        .from('festivals')
        .select('date_end')
        .eq('id', festivalId)
        .maybeSingle()
      eventDateEnd = fest?.date_end ?? null
    } catch { /* non-blocking */ }
  }

  const effectiveDateEnd = eventDateEnd ?? eventDate

  if (eventDate && (todayStr < eventDate || (effectiveDateEnd && todayStr > effectiveDateEnd))) {
    const d = new Date(eventDate + 'T00:00:00')
    const formatted = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    return NextResponse.json({
      error: 'not_today',
      message: `Check-in opens on ${formatted} — the day of the event.`
    }, { status: 400 })
  }

  // 6. Resolve venue coordinates + check proximity
  let distanceKm: number | null = null
  let venueLat: number | null = null
  let venueLng: number | null = null

  // Only run proximity check if we have a real user location
  if (locationAvailable) {
    // For festival events, use the authoritative lat/lng from the DB — skip Nominatim entirely
    if (eventId.startsWith('festival-')) {
      try {
        const adminSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const festivalIdForGeo = eventId.slice('festival-'.length)
        const { data: festGeo } = await adminSupabase
          .from('festivals')
          .select('lat, lng')
          .eq('id', festivalIdForGeo)
          .maybeSingle()
        if (festGeo?.lat != null && festGeo?.lng != null) {
          venueLat = festGeo.lat
          venueLng = festGeo.lng
          distanceKm = haversineKm(lat, lng, venueLat, venueLng)
        }
      } catch { /* non-blocking — fall through to Nominatim */ }
    }

    // For non-festival events (TM/EB), geocode via Nominatim as before
    if (venueLat == null && venueName && venueCity) {
      try {
        const q = encodeURIComponent(`${venueName}, ${venueCity}`)
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
          { headers: { 'User-Agent': 'ElectricStatePassport/1.0 (contact@esedm.com)' } }
        )
        const geoData = await geoRes.json()
        if (geoData[0]) {
          venueLat = parseFloat(geoData[0].lat)
          venueLng = parseFloat(geoData[0].lon)
          distanceKm = haversineKm(lat, lng, venueLat, venueLng)
        }
      } catch { /* geocoding failed — allow check-in */ }
    }

    if (distanceKm !== null && distanceKm > 0.8) {
      const miles = (distanceKm * 0.621371).toFixed(1)
      return NextResponse.json({
        error: 'too_far',
        message: `You're ${miles} miles from ${venueName}. Get to the show first! 🎵`,
      }, { status: 400 })
    }
  }

  // 7. Insert check_in record (unique constraint prevents duplicates at DB level)
  const { error: insertError } = await supabase.from('check_ins').insert({
    user_id: user.id,
    event_id: eventId,
    event_name: eventName ?? null,
    venue_name: venueName,
    venue_city: venueCity,
    event_date: eventDate ?? todayStr,
    user_lat: lat,
    user_lng: lng,
    venue_lat: venueLat,
    venue_lng: venueLng,
    distance_km: distanceKm,
    xp_awarded: 100,
  })

  if (insertError) {
    if (insertError.code === '23505') return NextResponse.json({ error: 'already_checked_in' }, { status: 409 })
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 8. Fetch current profile and compute new values
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, checked_in_events, attended_events, badges')
    .eq('id', user.id)
    .single()

  const currentXP = profile?.xp ?? 0
  const checkedIn: string[] = profile?.checked_in_events ?? []
  const attended: string[] = profile?.attended_events ?? []
  const badges = new Set<string>(profile?.badges ?? ['early-supporter'])

  const newXP = currentXP + 100
  const newCheckedIn = [...checkedIn, eventId]
  const newAttended = [...attended, eventId]

  // Award badges server-side
  if (newCheckedIn.length >= 1) badges.add('first-checkin')
  if (newAttended.length >= 3) badges.add('scene-regular')
  if (venueName?.toLowerCase().includes('warehouse')) badges.add('warehouse-survivor')

  // Festival Alumni badge: same festival slug checked in across different calendar years
  if (eventId.startsWith('festival-')) {
    try {
      const festivalIdForSlug = eventId.replace('festival-', '')
      const adminSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: currentFestival } = await adminSupabase
        .from('festivals')
        .select('slug')
        .eq('id', festivalIdForSlug)
        .maybeSingle()

      if (currentFestival?.slug) {
        const currentYear = new Date().getFullYear()
        // Get past check-ins for this user (excluding current year)
        const { data: pastCheckIns } = await adminSupabase
          .from('check_ins')
          .select('event_id, event_date')
          .eq('user_id', user.id)
          .like('event_id', 'festival-%')

        if (pastCheckIns && pastCheckIns.length > 0) {
          // For each past check-in from a different year, check if the slug matches
          const pastOtherYears = pastCheckIns.filter(ci => {
            if (!ci.event_date) return false
            const year = new Date(ci.event_date + 'T00:00:00').getFullYear()
            return year !== currentYear
          })

          if (pastOtherYears.length > 0) {
            const pastFestivalIds = Array.from(new Set(pastOtherYears.map(ci => ci.event_id.replace('festival-', ''))))
            const { data: pastFestivals } = await adminSupabase
              .from('festivals')
              .select('slug')
              .in('id', pastFestivalIds)

            if (pastFestivals?.some(f => f.slug === currentFestival.slug)) {
              badges.add('festival-alumni')
            }
          }
        }
      }
    } catch {
      // badge award failure shouldn't block check-in
    }
  }

  const newBadges = Array.from(badges)

  await supabase.from('profiles').update({
    xp: newXP,
    checked_in_events: newCheckedIn,
    attended_events: newAttended,
    badges: newBadges,
    updated_at: new Date().toISOString(),
  }).eq('id', user.id)

  return NextResponse.json({
    success: true,
    xp_awarded: 100,
    new_xp: newXP,
    checked_in_events: newCheckedIn,
    attended_events: newAttended,
    badges: newBadges,
  })
}
