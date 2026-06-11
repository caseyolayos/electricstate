import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Events',
  description: 'Find underground raves, techno nights, house parties, and EDM events near you in Southern California. Discover tonight\'s events on the Electric State map.',
  alternates: {
    canonical: 'https://www.electricstate.app/events',
  },
  openGraph: {
    title: 'Electronic Music Events Near You | Electric State',
    description: 'Find underground raves, techno nights, house parties, and EDM events near you in SoCal. Live event map updated daily.',
    url: 'https://www.electricstate.app/events',
    images: [{
      url: 'https://www.electricstate.app/api/og/home',
      width: 1200,
      height: 630,
      alt: 'Electric State Events Map',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Electronic Music Events Near You | Electric State',
    description: 'Find underground raves, techno nights, and EDM events near you in SoCal.',
    images: ['https://www.electricstate.app/api/og/home'],
  },
}

export default function EventsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
