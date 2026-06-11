import { NextResponse } from 'next/server'

const YT_KEY = process.env.YOUTUBE_API_KEY?.trim()

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const venue = searchParams.get('venue')?.trim()
  const city  = searchParams.get('city')?.trim() || ''

  if (!venue) return NextResponse.json({ error: 'Missing venue' }, { status: 400 })
  if (!YT_KEY) return NextResponse.json({ videoId: null })

  // Try increasingly broad queries until we get a hit
  const queries = [
    `${venue} ${city} electronic music DJ set`.trim(),
    `${venue} ${city} nightclub DJ set`.trim(),
    `${venue} ${city} live music`.trim(),
    `${venue} ${city}`.trim(),
  ]

  for (const q of queries) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(q)}&key=${YT_KEY}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    if (!res.ok) break
    const data = await res.json()
    const item = data.items?.[0]
    if (item?.id?.videoId) {
      return NextResponse.json({
        videoId: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
      })
    }
  }

  return NextResponse.json({ videoId: null })
}
