'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registered:', reg.scope))
        .catch((err) => console.error('SW registration failed:', err))
    }

    // iOS PWA fix: when the app is backgrounded for too long, iOS freezes the
    // JS context and React's touch event system doesn't reattach on resume.
    // Force a reload if the app was in the background for more than 10 minutes.
    const STALE_THRESHOLD_MS = 3 * 60 * 1000 // 3 minutes
    let hiddenAt: number | null = null

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (document.visibilityState === 'visible') {
        if (hiddenAt !== null && Date.now() - hiddenAt > STALE_THRESHOLD_MS) {
          window.location.reload()
        }
        hiddenAt = null
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  return null
}
