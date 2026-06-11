'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUnreadNotifications } from '@/lib/useUnreadNotifications'

const ADMIN_EMAIL = 'caseyolayos@gmail.com'

const baseLinks = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Map' },
  { href: '/submit', label: 'Submit' },
  { href: '/passport', label: 'Passport' },
]

export default function TopNav() {
  const pathname = usePathname()
  const { user, profile } = useAuth()
  const unreadCount = useUnreadNotifications(user?.id)
  const navLinks = user?.email === ADMIN_EMAIL
    ? [...baseLinks, { href: '/admin', label: 'Admin' }]
    : baseLinks

  return (
    <nav className="hidden md:flex lg:hidden fixed top-0 left-0 right-0 z-50 items-center justify-between px-8 py-4 border-b border-white/10"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}>
      <Link href="/" className="flex items-center gap-2">
        <img src="/eslogo.webp" alt="Electric State" className="w-7 h-7 object-contain" />
        <span className="text-lg font-black gradient-text tracking-tight">Electric State</span>
      </Link>
      <div className="flex items-center gap-6">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              pathname === link.href
                ? 'text-[#C8FF00]'
                : 'text-white/60 hover:text-white'
            }`}
          >
            {link.label}
          </Link>
        ))}

        {/* Notifications bell */}
        {user && (
          <Link href="/notifications" className="relative p-1.5 text-white/50 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{ background: '#C8FF00', color: '#000' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        )}

        {/* Auth button */}
        {user ? (
          <Link
            href="/profile"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-sm font-medium ${
              pathname === '/profile'
                ? 'border-[#C8FF00]/50 bg-[#C8FF00]/10 text-[#C8FF00]'
                : 'border-white/15 text-white/70 hover:border-white/30 hover:text-white'
            }`}
          >
            {profile?.avatar_url ? (
              <img loading="lazy" decoding="async" src={profile.avatar_url} alt="Avatar" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <span className="text-base leading-none">{profile?.avatar_emoji ?? '🎵'}</span>
            )}
            <span className="max-w-[100px] truncate">{profile?.display_name ?? profile?.username ?? 'Profile'}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-full text-sm font-bold transition-all hover:shadow-[0_0_15px_rgba(200,255,0,0.3)]"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}
