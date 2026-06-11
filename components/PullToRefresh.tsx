'use client'

/**
 * PullToRefresh
 * Attaches to window-level touch events so it works with any page scroll model.
 * Fires onRefresh when the user pulls down ≥64px from the very top of the page.
 */

import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react'

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
}

const THRESHOLD = 64  // px of pull needed to trigger
const MAX_PULL  = 96  // px max visual travel

export default function PullToRefresh({ onRefresh, children, className = '' }: Props) {
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only start tracking when the page is scrolled to the very top
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY
      pulling.current = false
    } else {
      startY.current = null
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === null || refreshing) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) {
      pulling.current = true
      const damped = Math.min(MAX_PULL, delta * 0.5)
      setPullY(damped)
    } else {
      // Scrolling up — cancel pull tracking
      startY.current = null
      setPullY(0)
    }
  }, [refreshing])

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false
    startY.current = null

    if (pullY >= THRESHOLD) {
      setPullY(THRESHOLD)
      setRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setRefreshing(false)
        setPullY(0)
      }
    } else {
      setPullY(0)
    }
  }, [pullY, onRefresh])

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    window.addEventListener('touchend', handleTouchEnd)
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const progress = Math.min(1, pullY / THRESHOLD)
  const indicatorOpacity = refreshing ? 1 : progress
  const spinnerRotation = refreshing ? undefined : `rotate(${progress * 270}deg)`

  return (
    <div className={className}>
      {/* Pull indicator — sits at the top, animates into view */}
      {(pullY > 0 || refreshing) && (
        <div
          className="flex items-center justify-center transition-all duration-200 pointer-events-none"
          style={{ height: refreshing ? 48 : pullY, opacity: indicatorOpacity }}
        >
          <div
            className="w-7 h-7 rounded-full border-2"
            style={{
              borderColor: 'rgba(200,255,0,0.3)',
              borderTopColor: progress >= 1 || refreshing ? '#C8FF00' : 'rgba(200,255,0,0.3)',
              transform: spinnerRotation,
              animation: refreshing ? 'spin 0.7s linear infinite' : undefined,
            }}
          />
        </div>
      )}

      {children}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
