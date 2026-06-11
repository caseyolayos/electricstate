'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { getLevel } from '@/lib/mockStore'
import { STAMPS } from '@/lib/mockData'

interface Follower {
  id: string
  username: string | null
  display_name: string | null
  avatar_emoji: string
  avatar_url: string | null
  xp: number
  badges: string[]
}

export default function FollowersPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [followers, setFollowers] = useState<Follower[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }

    import('@/lib/supabase').then(({ createClient }) => {
      const sb = createClient()
      if (!sb) return
      sb.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token
        if (!token) { setLoading(false); return }
        fetch('/api/profile/followers', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(r => r.json())
          .then(d => { setFollowers(d.followers || []); setLoading(false) })
          .catch(() => setLoading(false))
      })
    })
  }, [user, router])

  return (
    <div className="px-4 py-6 max-w-2xl mx-auto w-full pb-24">
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white/70 transition-colors">
          ←
        </button>
        <div>
          <h1 className="text-2xl font-black text-white">Followers</h1>
          {!loading && <p className="text-white/40 text-sm">{followers.length} {followers.length === 1 ? 'person' : 'people'}</p>}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass p-4 flex items-center gap-3 animate-pulse">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/2" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : followers.length === 0 ? (
        <div className="glass p-10 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-white font-bold mb-1">No followers yet</p>
          <p className="text-white/40 text-sm mb-5">Share your passport and start building your crew</p>
          <Link href="/events"
            className="inline-block px-5 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: '#C8FF00', color: '#000' }}>
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {followers.map(person => {
            const { level, title } = getLevel(person.xp)
            const earnedStamps = STAMPS.filter(s => person.badges.includes(s.id)).length
            const displayName = person.display_name || person.username || 'Anonymous'

            return (
              <Link
                key={person.id}
                href={person.username ? `/passport/${encodeURIComponent(person.username)}` : '#'}
                className="glass p-4 flex items-center gap-3 hover:border-white/20 transition-all group"
              >
                {person.avatar_url ? (
                  <img src={person.avatar_url} alt={displayName}
                    className="w-12 h-12 rounded-2xl object-cover flex-shrink-0 border border-white/10"
                    loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border border-white/10"
                    style={{ background: 'rgba(200,255,0,0.08)' }}>
                    {person.avatar_emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm group-hover:text-[#C8FF00] transition-colors truncate">{displayName}</p>
                  {person.username && <p className="text-white/40 text-xs">@{person.username}</p>}
                  <p className="text-white/30 text-xs mt-0.5">{title} · {earnedStamps} stamp{earnedStamps !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-shrink-0">
                  <div className="text-xs font-bold px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(200,255,0,0.1)', color: '#C8FF00' }}>
                    Lv.{level}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
