import { NextResponse } from 'next/server'

const YT_KEY = process.env.YOUTUBE_API_KEY?.trim()

// Try multiple queries in priority order and return the first hit.
// We look for official trailers / aftermovies / hype videos from the festival's own channel.
function buildQueries(name: string, year: number): string[] {
  return [
    `"${name}" ${year} official trailer`,
    `"${name}" ${year} official video`,
    `"${name}" ${year} aftermovie`,
    `"${name}" ${year}`,
  ]
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')?.trim()
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  if (!YT_KEY) return NextResponse.json({ error: 'YouTube not configured' }, { status: 503 })

  const queries = buildQueries(name, year)

  for (const query of queries) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&relevanceLanguage=en&regionCode=US&q=${encodeURIComponent(query)}&key=${YT_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) continue

    const data = await res.json()
    const item = data.items?.[0]
    if (!item) continue

    return NextResponse.json({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
    })
  }

  return NextResponse.json({ videoId: null })
}
