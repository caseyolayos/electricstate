'use client'

/**
 * NativeNotifications
 *
 * Listens for push-token and push-permission-state events fired by the
 * iOS WebKit bridge and saves the FCM token + device location to the
 * logged-in user's Supabase profile.
 *
 * Mount this once inside ClientProviders so it's active across all pages.
 */

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

export default function NativeNotifications() {
  const { user } = useAuth()

  // Clear app badge whenever the app comes to the foreground.
  // Also clears the WKWebView native badge via the webkit message bridge.
  useEffect(() => {
    const clearBadge = () => {
      try {
        // Web Badging API (PWA / WKWebView iOS 16.4+)
        if ('clearAppBadge' in navigator) {
          ;(navigator as unknown as { clearAppBadge: () => Promise<void> }).clearAppBadge().catch(() => {})
        } else if ('setAppBadge' in navigator) {
          ;(navigator as unknown as { setAppBadge: (n: number) => Promise<void> }).setAppBadge(0).catch(() => {})
        }
        // WKWebView bridge — Swift app should call UNUserNotificationCenter.setBadgeCount(0)
        const wk = (window as Record<string, unknown> & { webkit?: { messageHandlers?: Record<string, { postMessage: (v: unknown) => void }> } }).webkit?.messageHandlers
        if (wk?.['clear-badge']) wk['clear-badge'].postMessage({})
      } catch {}
    }

    clearBadge()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') clearBadge()
    }
    document.addEventListener('visibilitychange', onVisibility)
    // Also clear on page focus (covers WKWebView app-foreground edge cases)
    window.addEventListener('focus', clearBadge)
    window.addEventListener('pageshow', clearBadge)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', clearBadge)
      window.removeEventListener('pageshow', clearBadge)
    }
  }, [])

  // Save FCM token to profiles whenever a push-token event fires
  useEffect(() => {
    const handlePushToken = async (e: Event) => {
      const token = (e as CustomEvent<string>).detail
      if (!token || token === 'ERROR GET TOKEN' || !user) return

      const supabase = createClient()
      if (!supabase) return

      await supabase
        .from('profiles')
        .update({ fcm_token: token, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    window.addEventListener('push-token', handlePushToken)
    return () => window.removeEventListener('push-token', handlePushToken)
  }, [user])

  // Request + save location, and prompt for push permission on sign-in
  const { profile } = useAuth()

  useEffect(() => {
    if (!user) return

    // Save location
    const saveLocation = async (position: GeolocationPosition) => {
      const supabase = createClient()
      if (!supabase) return

      await supabase
        .from('profiles')
        .update({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(saveLocation, () => {
        // User denied or unavailable — silently ignore
      })
    }

    // Request push permission if no token saved yet
    if (!profile?.fcm_token) {
      try {
        const wk = (window as any).webkit?.messageHandlers
        if (wk?.['push-permission-request']) {
          window.addEventListener('push-permission-request', (e: Event) => {
            const granted = (e as CustomEvent).detail === 'granted'
            if (granted && wk['push-token']) {
              wk['push-token'].postMessage({})
            }
          }, { once: true })
          wk['push-permission-request'].postMessage({})
        }
      } catch {}
    }
  }, [user])

  return null
}
