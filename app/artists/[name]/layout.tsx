import { Metadata } from 'next'
import { ReactNode } from 'react'

const BASE_URL = 'https://www.electricstate.app'

interface Props {
  children: ReactNode
  params: { name: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artistName = decodeURIComponent(params.name)
  const title = artistName
  const description = `Upcoming events, DJ sets, and show history for ${artistName} on Electric State — the underground electronic music passport app.`
  const url = `${BASE_URL}/artists/${params.name}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${artistName} — Electric State`,
      description,
      url,
      images: [{ url: `${BASE_URL}/api/og/home`, width: 1200, height: 630, alt: artistName }],
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${artistName} — Electric State`,
      description,
      images: [`${BASE_URL}/api/og/home`],
    },
  }
}

export default function ArtistLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
