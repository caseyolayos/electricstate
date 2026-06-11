import { ImageResponse } from 'next/og'
import { createServerClient } from '@/lib/supabaseServer'

export const runtime = 'edge'

export async function GET(_req: Request, { params }: { params: { username: string } }) {
  const { username } = params

  try {
    const supabase = createServerClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, username, avatar_emoji, avatar_url, xp, attended_events, followed_artists, badges')
      .eq('username', username)
      .single()

    if (!profile) {
      return new Response('Not found', { status: 404 })
    }

    const eventsAttended = (profile.attended_events as string[] | null)?.length ?? 0
    const artistsFollowed = (profile.followed_artists as string[] | null)?.length ?? 0
    const badgeCount = (profile.badges as string[] | null)?.length ?? 0
    const xp = profile.xp ?? 0
    const displayName = profile.display_name || profile.username || 'Fan'
    const emoji = profile.avatar_emoji || '🎵'

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            background: '#050505',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Background glow */}
          <div style={{
            position: 'absolute', top: '-100px', right: '-100px',
            width: '500px', height: '500px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,255,0,0.15) 0%, transparent 70%)',
            display: 'flex',
          }} />
          <div style={{
            position: 'absolute', bottom: '-150px', left: '-100px',
            width: '400px', height: '400px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,255,0,0.08) 0%, transparent 70%)',
            display: 'flex',
          }} />

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', padding: '64px', flex: 1 }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '48px' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'rgba(200,255,0,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '36px', border: '2px solid rgba(200,255,0,0.3)',
              }}>
                {emoji}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ color: '#fff', fontSize: '32px', fontWeight: 900 }}>{displayName}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '18px' }}>Electric State Passport</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <span style={{ color: '#C8FF00', fontSize: '18px', fontWeight: 700, letterSpacing: '0.1em' }}>ELECTRIC STATE</span>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'flex', gap: '24px', flex: 1 }}>
              {[
                { value: xp.toLocaleString(), label: 'XP Earned', icon: '⚡' },
                { value: eventsAttended.toString(), label: 'Shows Attended', icon: '🎪' },
                { value: artistsFollowed.toString(), label: 'Artists Followed', icon: '🎵' },
                { value: badgeCount.toString(), label: 'Badges', icon: '🏅' },
              ].map((stat) => (
                <div key={stat.label} style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '32px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '36px', marginBottom: '12px' }}>{stat.icon}</span>
                  <span style={{ color: '#C8FF00', fontSize: '48px', fontWeight: 900, lineHeight: 1 }}>{stat.value}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '15px', marginTop: '8px', textAlign: 'center' }}>{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '32px' }}>
              <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>electricstate.app</span>
              <div style={{
                marginLeft: 'auto',
                background: '#C8FF00',
                borderRadius: '100px',
                padding: '8px 20px',
                display: 'flex',
              }}>
                <span style={{ color: '#000', fontSize: '14px', fontWeight: 700 }}>Download on the App Store</span>
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  } catch {
    return new Response('Error', { status: 500 })
  }
}
