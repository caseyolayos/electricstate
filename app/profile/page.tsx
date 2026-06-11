'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useUser } from '@/lib/mockStore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, profile, loading, updateProfile, signOut, uploadAvatar, deleteAccount } = useAuth()
  const { state } = useUser()
  const router = useRouter()

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  // Only initialize form values once when profile first loads — not on every profile re-render.
  // Without this guard, every auth state update resets whatever the user typed.
  const profileInitialized = useRef(false)
  useEffect(() => {
    if (profile && !profileInitialized.current) {
      profileInitialized.current = true
      setDisplayName(profile.display_name ?? '')
      setUsername(profile.username ?? '')
      setBio(profile.bio ?? '')
    }
  }, [profile])

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setUploadStatus('idle')
    setUploadError(null)
    // Auto-upload immediately on selection
    setUploading(true)
    const { error } = await uploadAvatar(file)
    setUploading(false)
    if (error) {
      setUploadStatus('error')
      setUploadError(error)
    } else {
      setUploadStatus('success')
      setAvatarFile(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await updateProfile({
      display_name: displayName.trim() || null,
      username: username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
      bio: bio.trim() || null,
    })
    setSaving(false)
    if (error) {
      setError(error.includes('unique') ? 'That username is taken.' : error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    )
  }

  const avatarSrc = avatarPreview ?? profile?.avatar_url ?? null

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Profile</h1>
          <p className="text-white/40 mt-1 text-sm">{user.email}</p>
        </div>
        <Link href="/passport" className="text-[#C8FF00] text-sm hover:underline">← Passport</Link>
      </div>

      {/* Photo upload */}
      <div className="glass p-5 mb-4">
        <p className="text-white/60 text-xs font-medium mb-4 uppercase tracking-widest">Profile Photo</p>
        <div className="flex items-center gap-5">
          {/* Avatar circle */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 group border border-white/10"
            style={{ background: 'rgba(200,255,0,0.06)' }}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-9 h-9 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </div>
            )}
            {/* Camera hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </button>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm font-bold px-4 py-2 rounded-xl border border-white/15 text-white hover:bg-white/5 transition-colors text-left"
            >
              {avatarSrc && !avatarFile ? 'Change Photo' : 'Choose Photo'}
            </button>
            <p className="text-white/30 text-xs">JPG, PNG or GIF · Max 5MB</p>
            {uploading && <p className="text-white/50 text-xs">Uploading…</p>}
            {!uploading && uploadStatus === 'success' && <p className="text-[#C8FF00] text-xs font-medium">✓ Photo updated!</p>}
            {!uploading && uploadStatus === 'error' && <p className="text-red-400/80 text-xs">{uploadError}</p>}
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="glass p-5 flex flex-col gap-4 mb-4">
        <div>
          <p className="text-white/30 text-xs mb-4">
            {state.xp.toLocaleString()} XP · {state.badges.length} stamps
          </p>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-widest">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-widest">Username</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="handle"
              maxLength={30}
              className="w-full pl-8 pr-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
          </div>
          <p className="text-white/25 text-xs mt-1">Letters, numbers, underscores only</p>
        </div>

        <div>
          <label className="block text-xs text-white/50 mb-1.5 font-medium uppercase tracking-widest">Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="What's your scene? Favorite venue? Guilty pleasure genre?"
            maxLength={160}
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors resize-none"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
          <p className="text-white/25 text-xs mt-1 text-right">{bio.length}/160</p>
        </div>

        {error && <p className="text-red-400/80 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 hover:shadow-[0_0_20px_rgba(200,255,0,0.3)]"
          style={{ background: '#C8FF00', color: '#000' }}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Profile'}
        </button>
      </form>

      {/* Account actions */}
      <div className="glass p-4 border border-red-500/10">
        <p className="text-white/40 text-xs font-medium uppercase tracking-widest mb-3">Account</p>
        <div className="flex flex-col gap-3">
          {/* Push notification opt-in */}
          <button
            onClick={() => {
              try {
                // PWABuilder iOS WebKit bridge
                const wk = (window as any).webkit?.messageHandlers
                if (wk?.['push-permission-request']) {
                  // Listen for result
                  window.addEventListener('push-permission-request', (e: Event) => {
                    const granted = (e as CustomEvent).detail === 'granted'
                    if (granted && wk['push-token']) {
                      // Request FCM token so we can save it
                      wk['push-token'].postMessage({})
                    }
                  }, { once: true })
                  wk['push-permission-request'].postMessage({})
                } else {
                  // Fallback for web browsers
                  Notification.requestPermission()
                }
              } catch {}
            }}
            className="text-[#C8FF00]/70 text-sm hover:text-[#C8FF00] transition-colors font-medium text-left flex items-center gap-2"
          >
            🔔 Enable push notifications
          </button>

          <button
            onClick={handleSignOut}
            className="text-red-400/70 text-sm hover:text-red-400 transition-colors font-medium text-left"
          >
            Sign out
          </button>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-500/50 text-sm hover:text-red-500 transition-colors font-medium text-left"
            >
              Delete Account
            </button>
          ) : (
            <div className="mt-1 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
              <p className="text-white text-sm font-bold mb-1">Delete your account?</p>
              <p className="text-white/50 text-xs mb-4 leading-relaxed">
                This permanently deletes your profile, XP, stamps, and all saved events. This cannot be undone.
              </p>
              {deleteError && (
                <p className="text-red-400 text-xs mb-3">{deleteError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setDeleting(true)
                    setDeleteError(null)
                    const { error } = await deleteAccount()
                    if (error) {
                      setDeleteError(error)
                      setDeleting(false)
                    } else {
                      router.push('/')
                    }
                  }}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Yes, Delete My Account'}
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/15 text-white/60 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
