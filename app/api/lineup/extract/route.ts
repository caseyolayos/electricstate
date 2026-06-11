import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const PROMPT = `You are analyzing a music festival or event lineup flyer.

Your job: extract every artist / DJ / performer name visible in this image.

Rules:
- Return ONLY a valid JSON array of strings — no markdown, no explanation, no code block
- One artist per string, exactly as it appears on the flyer
- Include headliners, supporting acts, and b2b pairings (e.g. "Fisher b2b Chris Lake")
- Do NOT include: venue names, dates, times, ticket info, sponsor logos, city names, or generic words like "presents" or "featuring"
- If you genuinely cannot find any artist names, return []

Example output: ["Fisher", "Chris Lake", "Lucii", "Cloonee", "John Summit b2b Eli Brown"]`

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
  }

  try {
    const body = await req.json()
    const { imageBase64, mimeType = 'image/jpeg' } = body

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 })
    }

    const imageUrl = `data:${mimeType};base64,${imageBase64}`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 600,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'high' },
              },
              {
                type: 'text',
                text: PROMPT,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error('OpenAI error:', err)
      return NextResponse.json({ error: 'Vision API error', detail: err }, { status: 502 })
    }

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '[]'

    // Parse — strip any accidental markdown fences
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

    let artists: string[] = []
    try {
      artists = JSON.parse(cleaned)
      if (!Array.isArray(artists)) artists = []
      // Sanity filter: remove empty strings and anything suspiciously long
      artists = artists.filter(a => typeof a === 'string' && a.trim().length > 0 && a.length < 100)
    } catch {
      // GPT occasionally wraps in extra text — try to extract just the array
      const match = cleaned.match(/\[[\s\S]*\]/)
      if (match) {
        try { artists = JSON.parse(match[0]) } catch { artists = [] }
      }
    }

    return NextResponse.json({ artists, count: artists.length })
  } catch (err) {
    console.error('Lineup extract error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
