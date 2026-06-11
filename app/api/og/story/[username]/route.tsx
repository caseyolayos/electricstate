import { ImageResponse } from 'next/og'
import { createServerClient } from '@/lib/supabaseServer'

export const runtime = 'edge'

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const { username } = params

  try {
    const supabase = createServerClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_emoji, avatar_url, xp, attended_events, followed_artists')
      .eq('username', username)
      .single()

    if (!profile) return new Response('Not found', { status: 404 })

    const eventsAttended = (profile.attended_events as string[] | null)?.length ?? 0
    const artistsFollowed = (profile.followed_artists as string[] | null)?.length ?? 0
    const xp = profile.xp ?? 0
    const displayName = profile.display_name || username
    const emoji = profile.avatar_emoji || '🎵'
    const avatarUrl = profile.avatar_url as string | null
    const topArtists = ((profile.followed_artists as string[] | null) ?? []).slice(0, 3)

    return new ImageResponse(
      (
        <div
          style={{
            width: '540px',
            height: '960px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#050505',
            fontFamily: 'system-ui, sans-serif',
            padding: '48px 40px',
            position: 'relative',
          }}
        >
          {/* Green glow */}
          <div style={{
            position: 'absolute', top: '-100px', left: '50%',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,255,0,0.15) 0%, transparent 65%)',
            display: 'flex',
          }} />

          {/* Brand */}
          <div style={{ display: 'flex', marginBottom: '36px' }}>
            <span style={{ color: '#C8FF00', fontSize: '18px', fontWeight: 700, letterSpacing: '0.15em' }}>
              ● ELECTRIC STATE ●
            </span>
          </div>

          {/* Avatar */}
          <div style={{
            width: '120px', height: '120px', borderRadius: '50%',
            border: '3px solid rgba(200,255,0,0.5)',
            background: 'rgba(200,255,0,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '52px', marginBottom: '20px', overflow: 'hidden',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} width={120} height={120} style={{ objectFit: 'cover', borderRadius: '50%' }} />
              : emoji}
          </div>

          {/* Name */}
          <span style={{ color: '#fff', fontSize: '36px', fontWeight: 900, marginBottom: '6px' }}>
            {displayName}
          </span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', marginBottom: '40px' }}>
            @{username}
          </span>

          {/* XP hero */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            background: 'rgba(200,255,0,0.07)', border: '1px solid rgba(200,255,0,0.2)',
            borderRadius: '20px', padding: '24px 60px', width: '100%', marginBottom: '20px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', letterSpacing: '0.15em', marginBottom: '4px' }}>TOTAL XP</span>
            <span style={{ color: '#C8FF00', fontSize: '64px', fontWeight: 900, lineHeight: 1 }}>{xp.toLocaleString()}</span>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px', marginTop: '4px' }}>⚡ points earned</span>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '16px', width: '100%', marginBottom: '24px' }}>
            {[
              { v: eventsAttended, l: 'Shows' },
              { v: artistsFollowed, l: 'Artists' },
            ].map(s => (
              <div key={s.l} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px', padding: '20px 12px',
              }}>
                <span style={{ color: '#fff', fontSize: '40px', fontWeight: 900 }}>{s.v}</span>
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '13px', marginTop: '4px' }}>{s.l}</span>
              </div>
            ))}
          </div>

          {/* Artists */}
          {topArtists.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
              {topArtists.map(a => (
                <div key={a} style={{
                  background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.2)',
                  borderRadius: '100px', padding: '8px 18px',
                  color: '#C8FF00', fontSize: '14px',
                }}>
                  {a}
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: 'auto' }}>
            <div style={{ background: '#C8FF00', borderRadius: '100px', padding: '16px 40px', display: 'flex' }}>
              <span style={{ color: '#000', fontSize: '18px', fontWeight: 800 }}>Download Electric State</span>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>electricstate.app</span>
          </div>
        </div>
      ),
      { width: 540, height: 960 }
    )
  } catch (err) {
    return new Response(`Error: ${String(err)}`, { status: 500 })
  }
}
