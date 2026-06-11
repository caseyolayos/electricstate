import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Auth guard ────────────────────────────────────────────────────────────────
function authorized(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

// ── Firebase OAuth2 token (service account → access token) ───────────────────
async function getFirebaseToken(): Promise<string> {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
  const now = Math.floor(Date.now() / 1000)

  // Build JWT header + payload
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
  const sig = sign.sign(sa.private_key, 'base64url')
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
  if (!data.access_token) throw new Error('Failed to get Firebase token: ' + JSON.stringify(data))
  return data.access_token
}

// ── Send a single FCM message ─────────────────────────────────────────────────
async function sendFCM(token: string, accessToken: string, title: string, body: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'electricstate-5b4f7'
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          apns: {
            payload: {
              aps: {
                alert: { title, body },
                sound: 'default',
                badge: 1,
              },
            },
          },
        },
      }),
    }
  )
  return res.ok
}

// ── Notification copy ─────────────────────────────────────────────────────────
function getMessage(
  type: 'saved' | 'going',
  window: '7d' | '1d',
  eventName: string,
  venue?: string
): { title: string; body: string } {
  const v = venue ? ` @ ${venue}` : ''

  const pool: Record<string, { title: string; body: string }[]> = {
    going_7d: [
      {
        title: `⚡️ 1 week until ${eventName}!`,
        body:  "You clicked 'I'm Going.' That's basically a pinky promise. The scene is counting on you. 🫵",
      },
      {
        title: `🎪 ${eventName} is in 7 days`,
        body:  "Time to find your fit, charge every battery you own, and mentally prepare to lose your mind. Let's go.",
      },
    ],
    going_1d: [
      {
        title: `🚨 TOMORROW: ${eventName}${v}`,
        body:  "You said you're going. We trusted you. Don't make this weird. See you there. 🎶",
      },
      {
        title: `🔥 It's almost time — ${eventName}`,
        body:  `Tomorrow${v}. You RSVP'd. Hydrate. Charge your phone. Wear comfortable shoes. You got this.`,
      },
    ],
    saved_7d: [
      {
        title: `👀 ${eventName} is ONE WEEK away`,
        body:  "You saved this event like you actually planned to go. Don't let it collect digital dust.",
      },
      {
        title: `📅 7 days: ${eventName}`,
        body:  "Your saved event has been patiently waiting. It believes in you. Will you show up? 🎵",
      },
    ],
    saved_1d: [
      {
        title: `⏰ TOMORROW: ${eventName}${v}`,
        body:  "You bookmarked this. The universe noticed. Now actually go — you've earned it. 🙌",
      },
      {
        title: `🎶 ${eventName} is tomorrow!`,
        body:  "You saved it, you know you want to go. Stop overthinking. The vibe is calling. Answer it.",
      },
    ],
  }

  const key = `${type}_${window}` as keyof typeof pool
  const options = pool[key]
  return options[Math.floor(Math.random() * options.length)]
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServerClient()
  const now = new Date()
  const results = { sent: 0, skipped: 0, errors: 0 }

  // Target windows: exactly 7 days out and exactly 1 day out (±12h slop to handle cron drift)
  const targets: { field: 'reminder_7d_sent'; window: '7d'; daysOut: number }[]
             | { field: 'reminder_1d_sent'; window: '1d'; daysOut: number }[] = [
    { field: 'reminder_7d_sent', window: '7d', daysOut: 7 },
    { field: 'reminder_1d_sent', window: '1d', daysOut: 1 },
  ] as const

  let accessToken: string | null = null

  for (const { field, window, daysOut } of targets) {
    const windowStart = new Date(now)
    windowStart.setDate(windowStart.getDate() + daysOut)
    windowStart.setHours(0, 0, 0, 0)

    const windowEnd = new Date(windowStart)
    windowEnd.setDate(windowEnd.getDate() + 1)

    // Fetch unnotified reminders whose event falls in this window
    const { data: reminders, error } = await supabase
      .from('event_reminders')
      .select('*, profiles(fcm_token)')
      .eq(field, false)
      .gte('event_date', windowStart.toISOString().slice(0, 10))
      .lt('event_date',  windowEnd.toISOString().slice(0, 10))

    if (error) {
      console.error(`Error fetching ${window} reminders:`, error)
      results.errors++
      continue
    }

    if (!reminders?.length) continue

    // Lazy-load Firebase token
    if (!accessToken) {
      try {
        accessToken = await getFirebaseToken()
      } catch (e) {
        console.error('Firebase token error:', e)
        results.errors++
        continue
      }
    }

    for (const reminder of reminders) {
      const fcmToken = (reminder as any).profiles?.fcm_token
      if (!fcmToken) { results.skipped++; continue }

      const { title, body } = getMessage(
        reminder.type as 'saved' | 'going',
        window,
        reminder.event_name,
        reminder.event_venue
      )

      const ok = await sendFCM(fcmToken, accessToken, title, body)
      if (ok) {
        // Mark as sent
        await supabase
          .from('event_reminders')
          .update({ [field]: true })
          .eq('id', reminder.id)
        results.sent++
      } else {
        results.errors++
      }
    }
  }

  console.log('Event reminder sweep complete:', results)
  return NextResponse.json({ ok: true, ...results })
}

// Allow GET for easy manual testing (still requires the secret)
export async function GET(req: Request) {
  return POST(req)
}
