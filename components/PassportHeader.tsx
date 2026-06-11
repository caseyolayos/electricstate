'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getLevel } from '@/lib/mockStore'
import { useAuth } from '@/lib/auth'

const BASE_URL = 'https://www.electricstate.app'

function ShareButton({ username, displayName, xp, eventCount }: {
  username: string | null | undefined
  displayName: string | null | undefined
  xp: number
  eventCount: number
}) {
  const [copied, setCopied] = useState(false)

  if (!username) {
    return (
      <Link
        href="/profile"
        title="Set a username to get your shareable link"
        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white/30 hover:text-white/60 transition-colors border border-white/10 hover:border-white/20"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </Link>
    )
  }

  const shareUrl = `${BASE_URL}/passport/${encodeURIComponent(username)}`
  const shareText = `Check out my Electric State Passport 🎫 — ${eventCount} event${eventCount !== 1 ? 's' : ''} attended, ${xp.toLocaleString()} XP earned on the underground electronic music scene.`

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName || username}\'s Passport`, text: shareText, url: shareUrl })
        return
      } catch { /* user cancelled or unsupported */ }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  return (
    <button
      onClick={handleShare}
      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
      style={copied
        ? { background: 'rgba(200,255,0,0.2)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.4)' }
        : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }
      }
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Share Passport
        </>
      )}
    </button>
  )
}

interface Props {
  xp: number
  attendedCount: number
  savedCount: number
  stampCount: number
  followingCount: number
  followerCount: number
}

export default function PassportHeader({ xp, attendedCount, savedCount, stampCount, followingCount, followerCount }: Props) {
  const { level, title } = getLevel(xp)
  const { user, profile } = useAuth()

  const levelColors = [
    '',
    'from-[#C8FF00]/60 to-[#C8FF00]/20',
    'from-blue-500 to-cyan-400',
    'from-purple-500 to-blue-400',
    'from-yellow-400 to-orange-400',
  ]

  const displayName = profile?.display_name || profile?.username || (user ? 'Unnamed Raver' : null)
  const handle = profile?.username ? `@${profile.username}` : null
  const avatarEmoji = profile?.avatar_emoji ?? '⚡'

  return (
    <div className="glass overflow-hidden">
      {/* Level color strip */}
      <div className={`h-1.5 bg-gradient-to-r ${levelColors[level]}`} />
      <div className="p-5">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-white/10"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 border border-white/10"
              style={{ background: user ? 'rgba(200,255,0,0.1)' : 'linear-gradient(135deg, rgba(200,255,0,0.2), rgba(200,255,0,0.05))' }}>
              {avatarEmoji}
            </div>
          )}
          <div className="flex-1 min-w-0">
            {displayName ? (
              <>
                <h2 className="font-bold text-white text-lg leading-tight truncate">{displayName}</h2>
                {handle && <p className="text-white/40 text-xs">{handle}</p>}
              </>
            ) : (
              <Link href="/login" className="group">
                <h2 className="font-bold text-white/60 text-base group-hover:text-white transition-colors">Sign in to save progress</h2>
                <p className="text-[#C8FF00] text-xs mt-0.5 group-hover:underline">Sign in →</p>
              </Link>
            )}
            <p className="gradient-text font-semibold text-sm mt-0.5">{title}</p>
            <p className="text-white/30 text-xs">Level {level} · {xp.toLocaleString()} XP</p>
          </div>
          {user && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <ShareButton
                username={profile?.username}
                displayName={displayName}
                xp={xp}
                eventCount={attendedCount}
              />
              <Link href="/profile" className="text-white/30 hover:text-[#C8FF00] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Stats row */}
        {/* Row 1: activity stats */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {[
            { label: 'Events', value: attendedCount },
            { label: 'Saved', value: savedCount },
            { label: 'Stamps', value: stampCount },
          ].map(stat => (
            <div key={stat.label} className="bg-white/5 rounded-xl p-2.5 text-center border border-white/10">
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-white/40 text-[10px]">{stat.label}</p>
            </div>
          ))}
        </div>
        {/* Row 2: social stats */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {[
            { label: 'Followers', value: followerCount, href: '/passport/followers' },
            { label: 'Following', value: followingCount, href: '/passport/following' },
          ].map(stat => (
            <Link key={stat.label} href={stat.href}
              className="bg-white/5 rounded-xl p-2.5 text-center border border-white/10 hover:border-[#C8FF00]/30 transition-colors block">
              <p className="text-lg font-bold text-white">{stat.value}</p>
              <p className="text-white/40 text-[10px]">{stat.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
