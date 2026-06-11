'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

const CATEGORIES = [
  { key: 'set_selection',  label: 'Set Selection',   emoji: '🎵', desc: 'Track choices & flow' },
  { key: 'energy',         label: 'Energy',           emoji: '⚡', desc: 'How hard they go' },
  { key: 'stage_presence', label: 'Stage Presence',   emoji: '🎤', desc: 'Do they hold the room' },
  { key: 'sound',          label: 'Sound Quality',    emoji: '🔊', desc: 'Mix clarity & punch' },
  { key: 'vibe',           label: 'Overall Vibe',     emoji: '✨', desc: 'The gut-check number' },
]

interface VoteData { avg: number; count: number }

function StarRow({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled: boolean
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="text-xl transition-transform hover:scale-110 active:scale-95 px-0.5 disabled:cursor-default"
        >
          <span style={{ color: star <= (hover || value) ? '#C8FF00' : 'rgba(255,255,255,0.15)' }}>★</span>
        </button>
      ))}
    </div>
  )
}

function RatingBar({ avg, count }: { avg: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(avg / 5) * 100}%`, background: 'linear-gradient(90deg, #C8FF00, rgba(200,255,0,0.6))' }}
        />
      </div>
      <span className="text-[#C8FF00] text-xs font-bold w-6 text-right">{avg.toFixed(1)}</span>
      <span className="text-white/25 text-[10px] w-12">({count})</span>
    </div>
  )
}

export default function ArtistRating({ artistName }: { artistName: string }) {
  const { user } = useAuth()
  const [serverVotes, setServerVotes] = useState<Record<string, VoteData>>({})
  const [myVotes, setMyVotes] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [xpToast, setXpToast] = useState<number | null>(null)

  const storageKey = `artist-votes-${artistName.toLowerCase()}`

  useEffect(() => {
    // Load existing votes from API
    fetch(`/api/artists/${encodeURIComponent(artistName)}/votes`)
      .then(r => r.json())
      .then(d => setServerVotes(d.votes || {}))
      .catch(() => {})

    // Restore user's previous votes from localStorage
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) setMyVotes(JSON.parse(stored))
    } catch {}
  }, [artistName, storageKey])

  const hasAnyVotes = Object.keys(serverVotes).length > 0
  const myVoteCount = Object.keys(myVotes).length
  const overallAvg = hasAnyVotes
    ? Object.values(serverVotes).reduce((s, v) => s + v.avg, 0) / Object.values(serverVotes).length
    : null

  async function handleVote(category: string, rating: number) {
    if (!user) return
    setSaving(category)

    const newMyVotes = { ...myVotes, [category]: rating }
    setMyVotes(newMyVotes)
    localStorage.setItem(storageKey, JSON.stringify(newMyVotes))

    // Optimistically update local avg
    const current = serverVotes[category]
    if (current) {
      const prevRating = myVotes[category]
      let newAvg: number, newCount: number
      if (prevRating) {
        newCount = current.count
        newAvg = (current.avg * newCount - prevRating + rating) / newCount
      } else {
        newCount = current.count + 1
        newAvg = (current.avg * current.count + rating) / newCount
      }
      setServerVotes(prev => ({ ...prev, [category]: { avg: Math.round(newAvg * 10) / 10, count: newCount } }))
    } else {
      setServerVotes(prev => ({ ...prev, [category]: { avg: rating, count: 1 } }))
    }

    try {
      const supabase = createClient()
      const userId = user.id
      const res = await fetch(`/api/artists/${encodeURIComponent(artistName)}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, rating, userId }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.votes) setServerVotes(data.votes)
        if (data.xp_awarded > 0) {
          setXpToast(data.xp_awarded)
          setTimeout(() => setXpToast(null), 2500)
        }
      }
      void supabase
    } catch {}

    setSaving(null)
  }

  return (
    <section>
      {/* Header — always visible, tap to expand */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <h2 className="font-black text-white text-lg flex items-center gap-2">
          🎤 Live Performance
          {overallAvg !== null && (
            <span className="text-sm font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}>
              {overallAvg.toFixed(1)} ★
            </span>
          )}
          {myVoteCount > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
              You rated
            </span>
          )}
        </h2>
        <svg
          className={`w-4 h-4 text-white/30 transition-transform group-hover:text-white/60 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Collapsed summary bar */}
      {!expanded && hasAnyVotes && (
        <button onClick={() => setExpanded(true)} className="w-full glass p-4 rounded-2xl text-left">
          <div className="flex flex-col gap-2">
            {CATEGORIES.filter(c => serverVotes[c.key]).map(cat => (
              <div key={cat.key} className="flex items-center gap-2">
                <span className="text-sm w-5 flex-shrink-0">{cat.emoji}</span>
                <span className="text-white/50 text-xs w-28 flex-shrink-0">{cat.label}</span>
                <RatingBar avg={serverVotes[cat.key].avg} count={serverVotes[cat.key].count} />
              </div>
            ))}
          </div>
          <p className="text-white/25 text-xs mt-3 text-center">
            Tap to {user ? 'rate' : 'see details'}
          </p>
        </button>
      )}

      {/* Empty collapsed state */}
      {!expanded && !hasAnyVotes && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full glass p-6 rounded-2xl text-center"
        >
          <p className="text-3xl mb-2">🎤</p>
          <p className="text-white/60 font-bold text-sm">No ratings yet</p>
          <p className="text-white/30 text-xs mt-1">
            {user ? 'Be the first to rate this artist\'s live show' : 'Sign in to rate this artist'}
          </p>
        </button>
      )}

      {/* Expanded rating panel */}
      {expanded && (
        <div className="glass rounded-2xl overflow-hidden">
          {CATEGORIES.map((cat, i) => {
            const serverVote = serverVotes[cat.key]
            const myRating = myVotes[cat.key] ?? 0
            const isSaving = saving === cat.key

            return (
              <div
                key={cat.key}
                className={`px-4 py-4 ${i < CATEGORIES.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    <span className="text-xl mt-0.5 flex-shrink-0">{cat.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white font-bold text-sm">{cat.label}</p>
                        <p className="text-white/30 text-xs">{cat.desc}</p>
                      </div>
                      {serverVote && (
                        <div className="mt-1.5">
                          <RatingBar avg={serverVote.avg} count={serverVote.count} />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {user ? (
                      <div className="flex items-center gap-1">
                        {isSaving && (
                          <span className="w-3 h-3 border border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin mr-1" />
                        )}
                        <StarRow
                          value={myRating}
                          onChange={v => handleVote(cat.key, v)}
                          disabled={isSaving}
                        />
                      </div>
                    ) : (
                      <span className="text-white/20 text-xs">Sign in</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Footer */}
          <div className="px-4 py-3 border-t border-white/[0.06]"
            style={{ background: 'rgba(0,0,0,0.2)' }}>
            {user ? (
              <>
                <p className="text-white/25 text-xs text-center">
                  {myVoteCount === 0
                    ? 'Rate based on what you\'ve seen live'
                    : myVoteCount < CATEGORIES.length
                    ? `${myVoteCount}/${CATEGORIES.length} categories rated — keep going`
                    : '✓ All categories rated — thanks for contributing'}
                </p>
                <p className="text-white/20 text-[10px] text-center mt-0.5">+5 XP per new category rated</p>
                {xpToast !== null && (
                  <div className="flex justify-center mt-2 animate-slide-up">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs shadow-[0_0_16px_rgba(200,255,0,0.4)]"
                      style={{ background: 'linear-gradient(135deg, #C8FF00, #C8FF00)', color: '#000' }}>
                      ⚡ +{xpToast} XP earned!
                    </div>
                  </div>
                )}
              </>
            ) : (
              <a href="/login" className="block text-center text-[#C8FF00] text-xs hover:underline font-bold">
                Sign in to rate →
              </a>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
