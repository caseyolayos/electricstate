import { Metadata } from 'next'
import { ReactNode } from 'react'

const BASE_URL = 'https://www.electricstate.app'

interface Props {
  children: ReactNode
  params: { slug: string }
}

function slugToName(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const venueName = slugToName(params.slug)
  const title = venueName
  const description = `Upcoming electronic music events at ${venueName}. See the full lineup, buy tickets, and check in on Electric State.`
  const url = `${BASE_URL}/venues/${params.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${venueName} Events | Electric State`,
      description,
      url,
      images: [{ url: `${BASE_URL}/api/og/home`, width: 1200, height: 630, alt: venueName }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${venueName} Events | Electric State`,
      description,
      images: [`${BASE_URL}/api/og/home`],
    },
  }
}

export default function VenueLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
