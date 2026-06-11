import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabaseServer'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAIL = 'caseyolayos@gmail.com'

async function authorized(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (secret && auth === `Bearer ${secret}`) return true
  const token = auth.replace('Bearer ', '')
  if (!token) return false
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser(token)
    return user?.email === ADMIN_EMAIL
  } catch { return false }
}

async function getFirebaseToken(): Promise<string> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT not set')
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
  const privateKey = sa.private_key.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    iat: now, exp: now + 3600,
  })).toString('base64url')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(privateKey, 'base64url')
  const jwt = `${header}.${payload}.${sig}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('OAuth2 error: ' + JSON.stringify(data))
  return data.access_token
}

async function sendFCM(token: string, accessToken: string, title: string, body: string): Promise<boolean> {
  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'electricstate-5b4f7'
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        apns: { payload: { aps: { alert: { title, body }, sound: 'default', badge: 1 } } },
      },
    }),
  })
  return res.ok
}

export async function POST(req: Request) {
  if (!await authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { title, body, url } = await req.json().catch(() => ({}))
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Fetch all subscribers with a valid FCM token
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, fcm_token')
    .not('fcm_token', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!profiles?.length) return NextResponse.json({ ok: true, sent: 0, message: 'No subscribers' })

  let accessToken: string
  try {
    accessToken = await getFirebaseToken()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Firebase auth failed: ${msg}` }, { status: 500 })
  }

  const results = { sent: 0, skipped: 0, errors: 0 }
  const successUserIds: string[] = []

  for (const profile of profiles) {
    if (!profile.fcm_token) { results.skipped++; continue }
    const ok = await sendFCM(profile.fcm_token, accessToken, title.trim(), body.trim())
    if (ok) { results.sent++; successUserIds.push(profile.id) }
    else results.errors++
  }

  // Write to notifications table so blasts appear in the Alerts panel
  if (successUserIds.length > 0) {
    const rows = successUserIds.map(user_id => ({
      user_id,
      type: 'push',
      title: title.trim(),
      body: body.trim(),
      data: url ? { url } : {},
      read: false,
    }))
    await supabase.from('notifications').insert(rows)
  }

  return NextResponse.json({ ok: true, ...results, total: profiles.length })
}
