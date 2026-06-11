'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient, SUPABASE_ENABLED, type Profile } from './supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  enabled: boolean
  isOrganizer: boolean
  signInWithEmail: (email: string) => Promise<{ error: string | null }>
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  resetPasswordForEmail: (email: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Pick<Profile, 'username' | 'display_name' | 'avatar_emoji' | 'bio'>>) => Promise<{ error: string | null }>
  syncState: (state: {
    xp: number
    attended_events: string[]
    saved_events: string[]
    checked_in_events: string[]
    badges: string[]
  }) => Promise<void>
  uploadAvatar: (file: File) => Promise<{ url: string | null; error: string | null }>
  deleteAccount: () => Promise<{ error: string | null }>
  followArtist: (artistName: string) => Promise<void>
  unfollowArtist: (artistName: string) => Promise<void>
  adjustFollowingCount: (delta: number) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(SUPABASE_ENABLED)
  const [isOrganizer, setIsOrganizer] = useState(false)

  async function loadProfile(supabase: NonNullable<ReturnType<typeof createClient>>, userId: string) {
    // Fetch profile + social counts + organizer status in parallel
    const [{ data }, followingResult, followersResult, organizerResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('organizer_profiles').select('id').eq('id', userId).maybeSingle(),
    ])
    if (data) setProfile({
      ...(data as Profile),
      _followingCount: followingResult.count ?? 0,
      _followerCount: followersResult.count ?? 0,
    } as Profile)
    // Only update isOrganizer if the query succeeded (no error)
    if (!organizerResult.error) setIsOrganizer(!!organizerResult.data)
  }

  useEffect(() => {
    if (!SUPABASE_ENABLED) return
    const supabase = createClient()!

    supabase.auth.getSession().then(async ({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null)
      if (session?.user) await loadProfile(supabase, session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
      if (session?.user && event === 'SIGNED_IN') {
        // Only reload profile on actual new sign-ins, not INITIAL_SESSION or TOKEN_REFRESHED
        // getSession() already handled the initial load with await
        loadProfile(supabase, session.user.id)
      } else if (!session?.user) {
        setProfile(null)
        setIsOrganizer(false)
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signInWithEmail = async (email: string) => {
    if (!SUPABASE_ENABLED) return { error: 'Auth not configured' }
    const supabase = createClient()!
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    return { error: error?.message ?? null }
  }

  const signInWithPassword = async (email: string, password: string) => {
    if (!SUPABASE_ENABLED) return { error: 'Auth not configured' }
    const supabase = createClient()!
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUpWithPassword = async (email: string, password: string) => {
    if (!SUPABASE_ENABLED) return { error: 'Auth not configured' }
    const supabase = createClient()!
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const resetPasswordForEmail = async (email: string) => {
    if (!SUPABASE_ENABLED) return { error: 'Auth not configured' }
    const supabase = createClient()!
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    if (!SUPABASE_ENABLED) return { error: 'Supabase not configured — check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel' }
    const supabase = createClient()!
    const redirectTo = `${window.location.origin}/auth/callback`
    console.log('[Google OAuth] redirectTo:', redirectTo)
    // Use skipBrowserRedirect so we can inspect the URL before navigating
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    })
    console.log('[Google OAuth] url:', data?.url)
    console.log('[Google OAuth] error:', error?.message)
    if (error) return { error: error.message }
    if (!data?.url) return { error: 'No OAuth URL returned — is Google enabled in Supabase Authentication → Providers?' }
    // Manually redirect
    window.location.href = data.url
    return { error: null }
  }

  const signOut = async () => {
    if (!SUPABASE_ENABLED) return
    const supabase = createClient()!
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsOrganizer(false)
  }

  const updateProfile = async (updates: Partial<Pick<Profile, 'username' | 'display_name' | 'avatar_emoji' | 'bio'>>) => {
    if (!SUPABASE_ENABLED || !user) return { error: SUPABASE_ENABLED ? 'Not logged in' : 'Auth not configured' }
    const supabase = createClient()!
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    if (!error) setProfile(prev => prev ? { ...prev, ...updates } : prev)
    return { error: error?.message ?? null }
  }

  const syncState = async (state: {
    xp: number
    attended_events: string[]
    saved_events: string[]
    checked_in_events: string[]
    badges: string[]
  }) => {
    if (!SUPABASE_ENABLED || !user) return
    const supabase = createClient()!
    await supabase
      .from('profiles')
      .update({ ...state, updated_at: new Date().toISOString() })
      .eq('id', user.id)
    setProfile(prev => prev ? { ...prev, ...state } : prev)
  }

  const deleteAccount = async () => {
    if (!SUPABASE_ENABLED || !user) return { error: 'Not logged in' }
    const supabase = createClient()!
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    if (!token) return { error: 'No active session' }
    const res = await fetch('/api/auth/delete-account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error || 'Failed to delete account' }
    // Sign out locally after successful deletion
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    return { error: null }
  }

  const uploadAvatar = async (file: File) => {
    if (!SUPABASE_ENABLED || !user) return { url: null, error: 'Not logged in' }
    const supabase = createClient()!
    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) return { url: null, error: uploadError.message }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const url = data.publicUrl
    await supabase.from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() }).eq('id', user.id)
    setProfile(prev => prev ? { ...prev, avatar_url: url } : prev)
    return { url, error: null }
  }

  const followArtist = async (artistName: string) => {
    if (!SUPABASE_ENABLED || !user) return
    const supabase = createClient()!
    const current = profile?.followed_artists ?? []
    if (current.includes(artistName)) return
    const updated = [...current, artistName]
    await supabase.from('profiles').update({ followed_artists: updated, updated_at: new Date().toISOString() }).eq('id', user.id)
    setProfile(prev => prev ? { ...prev, followed_artists: updated } : prev)

    // On first ever follow, prompt for push permission + location via iOS bridge
    if (current.length === 0) {
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
  }

  const unfollowArtist = async (artistName: string) => {
    if (!SUPABASE_ENABLED || !user) return
    const supabase = createClient()!
    const updated = (profile?.followed_artists ?? []).filter(a => a !== artistName)
    await supabase.from('profiles').update({ followed_artists: updated, updated_at: new Date().toISOString() }).eq('id', user.id)
    setProfile(prev => prev ? { ...prev, followed_artists: updated } : prev)
  }

  // Keep cached social counts in sync after follow/unfollow user actions
  const _adjustFollowingCount = (delta: number) => {
    setProfile(prev => prev ? { ...prev, _followingCount: Math.max(0, (prev._followingCount ?? 0) + delta) } : prev)
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading, enabled: SUPABASE_ENABLED, isOrganizer,
      signInWithEmail, signInWithPassword, signUpWithPassword, resetPasswordForEmail, signInWithGoogle, signOut,
      updateProfile, syncState, uploadAvatar, deleteAccount, followArtist, unfollowArtist, adjustFollowingCount: _adjustFollowingCount,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
