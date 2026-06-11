'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export const LAST_SEEN_KEY = 'notifications_last_seen'
export const CLEARED_EVENT = 'notifications-cleared'

/** Fetches unread notification count for the current user.
 *  Listens for the CLEARED_EVENT custom event to reset to 0 instantly
 *  when the notifications page is opened — no re-fetch needed. */
export function useUnreadNotifications(userId: string | undefined) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) return

    async function load() {
      const supabase = createClient()
      const token = supabase
        ? await supabase.auth.getSession().then((r: { data: { session: { access_token: string } | null } }) => r.data.session?.access_token ?? null)
        : null
      if (!token) return
      try {
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = await res.json()
        const lastSeen = parseInt(localStorage.getItem(LAST_SEEN_KEY) || '0', 10)
        const unread = (data.notifications || []).filter(
          (n: { created_at: string }) => new Date(n.created_at).getTime() > lastSeen
        ).length
        setCount(unread)
      } catch {}
    }

    load()

    // When the notifications page marks everything as read, reset instantly
    const handleCleared = () => setCount(0)
    window.addEventListener(CLEARED_EVENT, handleCleared)
    return () => window.removeEventListener(CLEARED_EVENT, handleCleared)
  }, [userId])

  return count
}
