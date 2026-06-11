import { NextResponse } from 'next/server'

const YT_KEY = process.env.YOUTUBE_API_KEY?.trim()

function buildQuery(artist: string, genres: string[]): string {
  const isElectronic = genres.some(g =>
    ['house', 'techno', 'electronic', 'edm', 'dnb', 'bass', 'trance', 'dance', 'drum'].some(k =>
      g.toLowerCase().includes(k)
    )
  )
  return isElectronic
    ? `${artist} DJ set live`
    : `${artist} live performance`
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const artist = searchParams.get('artist')?.trim()
  const genres = searchParams.get('genres')?.split(',').filter(Boolean) || []

  if (!artist) return NextResponse.json({ error: 'Missing artist' }, { status: 400 })
  if (!YT_KEY) return NextResponse.json({ error: 'YouTube not configured' }, { status: 503 })

  const query = buildQuery(artist, genres)

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query)}&key=${YT_KEY}`
  const res = await fetch(url, { next: { revalidate: 86400 } })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    return NextResponse.json({ error: 'YouTube search failed', status: res.status, body }, { status: 502 })
  }

  const data = await res.json()
  const item = data.items?.[0]
  if (!item) return NextResponse.json({ videoId: null })

  return NextResponse.json({
    videoId: item.id.videoId,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url,
  })
}
