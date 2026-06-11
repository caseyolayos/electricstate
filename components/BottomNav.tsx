'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useUnreadNotifications } from '@/lib/useUnreadNotifications'

export default function BottomNav() {
  const pathname = usePathname()
  const { user, profile, isOrganizer, loading } = useAuth()

  const isAdmin = user?.email === 'caseyolayos@gmail.com'

  const unreadCount = useUnreadNotifications(user?.id)

  // Tab layout:
  // Regular users:  Home | Events | Submit | Alerts | Passport
  // Organizers:     Home | Events | Dashboard | Alerts | Passport
  //   (Submit lives on the Dashboard page for organizers)
  const tabs = [
    { href: '/', label: 'Home', icon: homeIcon },
    { href: '/events', label: 'Events', icon: eventsIcon },
    ...(!loading && isOrganizer
      ? [{ href: '/organizer/dashboard', label: 'Dashboard', icon: dashboardIcon }]
      : [{ href: '/submit', label: 'Submit', icon: submitIcon }]
    ),
    { href: '/notifications', label: 'Alerts', icon: notificationsIcon, badge: unreadCount },
    {
      href: user ? '/passport' : '/login',
      label: user ? 'Passport' : 'Sign In',
      icon: user ? passportIcon : profileIcon,
      avatar: user && profile ? { emoji: profile.avatar_emoji, url: (profile as { avatar_url?: string }).avatar_url } : null,
    },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10"
      style={{
        background: 'rgba(0,0,0,0.95)',
        backdropFilter: 'blur(16px)',
        // Respect iPhone home indicator safe area
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around py-2 px-1">
        {tabs.map(tab => {
          const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[44px] relative ${
                active ? 'text-[#C8FF00]' : 'text-white/30 hover:text-white/55'
              }`}
              style={active ? { filter: 'drop-shadow(0 0 10px rgba(200,255,0,0.6))' } : undefined}
            >
              {'badge' in tab && tab.badge ? (
              <div className="relative">
                {tab.icon(active)}
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                  style={{ background: '#C8FF00', color: '#000' }}>
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              </div>
            ) : 'avatar' in tab && tab.avatar ? (
                tab.avatar.url
                  ? <img loading="lazy" decoding="async" src={tab.avatar.url} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
                  : <span className="text-xl leading-none w-5 h-5 flex items-center justify-center">{tab.avatar.emoji ?? '🎵'}</span>
              ) : (
                tab.icon(active)
              )}
              {active && <span className="text-[10px] font-semibold tracking-wide">{tab.label}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Icon components
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
function profileIcon(_active: boolean) {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
