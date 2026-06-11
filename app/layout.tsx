import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'
import OneSignalInit from '@/components/OneSignalInit'
import TopNav from '@/components/TopNav'
import BottomNav from '@/components/BottomNav'
import Sidebar from '@/components/Sidebar'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const BASE_URL = 'https://www.electricstate.app'

export const viewport: Viewport = {
  themeColor: '#C8FF00',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,        // prevents auto-zoom on input focus
  userScalable: false,    // locks zoom; WKWebView respects this (unlike Safari)
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s | Electric State',
    default: 'Electric State — Discover Underground Electronic Events',
  },
  description: 'Electric State is the passport app for electronic music fans. Discover underground raves, techno nights, and EDM festivals in SoCal. Buy tickets, check in at events, earn XP, and build your scene passport.',
  keywords: ['electronic music events', 'rave near me', 'EDM events SoCal', 'underground techno', 'house music events Los Angeles', 'EDM passport', 'festival tracker', 'rave app'],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: BASE_URL,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Electric State',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    type: 'website',
    siteName: 'Electric State',
    title: 'Electric State — Discover Underground Electronic Events',
    description: 'Discover underground raves, techno nights, and EDM festivals in SoCal. Buy tickets, check in, earn XP, and build your scene passport.',
    url: BASE_URL,
    images: [{
      url: `${BASE_URL}/api/og/home`,
      width: 1200,
      height: 630,
      alt: 'Electric State — Underground Electronic Events',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@electricstate_',
    title: 'Electric State — Underground Electronic Events',
    description: 'Discover raves, techno nights, and EDM festivals in SoCal. Check in, earn XP, build your passport.',
    images: [`${BASE_URL}/api/og/home`],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${BASE_URL}/#website`,
      url: BASE_URL,
      name: 'Electric State',
      description: 'Discover underground electronic music events in SoCal. Buy tickets, check in, earn XP, and build your scene passport.',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${BASE_URL}/events?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: 'Electric State',
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/apple-touch-icon.png`,
      },
      sameAs: [],
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ES Passport" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="bg-black min-h-screen text-white">
        <ClientProviders>
          <OneSignalInit />
          <ServiceWorkerRegistration />
          <Sidebar />
          <TopNav />
          <main className="md:pt-16 lg:pt-0 pb-24 md:pb-0 lg:pb-0 lg:pl-64 min-h-screen">
            {children}
          </main>
          <BottomNav />
        </ClientProviders>
        <GoogleAnalytics gaId="G-5LD69XCHYP" />
      </body>
    </html>
  )
}
