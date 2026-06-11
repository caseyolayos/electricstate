'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'
import jsQR from 'jsqr'

type ScanResult = { status: 'valid'; ticketId: string; tierName: string; buyerName: string; eventName: string }
  | { status: 'already_used'; checkedInAt: string; tierName: string; eventName: string }
  | { status: 'invalid' }
  | { status: 'error'; message: string }

export default function ScannerPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)

  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualToken, setManualToken] = useState('')
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token ?? null)
    })
  }, [user])

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setScanning(true)
      scanLoop()
    } catch {
      setCameraError('Camera access denied. Use manual entry below.')
    }
  }

  function stopCamera() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  function scanLoop() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    if (code?.data) {
      stopCamera()
      checkIn(code.data)
    } else {
      rafRef.current = requestAnimationFrame(scanLoop)
    }
  }

  async function checkIn(token: string) {
    setCheckingIn(true)
    setResult(null)
    try {
      const res = await fetch('/api/organizer/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ qrToken: token }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ status: 'error', message: 'Network error' })
    }
    setCheckingIn(false)
  }

  useEffect(() => () => stopCamera(), [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
    </div>
  )

  const resultColor = result?.status === 'valid' ? '#C8FF00' : result?.status === 'already_used' ? '#FFD700' : '#ff4444'
  const resultEmoji = result?.status === 'valid' ? '✅' : result?.status === 'already_used' ? '⚠️' : '❌'
  const resultTitle = result?.status === 'valid' ? 'Valid ticket!' : result?.status === 'already_used' ? 'Already checked in' : result?.status === 'invalid' ? 'Invalid ticket' : 'Error'

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      <div className="mb-6">
        <button onClick={() => router.back()} className="text-white/40 text-sm hover:text-white/70 transition-colors mb-4">
          Back
        </button>
        <h1 className="text-2xl font-black text-white">Door Scanner</h1>
        <p className="text-white/40 mt-1 text-sm">Scan ticket QR codes to check in attendees.</p>
      </div>

      {/* Camera viewfinder */}
      <div className="relative rounded-2xl overflow-hidden mb-4"
        style={{ aspectRatio: '1', background: '#000', border: '1px solid rgba(255,255,255,0.1)' }}>
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg" style={{ borderColor: '#C8FF00' }} />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg" style={{ borderColor: '#C8FF00' }} />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg" style={{ borderColor: '#C8FF00' }} />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg" style={{ borderColor: '#C8FF00' }} />
              <div className="absolute inset-x-0 top-1/2 h-0.5 animate-pulse" style={{ background: '#C8FF00' }} />
            </div>
          </div>
        )}

        {!scanning && !result && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <span className="text-4xl">📷</span>
            <p className="text-white/40 text-sm">Camera off</p>
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="glass rounded-2xl p-5 mb-4" style={{ borderColor: `${resultColor}40`, borderWidth: 1 }}>
          <div className="text-center mb-3">
            <div className="text-4xl mb-2">{resultEmoji}</div>
            <h3 className="text-white font-black text-lg">{resultTitle}</h3>
          </div>
          {result.status === 'valid' && (
            <div className="text-center">
              <p className="text-white/70 text-sm">{result.tierName}</p>
              {result.buyerName && <p className="text-white/50 text-xs mt-1">{result.buyerName}</p>}
              <p className="text-white/30 text-xs mt-0.5">{result.eventName}</p>
            </div>
          )}
          {result.status === 'already_used' && (
            <div className="text-center">
              <p className="text-white/70 text-sm">{result.tierName}</p>
              <p className="text-yellow-400/70 text-xs mt-1">Checked in at {new Date(result.checkedInAt).toLocaleTimeString()}</p>
            </div>
          )}
          {result.status === 'invalid' && <p className="text-center text-red-400/70 text-sm">QR code not recognized</p>}
          {result.status === 'error' && <p className="text-center text-red-400/70 text-sm">{result.message}</p>}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col gap-3">
        {checkingIn ? (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className="w-5 h-5 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
            <span className="text-white/40 text-sm">Checking in…</span>
          </div>
        ) : scanning ? (
          <button onClick={stopCamera}
            className="w-full py-4 rounded-xl font-bold text-sm border border-white/20 text-white hover:bg-white/5 transition-all">
            Stop scanning
          </button>
        ) : (
          <button
            onClick={() => { setResult(null); startCamera() }}
            className="w-full py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90"
            style={{ background: '#C8FF00', color: '#000' }}>
            {result ? 'Scan next ticket' : 'Start scanning'}
          </button>
        )}

        {cameraError && <p className="text-red-400 text-xs text-center">{cameraError}</p>}

        {/* Manual entry fallback */}
        <div className="glass rounded-xl p-4">
          <p className="text-white/40 text-xs font-bold uppercase tracking-wider mb-2">Manual entry</p>
          <div className="flex gap-2">
            <input
              value={manualToken}
              onChange={e => setManualToken(e.target.value.trim())}
              placeholder="Paste ticket token"
              className="flex-1 px-3 py-2 rounded-lg text-sm text-white placeholder-white/30 border border-white/10 outline-none focus:border-[#C8FF00]/50"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
            <button
              onClick={() => { if (manualToken) { checkIn(manualToken); setManualToken('') } }}
              disabled={!manualToken || checkingIn}
              className="px-4 py-2 rounded-lg font-bold text-sm disabled:opacity-40"
              style={{ background: '#C8FF00', color: '#000' }}>
              Check
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
