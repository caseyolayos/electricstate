'use client'

import { useEffect } from 'react'

const LOCKED   = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
const UNLOCKED = 'width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover'

/**
 * Call useZoomLock(true) while a lightbox/flyer is open to re-enable
 * pinch-to-zoom. Restores the locked viewport when the component unmounts
 * or when `enabled` becomes false.
 */
export function useZoomLock(enabled: boolean) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]')
    if (!meta) return
    if (enabled) {
      meta.setAttribute('content', UNLOCKED)
    }
    return () => {
      meta.setAttribute('content', LOCKED)
    }
  }, [enabled])
}
