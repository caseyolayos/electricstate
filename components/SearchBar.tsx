'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface SearchResult {
  type: 'event' | 'artist' | 'venue' | 'raver'
  id: string
  name: string
  subtitle?: string
  imageUrl?: string
  avatarEmoji?: string
  href: string
}

const TYPE_ICON: Record<string, string> = {
  event: '🎫',
  artist: '🎧',
  venue: '📍',
  raver: '🎫',
}

const TYPE_LABEL: Record<string, string> = {
  event: 'Event',
  artist: 'Artist',
  venue: 'Venue',
  raver: 'Raver',
}

const GROUP_ORDER = ['raver', 'event', 'artist', 'venue']

function ResultRow({ result, onClose }: { result: SearchResult; onClose: () => void }) {
  const initials = result.name
    .split(/\s+/)
    .filter(w => w.length > 1)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || result.name[0]?.toUpperCase() || '?'

  return (
    <Link
      href={result.href}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/8 active:bg-white/12 transition-colors"
    >
      {/* Thumbnail */}
      <div
        className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-xs font-black text-white"
        style={{
          background: result.imageUrl
            ? undefined
            : result.type === 'raver'
            ? 'rgba(200,255,0,0.1)'
            : result.type === 'artist'
            ? 'linear-gradient(135deg, #7C3AED, #2563EB)'
            : result.type === 'venue'
            ? 'linear-gradient(135deg, #0891B2, #0D9488)'
            : 'linear-gradient(135deg, #DC2626, #9333EA)',
          borderRadius: result.type === 'raver' ? '50%' : undefined,
          border: result.type === 'raver' ? '1px solid rgba(200,255,0,0.2)' : undefined,
        }}
      >
        {result.imageUrl ? (
          <img loading="lazy" decoding="async" src={result.imageUrl} alt={result.name}
            className="w-full h-full object-cover"
            style={{ borderRadius: result.type === 'raver' ? '50%' : undefined }} />
        ) : result.type === 'raver' && result.avatarEmoji ? (
          <span className="text-xl leading-none">{result.avatarEmoji}</span>
        ) : (
          initials
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate leading-snug">{result.name}</p>
        {result.subtitle && (
          <p className="text-white/40 text-xs truncate leading-snug">{result.subtitle}</p>
        )}
      </div>

      {/* Type badge */}
      <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border border-white/10 bg-white/5">
        <span className="text-[10px]">{TYPE_ICON[result.type]}</span>
        <span className="text-[10px] text-white/50 font-medium">{TYPE_LABEL[result.type]}</span>
      </div>
    </Link>
  )
}

function groupByType(results: SearchResult[]) {
  const groups: Record<string, SearchResult[]> = {}
  for (const r of results) {
    if (!groups[r.type]) groups[r.type] = []
    groups[r.type].push(r)
  }
  return groups
}

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const router = useRouter()

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    // Cancel previous in-flight request
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    // Timeout so the spinner never spins forever
    const timeoutId = setTimeout(() => ctrl.abort(), 6000)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      clearTimeout(timeoutId)
      const data = await res.json()
      setResults(data.results || [])
      setOpen(true)
    } catch (e) {
      clearTimeout(timeoutId)
      if ((e as Error).name !== 'AbortError') setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce input
  useEffect(() => {
    const t = setTimeout(() => search(query), 300)
    return () => clearTimeout(t)
  }, [query, search])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
      if (e.key === 'Enter' && query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [query, router])

  const groups = groupByType(results)
  const groupOrder = GROUP_ORDER

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Search artists, venues, events, ravers…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm text-white placeholder-white/35 outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          onFocusCapture={e => {
            (e.target as HTMLInputElement).style.borderColor = 'rgba(200,255,0,0.4)'
            ;(e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.10)'
          }}
          onBlurCapture={e => {
            (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.12)'
            ;(e.target as HTMLInputElement).style.background = 'rgba(255,255,255,0.08)'
          }}
        />
        {/* Spinner or clear */}
        {loading ? (
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : query.length > 0 ? (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Clear search"
          >
            <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 shadow-2xl"
          style={{
            background: 'rgba(12,12,12,0.98)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(24px)',
          }}
        >
          {groupOrder.map(type => {
            const items = groups[type]
            if (!items?.length) return null
            return (
              <div key={type}>
                {/* Section header */}
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-white/25">
                    {TYPE_ICON[type]} {TYPE_LABEL[type]}s
                  </p>
                </div>
                {items.map(r => (
                  <ResultRow key={r.id} result={r} onClose={() => { setOpen(false); setQuery('') }} />
                ))}
              </div>
            )
          })}

          {/* Footer: see all */}
          <div className="px-4 py-3 border-t border-white/8">
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              onClick={() => { setOpen(false); setQuery('') }}
              className="flex items-center justify-center gap-1.5 text-[#C8FF00] text-xs font-bold hover:underline"
            >
              See all results for &ldquo;{query}&rdquo; →
            </Link>
          </div>
        </div>
      )}

      {/* No results state */}
      {open && !loading && query.length >= 2 && results.length === 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 shadow-2xl px-4 py-6 text-center"
          style={{
            background: 'rgba(12,12,12,0.98)',
            border: '1px solid rgba(255,255,255,0.10)',
            backdropFilter: 'blur(24px)',
          }}
        >
          <p className="text-white/40 text-sm">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-white/25 text-xs mt-1">Try an artist name, venue, or event</p>
        </div>
      )}
    </div>
  )
}
