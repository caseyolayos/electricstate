import { NextResponse } from 'next/server'

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID?.trim()
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET?.trim()

let cachedToken: string | null = null
let tokenExpiry = 0

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) return null
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

  // Debug: expose whether env vars are present (not the values)
  if (searchParams.get('debug') === '1') {
    return NextResponse.json({
      CLIENT_ID_set: !!process.env.SPOTIFY_CLIENT_ID,
      CLIENT_SECRET_set: !!process.env.SPOTIFY_CLIENT_SECRET,
      CLIENT_ID_length: process.env.SPOTIFY_CLIENT_ID?.length ?? 0,
    })
  }

  const token = await getAccessToken()
  if (!token) return NextResponse.json({ error: 'Spotify not configured' }, { status: 503 })

  const doSearch = async (accessToken: string) =>
    fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' }
    )

  let res = await doSearch(token)

  // If token expired (common in serverless), clear cache and retry once with a fresh token
  if (res.status === 401) {
    cachedToken = null
    tokenExpiry = 0
    const freshToken = await getAccessToken()
    if (!freshToken) return NextResponse.json({ error: 'Spotify auth failed' }, { status: 503 })
    res = await doSearch(freshToken)
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    return NextResponse.json({ error: 'Spotify search failed', status: res.status, body: errBody }, { status: 502 })
  }

  const data = await res.json()
  const artist = data.artists?.items?.[0]
  if (!artist) return NextResponse.json({ artist: null })

  // Reject if the returned artist name doesn't reasonably match the query.
  // Normalise both strings: lowercase, strip punctuation/special chars.
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
  const queryNorm  = normalise(name)
  const resultNorm = normalise(artist.name)
  const queryWords  = queryNorm.split(' ')
  const resultWords = resultNorm.split(' ')
  // Pass if: exact match, one contains the other, or ≥50% of query words appear in result
  const exactOrContains = queryNorm === resultNorm || queryNorm.includes(resultNorm) || resultNorm.includes(queryNorm)
  const wordOverlap = queryWords.filter(w => w.length > 1 && resultWords.includes(w)).length
  const overlapRatio = wordOverlap / Math.max(queryWords.length, 1)
  if (!exactOrContains && overlapRatio < 0.5) {
    return NextResponse.json({ artist: null })
  }

  return NextResponse.json({
    artist: {
      id: artist.id,
      name: artist.name,
      followers: artist.followers?.total,
      genres: artist.genres?.slice(0, 3),
      imageUrl: artist.images?.[0]?.url,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
  })
}
