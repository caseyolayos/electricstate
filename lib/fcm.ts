/**
 * Lightweight FCM v1 push sender — no external deps.
 * Uses Node.js built-in `crypto` to sign the service-account JWT.
 */
import crypto from 'crypto'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'electricstate-5b4f7'

async function getAccessToken(): Promise<string> {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!)
  const now = Math.floor(Date.now() / 1000)

  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(sa.private_key, 'base64url')

  const jwt = `${header}.${payload}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export interface PushPayload {
  fcmToken: string
  title: string
  body: string
  url?: string
  badge?: number
}

/**
 * Send a single push notification via FCM v1.
 * Returns true on success, false on failure (never throws).
 */
export async function sendPush(p: PushPayload): Promise<boolean> {
  try {
    const accessToken = await getAccessToken()
    const message: Record<string, unknown> = {
      token: p.fcmToken,
      notification: { title: p.title, body: p.body },
      apns: { payload: { aps: { sound: 'default', badge: p.badge ?? 1 } } },
    }
    if (p.url) message.data = { url: p.url }

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }
    )
    return res.ok
  } catch {
    return false
  }
}
