'use client'

import { useState } from 'react'
import { useZoomLock } from '@/lib/useZoomLock'

interface Stream { label: string; url: string }

function extractVideoId(url: string): string {
  try {
    const u = new URL(url)
    // youtube.com/live/ID
    const parts = u.pathname.split('/').filter(Boolean)
    const last = parts[parts.length - 1]
    if (last && /^[a-zA-Z0-9_-]{11}$/.test(last)) return last
    // ?v=ID
    const v = u.searchParams.get('v')
    if (v) return v
  } catch {}
  return url
}

export default function LiveStreamSection({ streams }: { streams: Stream[] }) {
  const [active, setActive] = useState(0)
  const [expanded, setExpanded] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  useZoomLock(fullscreen)

  if (!streams?.length) return null

  const videoId = extractVideoId(streams[active].url)

  return (
    <section className="mb-2">
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h2 className="font-black text-white text-lg flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>
          Watch Live
          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
            {streams.length} {streams.length === 1 ? 'Stage' : 'Stages'}
          </span>
        </h2>
        <svg className={`w-4 h-4 text-white/30 transition-transform group-hover:text-white/60 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="glass rounded-2xl overflow-hidden">
          {/* Stage tabs */}
          {streams.length > 1 && (
            <div className="flex border-b border-white/10 overflow-x-auto scrollbar-hide">
              {streams.map((s, i) => (
                <button
                  key={s.label}
                  onClick={() => setActive(i)}
                  className={`flex-1 py-2.5 px-3 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
                    active === i
                      ? 'text-[#C8FF00] border-[#C8FF00] bg-[#C8FF00]/5'
                      : 'text-white/40 border-transparent hover:text-white/60'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Embed */}
          <div className="relative" style={{ paddingBottom: '56.25%' }}>
            <iframe
              key={videoId}
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          </div>

          {/* Fullscreen + external link row */}
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-white/[0.06]"
            style={{ background: 'rgba(0,0,0,0.3)' }}>
            <p className="text-white/30 text-xs">
              Streaming live · {streams[active].label}
            </p>
            <a
              href={streams[active].url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-bold transition-colors"
              style={{ color: 'rgba(239,68,68,0.8)' }}
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 17">
                <path d="M23.495 2.205a3.02 3.02 0 0 0-2.122-2.136C19.505 0 12 0 12 0S4.495 0 2.627.069a3.02 3.02 0 0 0-2.122 2.136C0 4.07 0 8.001 0 8.001s0 3.931.505 5.796a3.02 3.02 0 0 0 2.122 2.136C4.495 16.002 12 16.002 12 16.002s7.505 0 9.373-.069a3.02 3.02 0 0 0 2.122-2.136C24 11.932 24 8.001 24 8.001s0-3.931-.505-5.796zM9.609 11.001V5.001l6.264 3-6.264 3z"/>
              </svg>
              Open on YouTube
            </a>
          </div>
        </div>
      )}
    </section>
  )
}
