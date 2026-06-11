import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: '#050505',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Neon green glow top-right */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle at center, rgba(200,255,0,0.18) 0%, transparent 70%)',
          display: 'flex',
        }} />
        {/* Subtle glow bottom-left */}
        <div style={{
          position: 'absolute', bottom: '-120px', left: '-80px',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle at center, rgba(200,255,0,0.07) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Content */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          height: '100%',
          position: 'relative',
        }}>
          {/* Top: Tag */}
          <div style={{ display: 'flex' }}>
            <div style={{
              border: '1px solid rgba(200,255,0,0.35)',
              borderRadius: '100px',
              padding: '8px 22px',
              fontSize: '15px',
              color: '#C8FF00',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              display: 'flex',
            }}>
              Underground · Electronic · SoCal
            </div>
          </div>

          {/* Main headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <div style={{
              fontSize: '110px', fontWeight: 900,
              color: '#ffffff', lineHeight: '0.9',
              letterSpacing: '-0.04em', display: 'flex',
            }}>
              Electric
            </div>
            <div style={{
              fontSize: '110px', fontWeight: 900,
              color: '#C8FF00', lineHeight: '0.9',
              letterSpacing: '-0.04em', display: 'flex',
            }}>
              State.
            </div>
          </div>

          {/* Bottom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              fontSize: '22px', color: 'rgba(255,255,255,0.45)',
              fontWeight: 500, display: 'flex',
            }}>
              Discover shows · Buy tickets · Earn your passport
            </div>
            <div style={{
              fontSize: '17px', color: 'rgba(255,255,255,0.2)',
              letterSpacing: '0.06em', display: 'flex',
            }}>
              electricstate.app
            </div>
          </div>
        </div>

        {/* Bottom neon line */}
        <div style={{
          position: 'absolute', bottom: '0px', left: '0px', right: '0px',
          height: '4px',
          background: 'linear-gradient(90deg, transparent, #C8FF00 40%, #C8FF00 60%, transparent)',
          display: 'flex',
        }} />
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
