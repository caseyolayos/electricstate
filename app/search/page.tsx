'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface SearchResult {
  type: 'event' | 'artist' | 'venue'
  id: string
  name: string
  subtitle?: string
  imageUrl?: string
  href: string
}

const TYPE_ICON: Record<string, string> = {
  event: '🎫',
  artist: '🎧',
  venue: '📍',
}

const TYPE_LABEL: Record<string, string> = {
  event: 'Event',
  artist: 'Artist',
  venue: 'Venue',
}

const TYPE_ORDER: Array<'artist' | 'venue' | 'event'> = ['artist', 'venue', 'event']

function ResultRow({ result }: { result: SearchResult }) {
  const initials = result.name
    .split(/\s+/)
    .filter(w => w.length > 1)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || result.name[0]?.toUpperCase() || '?'

  const gradientByType = {
    artist: 'linear-gradient(135deg, #7C3AED, #2563EB)',
    venue: 'linear-gradient(135deg, #0891B2, #0D9488)',
    event: 'linear-gradient(135deg, #DC2626, #9333EA)',
  }

  return (
    <Link
      href={result.href}
      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 active:bg-white/10 transition-colors border-b border-white/5 last:border-0"
    >
      {/* Thumbnail */}
      <div
        className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center text-sm font-black text-white"
        style={{ background: result.imageUrl ? undefined : gradientByType[result.type] }}
      >
        {result.imageUrl ? (
          <img loading="lazy" decoding="async" src={result.imageUrl} alt={result.name} className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate leading-snug">{result.name}</p>
        {result.subtitle && (
          <p className="text-white/40 text-xs truncate leading-snug mt-0.5">{result.subtitle}</p>
        )}
      </div>

      {/* Type badge + chevron */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
          <span className="text-[10px]">{TYPE_ICON[result.type]}</span>
          <span className="text-[10px] text-white/50 font-medium">{TYPE_LABEL[result.type]}</span>
        </div>
        <svg className="w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') ?? ''
  const [inputValue, setInputValue] = useState(query)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch results whenever query changes
  useEffect(() => {
    if (query.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => setResults(data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [query])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (inputValue.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`)
    }
  }

  const grouped = TYPE_ORDER.reduce<Record<string, SearchResult[]>>((acc, type) => {
    const items = results.filter(r => r.type === type)
    if (items.length) acc[type] = items
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-[#050505] pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-4 border-b border-white/8"
        style={{ background: 'rgba(5,5,5,0.97)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => router.back()} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Search input */}
          <form onSubmit={handleSearch} className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Search artists, venues, events…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 outline-none"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(200,255,0,0.4)',
              }}
            />
          </form>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <svg className="w-6 h-6 animate-spin text-[#C8FF00]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-white/50 text-sm">No results for &ldquo;{query}&rdquo;</p>
            <p className="text-white/25 text-xs">Try an artist name, venue, or event</p>
          </div>
        )}

        {!loading && query.length < 2 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-4xl">⚡</span>
            <p className="text-white/40 text-sm">Search artists, venues, and events</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="pt-2">
            {/* Result count */}
            <p className="px-4 py-3 text-xs text-white/30">
              {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </p>

            {TYPE_ORDER.map(type => {
              const items = grouped[type]
              if (!items?.length) return null
              return (
                <div key={type}>
                  <div className="px-4 py-2 border-t border-white/5">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-white/25">
                      {TYPE_ICON[type]} {TYPE_LABEL[type]}s
                    </p>
                  </div>
                  {items.map(r => <ResultRow key={r.id} result={r} />)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchResults />
    </Suspense>
  )
}
