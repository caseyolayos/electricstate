import { Metadata } from 'next'
import { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Submit an Event',
  description: 'Know about an underground rave, techno night, or EDM event in SoCal? Submit it to Electric State and help grow the scene.',
  alternates: {
    canonical: 'https://www.electricstate.app/submit',
  },
  openGraph: {
    title: 'Submit an Event | Electric State',
    description: 'Know about an underground rave, techno night, or EDM event in SoCal? Submit it to Electric State and help grow the scene.',
    url: 'https://www.electricstate.app/submit',
    images: [{ url: 'https://www.electricstate.app/api/og/home', width: 1200, height: 630, alt: 'Submit an Event' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Submit an Event | Electric State',
    description: 'Know about an underground rave, techno night, or EDM event in SoCal? Submit it here.',
    images: ['https://www.electricstate.app/api/og/home'],
  },
}

export default function SubmitLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
