import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = params.id
  const festivalId = id.replace('festival-', '')

  let name = 'Electric State'
  let dateStr = ''
  let city = ''
  let genres: string[] = []
  let imageUrl = ''

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('festivals')
      .select('name, date_start, date_end, city, genre, image_url')
      .eq('id', festivalId)
      .maybeSingle()

    if (data) {
      name = data.name ?? name
      city = data.city ?? ''
      genres = data.genre ?? []
      imageUrl = data.image_url ?? ''
      if (data.date_start) {
        const start = new Date(data.date_start + 'T00:00:00')
        if (data.date_end && data.date_end !== data.date_start) {
          const end = new Date(data.date_end + 'T00:00:00')
          const sameMonth = start.getMonth() === end.getMonth()
          dateStr = sameMonth
            ? `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}–${end.getDate()}, ${end.getFullYear()}`
            : `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
        } else {
          dateStr = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        }
      }
    }
  } catch { /* use defaults */ }

  const genreLabel = genres.slice(0, 3).join(' · ')
  const subtitle = [dateStr, city].filter(Boolean).join(' · ')
  const fontSize = name.length > 35 ? '58px' : name.length > 25 ? '68px' : '80px'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px', height: '630px',
          display: 'flex', flexDirection: 'column',
          background: '#050505', position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Background image */}
        {imageUrl && (
          <img
            src={imageUrl}
            style={{
              position: 'absolute', inset: '0px',
              width: '100%', height: '100%',
              objectFit: 'cover', opacity: 0.15,
            }}
          />
        )}

        {/* Dark overlay */}
        <div style={{
          position: 'absolute', inset: '0px',
          background: 'linear-gradient(135deg, rgba(0,0,0,0.97) 0%, rgba(0,0,0,0.75) 100%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: '0px', left: '0px', right: '0px', height: '55%',
          background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, transparent 100%)',
          display: 'flex',
        }} />

        {/* Top-right neon glow */}
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px',
          width: '380px', height: '380px',
          background: 'radial-gradient(circle at center, rgba(200,255,0,0.14) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '52px 64px', height: '100%',
        }}>
          {/* Top brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: '#C8FF00', borderRadius: '8px',
              padding: '7px 16px', fontSize: '14px', fontWeight: 800,
              color: '#000', letterSpacing: '0.06em', textTransform: 'uppercase',
              display: 'flex',
            }}>
              Electric State
            </div>
            {genreLabel && (
              <div style={{
                fontSize: '13px', color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
                display: 'flex',
              }}>
                {genreLabel}
              </div>
            )}
          </div>

          {/* Bottom: event info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {subtitle && (
              <div style={{
                fontSize: '23px', color: '#C8FF00',
                fontWeight: 600, letterSpacing: '0.01em', display: 'flex',
              }}>
                {subtitle}
              </div>
            )}
            <div style={{
              fontSize, fontWeight: 900, color: '#ffffff',
              lineHeight: '1.05', letterSpacing: '-0.025em', display: 'flex',
            }}>
              {name}
            </div>
            <div style={{
              fontSize: '17px', color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.05em', display: 'flex',
            }}>
              electricstate.app
            </div>
          </div>
        </div>

        {/* Bottom neon line */}
        <div style={{
          position: 'absolute', bottom: '0px', left: '0px', right: '0px', height: '4px',
          background: 'linear-gradient(90deg, transparent, #C8FF00 40%, #C8FF00 60%, transparent)',
          display: 'flex',
        }} />
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
