import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAIL = 'caseyolayos@gmail.com'

async function authorized(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization') ?? ''
  // Accept cron secret
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) return true
  // Accept admin Supabase JWT
  const token = auth.replace('Bearer ', '')
  if (!token) return false
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser(token)
    return user?.email === ADMIN_EMAIL
  } catch {
    return false
  }
}

async function getFirebaseToken(): Promise<string> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')

  // The private_key field may contain literal newline bytes inside the JSON string
  // (control chars not allowed in JSON strings). Fix just that field before parsing.
  let sa: Record<string, string>
  try {
    sa = JSON.parse(raw)
  } catch {
    const fixed = raw.replace(
      /"private_key"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/,
      (_: string, key: string) => `"private_key":"${key.replace(/\r?\n/g, '\\n')}"`
    )
    sa = JSON.parse(fixed)
  }

  // Normalise: collapse any double-escaped \\n back to real newlines for crypto
  const privateKey = sa.private_key.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss:   sa.client_email,
    sub:   sa.client_email,
    aud:   'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    iat:   now,
    exp:   now + 3600,
  })).toString('base64url')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(privateKey, 'base64url')
  const jwt = `${header}.${payload}.${sig}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('OAuth2 error: ' + JSON.stringify(data))
  return data.access_token
}

async function sendFCM(token: string, accessToken: string, title: string, body: string, festivalId: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'electricstate-5b4f7'
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: { festival_id: festivalId, type: 'artist_match' },
          apns: {
            payload: {
              aps: { alert: { title, body }, sound: 'default', badge: 1 },
            },
          },
        },
      }),
    }
  )
  return res.ok
}

function buildNotification(festivalName: string, matchedArtists: string[], dateStart: string) {
  const count = matchedArtists.length
  const date = new Date(dateStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const artistPreview = matchedArtists.slice(0, 3).join(', ') + (count > 3 ? ` +${count - 3} more` : '')

  const title = count === 1
    ? `🎪 ${matchedArtists[0]} is playing ${festivalName}!`
    : `🎪 ${count} artists you follow are at ${festivalName}!`

  const body = count === 1
    ? `${matchedArtists[0]} • ${date} — tap to see the full lineup`
    : `${artistPreview} • ${date}`

  return { title, body }
}

export async function POST(req: Request) {
  if (!await authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { festival_id } = await req.json().catch(() => ({}))
  if (!festival_id) {
    return NextResponse.json({ error: 'festival_id required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // 1. Fetch the festival
  const { data: festival, error: festErr } = await supabase
    .from('festivals')
    .select('id, name, lineup, date_start')
    .eq('id', festival_id)
    .single()

  if (festErr || !festival) {
    return NextResponse.json({ error: 'Festival not found' }, { status: 404 })
  }

  const lineup: string[] = festival.lineup ?? []
  if (lineup.length === 0) {
    return NextResponse.json({ error: 'Festival has no lineup' }, { status: 400 })
  }

  // 2. Find all users whose followed_artists overlap with the lineup
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, fcm_token, followed_artists')
    .not('fcm_token', 'is', null)
    .overlaps('followed_artists', lineup)

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 })
  }

  if (!profiles?.length) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, message: 'No matching subscribers' })
  }

  // 3. Get Firebase token
  let accessToken: string
  try {
    accessToken = await getFirebaseToken()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Firebase auth error:', msg)
    return NextResponse.json({ error: `Firebase auth failed: ${msg}` }, { status: 500 })
  }

  // 4. Send personalized notifications
  const lineupLower = lineup.map(a => a.toLowerCase())
  const results = { sent: 0, skipped: 0, errors: 0 }

  for (const profile of profiles) {
    if (!profile.fcm_token) { results.skipped++; continue }

    // Find which of their followed artists are in the lineup (case-insensitive)
    const matchedArtists = (profile.followed_artists ?? []).filter((a: string) =>
      lineupLower.includes(a.toLowerCase())
    )
    if (matchedArtists.length === 0) { results.skipped++; continue }

    const { title, body } = buildNotification(festival.name, matchedArtists, festival.date_start)
    const ok = await sendFCM(profile.fcm_token, accessToken, title, body, festival_id)
    if (ok) results.sent++
    else results.errors++
  }

  return NextResponse.json({ ok: true, ...results, total_matched: profiles.length })
}
