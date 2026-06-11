import { Metadata } from 'next'
import { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'https://www.electricstate.app'

interface Props {
  children: ReactNode
  params: { username: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = params
  let displayName = username
  let xp = 0
  let eventCount = 0

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, xp, attended_events')
      .eq('username', username)
      .maybeSingle()

    if (profile) {
      displayName = profile.display_name || username
      xp = profile.xp ?? 0
      eventCount = (profile.attended_events ?? []).length
    }
  } catch { /* use defaults */ }

  const title = `${displayName}'s Passport`
  const description = `${displayName} has checked into ${eventCount} event${eventCount !== 1 ? 's' : ''} and earned ${xp.toLocaleString()} XP on Electric State — the underground electronic music passport app.`
  const url = `${BASE_URL}/passport/${username}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${displayName}'s Electric State Passport`,
      description,
      url,
      images: [{ url: `${BASE_URL}/api/og/story/${username}`, width: 540, height: 960, alt: `${displayName}'s Passport` }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName}'s Electric State Passport`,
      description,
      images: [`${BASE_URL}/api/og/story/${username}`],
    },
  }
}

export default function PassportLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
