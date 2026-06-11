'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUnreadNotifications } from '@/lib/useUnreadNotifications'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, profile, isOrganizer, signOut, loading } = useAuth()

  const isAdmin = user?.email === 'caseyolayos@gmail.com'
  const unreadCount = useUnreadNotifications(user?.id)

  const navItems = [
    { href: '/', label: 'Home', icon: homeIcon },
    { href: '/events', label: 'Scene Map', icon: eventsIcon },
    { href: '/submit', label: 'Submit Event', icon: submitIcon },
    { href: '/notifications', label: 'Notifications', icon: notificationsIcon },
    { href: '/leaderboard', label: 'Leaderboard', icon: leaderboardIcon },
    { href: '/passport', label: 'Passport', icon: passportIcon },
    ...(!loading && isOrganizer ? [{ href: '/organizer/dashboard', label: 'Organizer Dashboard', icon: dashboardIcon }] : []),
    ...(!loading && isAdmin ? [{ href: '/admin', label: 'Admin', icon: adminIcon }] : []),
  ]

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 z-50 border-r border-white/10"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)' }}>

      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <img src="/eslogo.webp" alt="Electric State" className="w-8 h-8 object-contain" />
          <span className="text-lg font-black gradient-text tracking-tight">Electric State</span>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="flex flex-col gap-1">
          {navItems.map(item => {
            const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                    active
                      ? 'text-[#C8FF00] bg-[#C8FF00]/8'
                      : 'text-white/45 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {/* Active left border with glow */}
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: '#C8FF00', boxShadow: '0 0 8px rgba(200,255,0,0.8), 0 0 20px rgba(200,255,0,0.3)' }} />
                  )}
                  <span className={active ? 'text-[#C8FF00]' : 'text-white/40'}>
                    {item.icon(active)}
                  </span>
                  {item.label}
                  {item.href === '/notifications' && unreadCount > 0 && (
                    <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      style={{ background: '#C8FF00', color: '#000' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User section at bottom */}
      <div className="px-4 py-4 border-t border-white/10">
        {user ? (
          <div className="flex flex-col gap-3">
            <Link href="/profile" className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center"
                style={{ background: 'rgba(200,255,0,0.08)' }}>
                {(profile as { avatar_url?: string })?.avatar_url ? (
                  <img
                    loading="lazy"
                    decoding="async"
                    src={(profile as { avatar_url?: string }).avatar_url}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg leading-none">{profile?.avatar_emoji ?? '🎵'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {profile?.display_name ?? profile?.username ?? 'Profile'}
                </p>
                {profile?.username && (
                  <p className="text-white/30 text-xs truncate">@{profile.username}</p>
                )}
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors w-full"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-[0_0_15px_rgba(200,255,0,0.3)]"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            Sign In
          </Link>
        )}
      </div>
    </aside>
  )
}

function homeIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function eventsIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function submitIcon(_active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  )
}

function leaderboardIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}
function notificationsIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  )
}
function passportIcon(active: boolean) {
  return (
    <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2" />
    </svg>
  )
}

function dashboardIcon(_active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function adminIcon(_active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
