'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { getLevel } from '@/lib/mockStore'
import type { LeaderboardData, RaverEntry, FestivalEntry, ArtistEntry, VenueEntry } from '@/app/api/leaderboard/route'

type Tab = 'ravers' | 'festivals' | 'artists' | 'venues'

const RANK_STYLES: Record<number, { bg: string; color: string; label: string }> = {
  1: { bg: 'rgba(255,215,0,0.15)',  color: '#FFD700', label: '🥇' },
  2: { bg: 'rgba(192,192,192,0.12)', color: '#C0C0C0', label: '🥈' },
  3: { bg: 'rgba(205,127,50,0.15)', color: '#CD7F32', label: '🥉' },
}

function RankBadge({ rank }: { rank: number }) {
  const style = RANK_STYLES[rank]
  if (style) {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-base"
        style={{ background: style.bg }}>
        {style.label}
      </div>
    )
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: 'rgba(255,255,255,0.05)' }}>
      <span className="text-white/30 text-xs font-bold">{rank}</span>
    </div>
  )
}

function ScorePill({ score, suffix = '/ 5', color = '#C8FF00' }: { score: number; suffix?: string; color?: string }) {
  return (
    <div className="flex-shrink-0 text-right">
      <p className="text-sm font-black" style={{ color }}>{score.toFixed(1)}</p>
      <p className="text-[10px] text-white/25">{suffix}</p>
    </div>
  )
}

function RaverRow({ entry, isMe }: { entry: RaverEntry; isMe: boolean }) {
  const { level } = getLevel(entry.xp)
  const rankStyle = RANK_STYLES[entry.rank]
  return (
    <Link
      href={`/passport/${entry.username}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] active:bg-white/5"
      style={isMe ? { background: 'rgba(200,255,0,0.04)' } : undefined}
    >
      <RankBadge rank={entry.rank} />

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{ background: rankStyle ? rankStyle.bg : 'rgba(255,255,255,0.06)', border: `1px solid ${rankStyle ? rankStyle.color + '40' : 'rgba(255,255,255,0.08)'}` }}>
        {entry.avatar_url
          ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="text-lg leading-none">{entry.avatar_emoji}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-sm text-white truncate">
            {entry.display_name || entry.username}
          </p>
          {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
            style={{ background: 'rgba(200,255,0,0.15)', color: '#C8FF00' }}>You</span>}
        </div>
        <p className="text-white/30 text-xs mt-0.5">
          Level {level} · {entry.attended_count} events · {entry.badge_count} stamps
        </p>
      </div>

      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-black" style={{ color: rankStyle?.color ?? 'rgba(255,255,255,0.6)' }}>
          {entry.xp.toLocaleString()}
        </p>
        <p className="text-[10px] text-white/25">XP</p>
      </div>
    </Link>
  )
}

function FestivalRow({ entry }: { entry: FestivalEntry }) {
  const rankStyle = RANK_STYLES[entry.rank]
  const href = `/events/festival-${entry.festival_id}`
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] active:bg-white/5"
    >
      <RankBadge rank={entry.rank} />

      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
        style={{ background: 'rgba(255,255,255,0.06)' }}>
        {entry.image_url
          ? <img src={entry.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          : <div className="w-full h-full flex items-center justify-center text-lg">🎪</div>}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white truncate">{entry.name}</p>
        <p className="text-white/30 text-xs mt-0.5">
          {[entry.city, entry.date_start?.slice(0, 4)].filter(Boolean).join(' · ')}
          {' · '}{entry.raver_count} raver{entry.raver_count !== 1 ? 's' : ''} rated
        </p>
      </div>

      <ScorePill score={entry.avg_score} color={rankStyle?.color ?? '#C8FF00'} />
    </Link>
  )
}

function ArtistRow({ entry }: { entry: ArtistEntry }) {
  const rankStyle = RANK_STYLES[entry.rank]
  const initial = entry.artist_name[0]?.toUpperCase() ?? '?'
  return (
    <Link
      href={`/artists/${encodeURIComponent(entry.artist_name)}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] active:bg-white/5"
    >
      <RankBadge rank={entry.rank} />

      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
        style={{ background: rankStyle ? rankStyle.bg : 'rgba(200,255,0,0.06)', color: rankStyle?.color ?? '#C8FF00', border: `1px solid ${rankStyle ? rankStyle.color + '30' : 'rgba(200,255,0,0.15)'}` }}>
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white truncate">{entry.artist_name}</p>
        <p className="text-white/30 text-xs mt-0.5">
          {entry.rater_count} rater{entry.rater_count !== 1 ? 's' : ''}
          {entry.categories.vibe ? ` · Vibe ${entry.categories.vibe.toFixed(1)}★` : ''}
          {entry.categories.energy ? ` · Energy ${entry.categories.energy.toFixed(1)}★` : ''}
        </p>
      </div>

      <ScorePill score={entry.avg_score} color={rankStyle?.color ?? '#C8FF00'} />
    </Link>
  )
}

function VenueRow({ entry }: { entry: VenueEntry }) {
  const rankStyle = RANK_STYLES[entry.rank]
  const initial = entry.venue_name[0]?.toUpperCase() ?? '?'
  return (
    <Link
      href={`/venues/${encodeURIComponent(entry.venue_slug)}?name=${encodeURIComponent(entry.venue_name)}`}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] active:bg-white/5"
    >
      <RankBadge rank={entry.rank} />

      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
        style={{
          background: rankStyle ? rankStyle.bg : 'rgba(100,200,255,0.08)',
          color: rankStyle?.color ?? '#60A5FA',
          border: `1px solid ${rankStyle ? rankStyle.color + '30' : 'rgba(100,200,255,0.2)'}`,
        }}>
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-white truncate">{entry.venue_name}</p>
        <p className="text-white/30 text-xs mt-0.5">
          {entry.rater_count} rater{entry.rater_count !== 1 ? 's' : ''}
          {entry.categories.sound ? ` · Sound ${entry.categories.sound.toFixed(1)}★` : ''}
          {entry.categories.vibe ? ` · Vibe ${entry.categories.vibe.toFixed(1)}★` : ''}
        </p>
      </div>

      <ScorePill score={entry.avg_score} color={rankStyle?.color ?? '#60A5FA'} />
    </Link>
  )
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [tab, setTab] = useState<Tab>('ravers')
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Find current user's rank in ravers
  const myRank = data?.ravers.find(r => r.username === profile?.username)

  const tabs: { key: Tab; label: string; emoji: string; count?: number }[] = [
    { key: 'ravers',    label: 'Ravers',    emoji: '🎫', count: data?.ravers.length },
    { key: 'festivals', label: 'Festivals', emoji: '🎪', count: data?.festivals.length },
    { key: 'artists',   label: 'Artists',   emoji: '🎤', count: data?.artists.length },
    { key: 'venues',    label: 'Venues',    emoji: '🏟️', count: data?.venues.length },
  ]

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-white/10"
        style={{ background: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(16px)' }}>
        <div className="px-4 pt-5 pb-0 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white/70 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-black text-white">Leaderboard</h1>
              <p className="text-white/30 text-xs">Electric State scene rankings</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                  tab === t.key ? 'active-tab border-[#C8FF00]' : 'text-white/40 border-transparent hover:text-white/60'
                }`}>
                {t.emoji} {t.label}
                {!loading && t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab === t.key ? 'bg-[#C8FF00]/20 text-[#C8FF00]' : 'bg-white/10 text-white/40'
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Your rank banner (ravers tab only) */}
        {tab === 'ravers' && user && myRank && (
          <div className="mx-4 mt-4 p-3 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(200,255,0,0.07)', border: '1px solid rgba(200,255,0,0.2)' }}>
            <span className="text-2xl">{RANK_STYLES[myRank.rank]?.label ?? `#${myRank.rank}`}</span>
            <div className="flex-1">
              <p className="text-white font-bold text-sm">You're #{myRank.rank} on the leaderboard</p>
              <p className="text-white/40 text-xs">{myRank.xp.toLocaleString()} XP · check in at events to climb</p>
            </div>
          </div>
        )}

        {tab === 'ravers' && user && !myRank && !loading && (
          <div className="mx-4 mt-4 p-3 rounded-xl flex items-center gap-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-xl">🎫</span>
            <div className="flex-1">
              <p className="text-white/60 font-bold text-sm">You're not ranked yet</p>
              <p className="text-white/30 text-xs">
                {!profile?.username ? 'Set a username in your profile to appear' : 'Check in at events to earn XP and climb the board'}
              </p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-4 divide-y divide-white/[0.05]">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
                <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                  <div className="h-3 bg-white/5 rounded w-1/3" />
                </div>
                <div className="w-10 h-8 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Ravers */}
        {!loading && tab === 'ravers' && (
          <div className="mt-3 divide-y divide-white/[0.05]">
            {data?.ravers.map(entry => (
              <RaverRow key={entry.id} entry={entry} isMe={entry.username === profile?.username} />
            ))}
            {(!data?.ravers.length) && (
              <div className="px-4 py-16 text-center">
                <p className="text-4xl mb-3">🎫</p>
                <p className="text-white/50 font-bold">No ravers yet</p>
              </div>
            )}
          </div>
        )}

        {/* Festivals */}
        {!loading && tab === 'festivals' && (
          <div className="mt-3 divide-y divide-white/[0.05]">
            {data?.festivals.map(entry => (
              <FestivalRow key={entry.slug} entry={entry} />
            ))}
            {(!data?.festivals.length) && (
              <div className="px-4 py-16 text-center">
                <p className="text-4xl mb-3">🎪</p>
                <p className="text-white/50 font-bold">No festival ratings yet</p>
                <p className="text-white/30 text-sm mt-1">Rate events you've attended to put them on the board</p>
                <Link href="/events" className="inline-block mt-4 px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}>
                  Browse Events →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Artists */}
        {!loading && tab === 'artists' && (
          <div className="mt-3 divide-y divide-white/[0.05]">
            {data?.artists.map(entry => (
              <ArtistRow key={entry.artist_name} entry={entry} />
            ))}
            {(!data?.artists.length) && (
              <div className="px-4 py-16 text-center">
                <p className="text-4xl mb-3">🎤</p>
                <p className="text-white/50 font-bold">No artist ratings yet</p>
                <p className="text-white/30 text-sm mt-1">Rate artists on their pages to put them on the board</p>
              </div>
            )}
          </div>
        )}

        {/* Venues */}
        {!loading && tab === 'venues' && (
          <div className="mt-3 divide-y divide-white/[0.05]">
            {data?.venues.map(entry => (
              <VenueRow key={entry.venue_slug} entry={entry} />
            ))}
            {(!data?.venues.length) && (
              <div className="px-4 py-16 text-center">
                <p className="text-4xl mb-3">🏟️</p>
                <p className="text-white/50 font-bold">No venue ratings yet</p>
                <p className="text-white/30 text-sm mt-1">Rate venues on their pages to put them on the board</p>
                <Link href="/events" className="inline-block mt-4 px-4 py-2 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(200,255,0,0.12)', color: '#C8FF00' }}>
                  Browse Events →
                </Link>
              </div>
            )}
          </div>
        )}

        {!loading && (
          <p className="text-center text-white/15 text-xs py-6 px-4">
            Updates every 5 minutes · XP earned through check-ins, events & badges
          </p>
        )}
      </div>
    </div>
  )
}
