import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function wmoToEmoji(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '⛅'
  if (code <= 48) return '🌫️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌦️'
  return '⛈️'
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  if (!lat || !lng || !start || !end) {
    return NextResponse.json({ error: 'Missing lat, lng, start, or end' }, { status: 400 })
  }

  try {
    const fields = [
      'weathercode', 'temperature_2m_max', 'temperature_2m_min',
      'apparent_temperature_max', 'precipitation_probability_max',
      'windspeed_10m_max', 'uv_index_max', 'sunset',
    ].join(',')
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=${fields}&start_date=${start}&end_date=${end}&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto`
    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      return NextResponse.json({ error: 'Weather fetch failed' }, { status: 502 })
    }

    const data = await res.json()
    const daily = data.daily

    if (!daily || !daily.time) {
      return NextResponse.json({ days: [] })
    }

    const days = daily.time.map((date: string, i: number) => {
      const d = new Date(date + 'T00:00:00')
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
      const code = daily.weathercode[i]
      const sunsetIso: string | undefined = daily.sunset?.[i]
      const sunsetTime = sunsetIso
        ? new Date(sunsetIso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        : null
      return {
        date,
        day: dayName,
        emoji: wmoToEmoji(code),
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        feelsLike: Math.round(daily.apparent_temperature_max?.[i] ?? daily.temperature_2m_max[i]),
        precip: daily.precipitation_probability_max[i] ?? 0,
        wind: Math.round(daily.windspeed_10m_max?.[i] ?? 0),
        uv: Math.round(daily.uv_index_max?.[i] ?? 0),
        sunset: sunsetTime,
      }
    })

    return NextResponse.json({ days })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch weather' }, { status: 500 })
  }
}
