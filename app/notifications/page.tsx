'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'
import type { AppNotification } from '@/app/api/notifications/route'
import PullToRefresh from '@/components/PullToRefresh'
import { LAST_SEEN_KEY, CLEARED_EVENT } from '@/lib/useUnreadNotifications'

type Tab = 'all' | 'social' | 'events'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function eventDateLabel(iso: string): string {
  const d = new Date(iso)
  const todayStr = new Date().toISOString().split('T')[0]
  const eventStr = iso.split('T')[0]
  const msUntil = d.getTime() - Date.now()
  const daysUntil = Math.ceil(msUntil / (1000 * 60 * 60 * 24))
  if (eventStr === todayStr) return '🔥 Today'
  if (daysUntil === 1) return '⏰ Tomorrow'
  if (daysUntil > 1 && daysUntil <= 7) return `📅 ${daysUntil}d away`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function NotificationIcon({ type, actor }: {
  type: AppNotification['type']
  actor?: AppNotification['actor']
}) {
  if (type === 'new_follower' || type === 'friend_going') {
    return (
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.15)' }}>
          {actor?.avatar_url ? (
            <img src={actor.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl leading-none">{actor?.avatar_emoji || '🎵'}</span>
          )}
        </div>
        {type === 'new_follower' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{ background: '#C8FF00' }}>
            <span style={{ color: '#000' }}>+</span>
          </div>
        )}
        {type === 'friend_going' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
            style={{ background: 'rgba(200,255,0,0.9)' }}>
            <span style={{ color: '#000' }}>🎟</span>
          </div>
        )}
      </div>
    )
  }

  // push notification
  if (type === 'push') {
    return (
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.15)' }}>
        <svg className="w-5 h-5 text-[#C8FF00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
    )
  }

  // event_reminder (and any unknown type)
  return (
    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
      style={{ background: 'rgba(200,255,0,0.08)', border: '1px solid rgba(200,255,0,0.15)' }}>
      🎵
    </div>
  )
}

function NotificationRow({ n, isUnread }: { n: AppNotification; isUnread: boolean }) {
  return (
    <Link
      href={n.href || '#'}
      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03] active:bg-white/5 relative"
    >
      {/* Unread dot */}
      {isUnread && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{ background: '#C8FF00' }} />
      )}

      <NotificationIcon type={n.type} actor={n.actor} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${isUnread ? 'text-white font-semibold' : 'text-white/80 font-medium'}`}>
          {n.title}
        </p>
        <p className="text-white/40 text-xs mt-0.5 truncate">{n.body}</p>
      </div>

      <span className="text-white/25 text-[11px] flex-shrink-0 mt-0.5">
        {n.display_date ? eventDateLabel(n.display_date) : timeAgo(n.created_at)}
      </span>
    </Link>
  )
}

export default function NotificationsPage() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('all')
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [lastSeen, setLastSeen] = useState<number>(0)
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null)

  // Mark all as read immediately on mount + clear iOS app badge
  useEffect(() => {
    const now = Date.now()
    // Update last-seen so the unread dot calculation is accurate for this session
    setLastSeen(now)
    // Persist to localStorage so re-opens don't re-show badges
    localStorage.setItem(LAST_SEEN_KEY, now.toString())
    // Signal BottomNav / Sidebar / TopNav to reset their badge counts to 0 instantly
    window.dispatchEvent(new CustomEvent(CLEARED_EVENT))

    // Clear the iOS home screen app badge
    try {
      // Web Badging API (works for PWA / WKWebView on iOS 16.4+)
      if ('clearAppBadge' in navigator) {
        (navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => {})
      } else if ('setAppBadge' in navigator) {
        (navigator as unknown as { setAppBadge: (n: number) => Promise<void> }).setAppBadge(0).catch(() => {})
      }
      // WKWebView bridge fallback — the native app should handle 'clear-badge'
      const wk = (window as Record<string, unknown> & { webkit?: { messageHandlers?: Record<string, { postMessage: (v: unknown) => void }> } }).webkit?.messageHandlers
      if (wk?.['clear-badge']) wk['clear-badge'].postMessage({})
    } catch {}
  }, [])


  // Check push permission state
  useEffect(() => {
    const token = (profile as { fcm_token?: string | null })?.fcm_token
    setPushEnabled(!!token)
  }, [profile])

  const loadNotifications = useCallback(async () => {
    if (!user) { setLoading(false); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const token = supabase
        ? await supabase.auth.getSession().then((r: { data: { session: { access_token: string } | null } }) => r.data.session?.access_token ?? null)
        : null
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      // Fetch derived notifications (follows, reminders, friends) via API
      // AND query the notifications table directly via the browser Supabase client
      // (bypasses the auth-header issue in WKWebView)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

      const [apiRes, storedRes] = await Promise.all([
        fetch('/api/notifications', { headers, credentials: 'include' }),
        supabase
          ? supabase
              .from('notifications')
              .select('*')
              .eq('user_id', user.id)
              .gte('created_at', thirtyDaysAgo)
              .order('created_at', { ascending: false })
              .limit(30)
          : Promise.resolve({ data: null }),
      ])

      const derived: AppNotification[] = apiRes.ok
        ? (await apiRes.json()).notifications || []
        : []

      const stored: AppNotification[] = ((storedRes as { data: unknown[] | null }).data ?? []).map(
        (row: unknown) => {
          const r = row as { id: string; type: string; title: string; body: string | null; data: Record<string, string> | null; created_at: string }
          return {
            id: `stored-${r.id}`,
            type: r.type as AppNotification['type'],
            title: r.title,
            body: r.body ?? '',
            created_at: r.created_at,
            href: r.data?.url,
          }
        }
      )

      // Merge: stored push notifications first, then derived — dedupe by id
      const seen = new Set<string>()
      const merged = [...stored, ...derived].filter(n => {
        if (seen.has(n.id)) return false
        seen.add(n.id)
        return true
      })

      setNotifications(merged)
    } catch {}
    setLoading(false)
  }, [user])

  useEffect(() => { loadNotifications() }, [loadNotifications])

  // Request push permission
  function requestPush() {
    try {
      const wk = (window as Record<string, unknown> & { webkit?: { messageHandlers?: Record<string, { postMessage: (v: unknown) => void }> } }).webkit?.messageHandlers
      if (wk?.['push-permission-request']) {
        wk['push-permission-request'].postMessage({})
      } else if ('Notification' in window) {
        Notification.requestPermission()
      }
    } catch {}
  }

  const social = notifications.filter(n => n.type === 'new_follower' || n.type === 'friend_going')
  const events = notifications.filter(n => n.type === 'event_reminder')

  const displayed =
    tab === 'social' ? social :
    tab === 'events' ? events :
    notifications

  const unreadCount = notifications.filter(n => new Date(n.created_at).getTime() > lastSeen).length

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'social', label: 'Social', count: social.length },
    { key: 'events', label: 'Events', count: events.length },
  ]

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center pb-24">
        <p className="text-5xl mb-4">🔔</p>
        <h1 className="text-2xl font-black text-white mb-2">Sign in to see notifications</h1>
        <p className="text-white/40 text-sm mb-6">Follow friends, save events, and stay in the loop.</p>
        <Link
          href="/login"
          className="px-6 py-3 rounded-xl text-sm font-bold"
          style={{ background: '#C8FF00', color: '#000' }}
        >
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={loadNotifications} className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-white/10"
        style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)' }}>
        <div className="px-4 pt-5 pb-0 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="text-white/40 hover:text-white/70 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-black text-white flex items-center gap-2">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#C8FF00', color: '#000' }}>
                      {unreadCount} new
                    </span>
                  )}
                </h1>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0 border-b-2 ${
                  tab === t.key
                    ? 'active-tab border-[#C8FF00]'
                    : 'text-white/40 border-transparent hover:text-white/60'
                }`}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab === t.key ? 'bg-[#C8FF00]/20 text-[#C8FF00]' : 'bg-white/10 text-white/40'
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">

        {/* Push notification banner */}
        {pushEnabled === false && (
          <div className="mx-4 mt-4 rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(200,255,0,0.07)', border: '1px solid rgba(200,255,0,0.2)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
              style={{ background: 'rgba(200,255,0,0.12)' }}>
              🔔
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">Enable push notifications</p>
              <p className="text-white/50 text-xs mt-0.5">Get alerts for events, new followers & friends' plans</p>
            </div>
            <button
              onClick={requestPush}
              className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ background: '#C8FF00', color: '#000' }}
            >
              Enable
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="mt-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-white/10 flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
                <div className="w-8 h-3 bg-white/5 rounded mt-1" />
              </div>
            ))}
          </div>
        )}

        {/* Notification list */}
        {!loading && displayed.length > 0 && (
          <div className="mt-2 divide-y divide-white/[0.05]">
            {displayed.map(n => (
              <NotificationRow
                key={n.id}
                n={n}
                isUnread={new Date(n.created_at).getTime() > lastSeen}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
            <p className="text-5xl mb-4">
              {tab === 'social' ? '👥' : tab === 'events' ? '🎟️' : '🔔'}
            </p>
            <p className="text-white/60 font-bold text-base">
              {tab === 'social'
                ? 'No social activity yet'
                : tab === 'events'
                ? 'No upcoming events'
                : 'All caught up!'}
            </p>
            <p className="text-white/30 text-sm mt-1.5 max-w-xs">
              {tab === 'social'
                ? 'When someone follows you or friends save events, you\'ll see it here.'
                : tab === 'events'
                ? 'Mark yourself as "going" on events to get reminders here.'
                : 'Nothing new right now. Check back after hitting some shows.'}
            </p>
            {tab === 'events' && (
              <Link
                href="/events"
                className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(200,255,0,0.15)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.3)' }}
              >
                Browse Events →
              </Link>
            )}
            {tab === 'social' && (
              <Link
                href="/passport"
                className="mt-6 px-5 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(200,255,0,0.15)', color: '#C8FF00', border: '1px solid rgba(200,255,0,0.3)' }}
              >
                Find Friends →
              </Link>
            )}
          </div>
        )}

        {/* Footer note */}
        {!loading && notifications.length > 0 && (
          <p className="text-center text-white/20 text-xs py-6">
            Showing last 30 days of activity
          </p>
        )}
      </div>
    </PullToRefresh>
  )
}
