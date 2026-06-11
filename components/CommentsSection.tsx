'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

interface Comment {
  id: string
  user_id: string
  content: string
  created_at: string
  display_name: string
  username: string | null
  avatar_emoji: string
  avatar_url: string | null
}

interface Props {
  eventId: string
  currentUserId?: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

export default function CommentsSection({ eventId, currentUserId }: Props) {
  const [authToken, setAuthToken] = useState<string | null>(null)

  // Get session token internally
  useEffect(() => {
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthToken(session?.access_token ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthToken(session?.access_token ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Only activate when scrolled into view
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Initial load
  useEffect(() => {
    if (!visible) return
    setLoading(true)
    fetch(`/api/events/${eventId}/comments`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setComments(d.comments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId, visible])

  // Real-time subscription — only when visible
  useEffect(() => {
    if (!visible) return
    const supabase = createClient()
    if (!supabase) return

    const channel = supabase
      .channel(`comments:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'event_comments',
          filter: `event_id=eq.${eventId}`,
        },
        payload => {
          const row = payload.new as {
            id: string; user_id: string; content: string; created_at: string
          }
          // Fetch the full comment with profile info
          fetch(`/api/events/${eventId}/comments`, { cache: 'no-store' })
            .then(r => r.json())
            .then(d => setComments(d.comments || []))
            .catch(() => {
              // Fallback: add with minimal info
              setComments(prev => {
                if (prev.some(c => c.id === row.id)) return prev
                return [...prev, {
                  id: row.id,
                  user_id: row.user_id,
                  content: row.content,
                  created_at: row.created_at,
                  display_name: 'Someone',
                  username: null,
                  avatar_emoji: '🎵',
                  avatar_url: null,
                }]
              })
            })
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'event_comments', filter: `event_id=eq.${eventId}` },
        payload => {
          setComments(prev => prev.filter(c => c.id !== (payload.old as { id: string }).id))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [eventId, visible])

  // Auto-scroll to bottom when new comments arrive
  const prevCount = useRef(0)
  useEffect(() => {
    if (comments.length > prevCount.current && prevCount.current > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevCount.current = comments.length
  }, [comments.length])

  const handlePost = useCallback(async () => {
    const content = draft.trim()
    if (!content || posting) return
    setPosting(true)
    setError(null)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post')

      // Optimistically add (real-time will also fire but we deduplicate)
      setComments(prev => {
        if (prev.some(c => c.id === data.comment.id)) return prev
        return [...prev, data.comment]
      })
      setDraft('')
      textareaRef.current?.focus()
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post')
    } finally {
      setPosting(false)
    }
  }, [draft, authToken, posting, eventId])

  const handleDelete = useCallback(async (commentId: string) => {
    setDeletingId(commentId)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`
      await fetch(`/api/events/${eventId}/comments`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
        body: JSON.stringify({ commentId }),
      })
      setComments(prev => prev.filter(c => c.id !== commentId))
    } finally {
      setDeletingId(null)
    }
  }, [authToken, eventId])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
  }

  return (
    <div ref={sectionRef} className="glass p-5 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black text-white text-base">
          💬 Discussion
          {comments.length > 0 && (
            <span className="ml-2 text-white/30 font-normal text-sm">{comments.length}</span>
          )}
        </h3>
        <span className="text-[10px] text-white/20 uppercase tracking-widest">Live</span>
      </div>

      {/* Comment list */}
      {loading ? (
        <div className="space-y-3 mb-4">
          {[1, 2].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-white/10 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-white/10 rounded w-24" />
                <div className="h-3 bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 mb-4">
          <p className="text-3xl mb-2">🎙️</p>
          <p className="text-white/40 text-sm">No comments yet. Start the conversation.</p>
        </div>
      ) : (
        <div className="space-y-4 mb-4 max-h-96 overflow-y-auto pr-1">
          {comments.map(c => (
            <div key={c.id} className="flex gap-3 group">
              {/* Avatar */}
              {c.avatar_url ? (
                <img
                  src={c.avatar_url}
                  alt={c.display_name}
                  className="w-8 h-8 rounded-full flex-shrink-0 object-cover border border-white/10"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  {c.avatar_emoji}
                </div>
              )}
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  {/* Username — clickable if they have one */}
                  {c.username ? (
                    <Link href={`/passport/${encodeURIComponent(c.username)}`}
                      className="text-white/90 text-xs font-bold truncate hover:text-[#C8FF00] transition-colors">
                      {c.display_name}
                    </Link>
                  ) : (
                    <span className="text-white/90 text-xs font-bold truncate">{c.display_name}</span>
                  )}
                  <span className="text-white/25 text-[10px] flex-shrink-0">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-white/70 text-sm leading-relaxed break-words">{c.content}</p>
              </div>
              {/* Delete (own comments) */}
              {c.user_id === currentUserId && (
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-white/20 hover:text-red-400 text-xs pt-0.5"
                  title="Delete"
                >
                  {deletingId === c.id ? '…' : '✕'}
                </button>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose */}
      {authToken ? (
        <div className="border-t border-white/8 pt-4">
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say something… (⌘↵ to post)"
              rows={2}
              maxLength={500}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-white/25 border border-white/10 focus:border-[#C8FF00]/40 outline-none resize-none transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            />
            <button
              onClick={handlePost}
              disabled={!draft.trim() || posting}
              className="px-4 py-2.5 rounded-xl text-sm font-bold self-end transition-all disabled:opacity-30 disabled:cursor-default hover:scale-105 active:scale-95"
              style={{ background: '#C8FF00', color: '#000' }}
            >
              {posting ? '…' : '↑'}
            </button>
          </div>
          {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
          {draft.length > 400 && (
            <p className="text-white/30 text-xs mt-1 text-right">{500 - draft.length} left</p>
          )}
        </div>
      ) : (
        <div className="border-t border-white/8 pt-4 text-center">
          <p className="text-white/40 text-sm mb-2">Sign in to join the discussion</p>
          <Link
            href="/login"
            className="inline-block px-5 py-2 rounded-xl text-sm font-bold border border-[#C8FF00]/30 text-[#C8FF00] hover:bg-[#C8FF00]/10 transition-colors"
          >
            Sign In →
          </Link>
        </div>
      )}
    </div>
  )
}
