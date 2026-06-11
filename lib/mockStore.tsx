'use client'

import React, { createContext, useContext, useEffect, useReducer, useRef } from 'react'
import { Event, mockEvents } from './mockData'
import { useAuth } from './auth'
import { createClient } from './supabase'

interface UserState {
  xp: number
  attendedEvents: string[]
  savedEvents: string[]
  savedEventObjects: Event[]
  checkedInEvents: string[]
  goingEvents: string[]
  goingEventObjects: Event[]
  badges: string[]
  pendingEvents: Event[]
}

type Action =
  | { type: 'CHECK_IN'; eventId: string; genres: string[]; venueName: string }
  | { type: 'SAVE_EVENT'; event: Event }
  | { type: 'TOGGLE_GOING'; event: Event }
  | { type: 'SUBMIT_EVENT'; event: Event }
  | { type: 'APPROVE_EVENT'; id: string }
  | { type: 'REJECT_EVENT'; id: string }
  | { type: 'LOAD_STATE'; state: UserState }
  | { type: 'HYDRATE_PROFILE'; savedEvents: string[]; goingEvents: string[]; attendedEvents: string[]; checkedInEvents: string[]; xp: number; badges: string[] }
  | { type: 'ADD_EVENT_OBJECTS'; savedObjects: Event[]; goingObjects: Event[] }

const initialState: UserState = {
  xp: 0,
  attendedEvents: [],
  savedEvents: [],
  savedEventObjects: [],
  checkedInEvents: [],
  goingEvents: [],
  goingEventObjects: [],
  badges: ['early-supporter'],
  pendingEvents: [],
}

function awardBadges(state: UserState, venueName?: string, genres?: string[]): string[] {
  const badges = new Set(state.badges)

  if (state.checkedInEvents.length >= 1) badges.add('first-checkin')
  if (state.attendedEvents.length >= 3) badges.add('scene-regular')
  if (state.savedEvents.length >= 5) badges.add('plugged-in')

  if (venueName && venueName.toLowerCase().includes('warehouse')) {
    badges.add('warehouse-survivor')
  }

  // Count house and bass check-ins
  const houseCount = state.checkedInEvents.filter(id => {
    const ev = mockEvents.find(e => e.id === id)
    return ev?.genre.some(g => g.toLowerCase() === 'house')
  }).length
  if (houseCount >= 2) badges.add('house-head')

  const bassCount = state.checkedInEvents.filter(id => {
    const ev = mockEvents.find(e => e.id === id)
    return ev?.genre.some(g => g.toLowerCase() === 'bass' || g.toLowerCase() === 'dubstep')
  }).length
  if (bassCount >= 2) badges.add('bass-addict')

  return Array.from(badges)
}

function reducer(state: UserState, action: Action): UserState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...initialState, ...action.state, goingEvents: action.state.goingEvents ?? [], goingEventObjects: action.state.goingEventObjects ?? [], savedEventObjects: action.state.savedEventObjects ?? [] }

    case 'CHECK_IN': {
      if (state.checkedInEvents.includes(action.eventId)) return state
      const newCheckedIn = [...state.checkedInEvents, action.eventId]
      const newAttended = [...state.attendedEvents, action.eventId]
      const newState = {
        ...state,
        xp: state.xp + 100,
        checkedInEvents: newCheckedIn,
        attendedEvents: newAttended,
      }
      newState.badges = awardBadges(newState, action.venueName, action.genres)
      return newState
    }

    case 'SAVE_EVENT': {
      if (state.savedEvents.includes(action.event.id)) {
        const newSaved = state.savedEvents.filter(id => id !== action.event.id)
        const newSavedObjects = (state.savedEventObjects ?? []).filter(e => e.id !== action.event.id)
        const newState = { ...state, savedEvents: newSaved, savedEventObjects: newSavedObjects }
        newState.badges = awardBadges(newState)
        return newState
      }
      const newSaved = [...state.savedEvents, action.event.id]
      const newSavedObjects = [...(state.savedEventObjects ?? []), action.event]
      const newState = {
        ...state,
        xp: state.xp + 10,
        savedEvents: newSaved,
        savedEventObjects: newSavedObjects,
      }
      newState.badges = awardBadges(newState)
      return newState
    }

    case 'TOGGLE_GOING': {
      const isGoing = state.goingEvents.includes(action.event.id)
      return {
        ...state,
        goingEvents: isGoing
          ? state.goingEvents.filter(id => id !== action.event.id)
          : [...state.goingEvents, action.event.id],
        goingEventObjects: isGoing
          ? state.goingEventObjects.filter(e => e.id !== action.event.id)
          : [...state.goingEventObjects, action.event],
      }
    }

    case 'SUBMIT_EVENT': {
      return {
        ...state,
        xp: state.xp + 50,
        pendingEvents: [...state.pendingEvents, action.event],
      }
    }

    case 'APPROVE_EVENT': {
      return {
        ...state,
        pendingEvents: state.pendingEvents.filter(e => e.id !== action.id),
      }
    }

    case 'REJECT_EVENT': {
      return {
        ...state,
        pendingEvents: state.pendingEvents.filter(e => e.id !== action.id),
      }
    }

    case 'ADD_EVENT_OBJECTS': {
      const existingSavedIds = new Set(state.savedEventObjects.map(e => e.id))
      const existingGoingIds = new Set(state.goingEventObjects.map(e => e.id))
      return {
        ...state,
        savedEventObjects: [
          ...state.savedEventObjects,
          ...action.savedObjects.filter(e => !existingSavedIds.has(e.id)),
        ],
        goingEventObjects: [
          ...state.goingEventObjects,
          ...action.goingObjects.filter(e => !existingGoingIds.has(e.id)),
        ],
      }
    }

    case 'HYDRATE_PROFILE': {
      // Replace with server data — server is the source of truth.
      // Merging caused removed items to reappear if hydration raced the debounce write.
      // Badges are still merged (additive-only) to avoid losing locally-earned ones.
      const mergedBadges = Array.from(new Set([...state.badges, ...action.badges]))
      return {
        ...state,
        xp: Math.max(state.xp, action.xp),
        savedEvents: action.savedEvents,
        goingEvents: action.goingEvents,
        attendedEvents: action.attendedEvents,
        checkedInEvents: action.checkedInEvents,
        badges: mergedBadges,
      }
    }

    default:
      return state
  }
}

export function getLevel(xp: number): { level: number; title: string; nextXP: number; prevXP: number } {
  if (xp >= 1000) return { level: 4, title: 'Electric State Native', nextXP: 1000, prevXP: 1000 }
  if (xp >= 600) return { level: 3, title: 'Underground Local', nextXP: 1000, prevXP: 600 }
  if (xp >= 250) return { level: 2, title: 'Scene Regular', nextXP: 600, prevXP: 250 }
  return { level: 1, title: 'Newcomer', nextXP: 250, prevXP: 0 }
}

interface UserContextType {
  state: UserState
  checkIn: (eventId: string, genres: string[], venueName: string) => void
  saveEvent: (event: Event) => void
  toggleGoing: (event: Event) => void
  submitEvent: (event: Event) => void
  approveEvent: (id: string) => void
  rejectEvent: (id: string) => void
}

const UserContext = createContext<UserContextType | null>(null)

const STORAGE_KEY = 'electric-state-passport'

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user, profile } = useAuth()
  const hydratedUserId = useRef<string | null>(null)

  // 1. Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as UserState
        if (!parsed.badges.includes('early-supporter')) {
          parsed.badges = ['early-supporter', ...parsed.badges]
        }
        dispatch({ type: 'LOAD_STATE', state: parsed })
      }
    } catch {
      // ignore
    }
  }, [])

  // 2. Hydrate from Supabase profile when user logs in (runs once per login)
  useEffect(() => {
    if (!profile || hydratedUserId.current === profile.id) return
    hydratedUserId.current = profile.id
    dispatch({
      type: 'HYDRATE_PROFILE',
      savedEvents: profile.saved_events ?? [],
      goingEvents: profile.going_events ?? [],
      attendedEvents: profile.attended_events ?? [],
      checkedInEvents: profile.checked_in_events ?? [],
      xp: profile.xp ?? 0,
      badges: profile.badges ?? [],
    })
  }, [profile])

  // Reset hydration marker on logout
  useEffect(() => {
    if (!user) hydratedUserId.current = null
  }, [user])

  // 3. Fetch full event objects for any IDs that don't have objects yet
  //    (happens after Supabase hydration restores IDs but not objects)
  const savedJoined = state.savedEvents.join(',')
  const goingJoined = state.goingEvents.join(',')
  useEffect(() => {
    const missingSaved = state.savedEvents.filter(
      id => !state.savedEventObjects.some(e => e.id === id)
    )
    const missingGoing = state.goingEvents.filter(
      id => !state.goingEventObjects.some(e => e.id === id)
    )
    const allMissing = Array.from(new Set([...missingSaved, ...missingGoing]))
    if (allMissing.length === 0) return

    Promise.all(
      allMissing.map(id =>
        fetch(`/api/events/${id}`)
          .then(r => r.ok ? r.json() : null)
          .then(d => d?.event ?? null)
          .catch(() => null)
      )
    ).then(results => {
      const valid = results.filter(Boolean) as Event[]
      if (valid.length === 0) return
      dispatch({
        type: 'ADD_EVENT_OBJECTS',
        savedObjects: valid.filter(e => missingSaved.includes(e.id)),
        goingObjects: valid.filter(e => missingGoing.includes(e.id)),
      })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedJoined, goingJoined])

  // 5. Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // ignore
    }
  }, [state])

  // 6. Debounce-sync to Supabase when key fields change
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    if (!supabase) return
    const timer = setTimeout(() => {
      supabase
        .from('profiles')
        .update({
          xp: state.xp,
          saved_events: state.savedEvents,
          going_events: state.goingEvents,
          attended_events: state.attendedEvents,
          checked_in_events: state.checkedInEvents,
          badges: state.badges,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .then(({ error }) => { if (error) console.error('State sync error:', error) })
    }, 0) // write immediately — debounce only XP/badges to avoid hammering Supabase
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.savedEvents, state.goingEvents, state.attendedEvents, state.checkedInEvents, state.xp, state.badges, user?.id])

  const checkIn = (eventId: string, genres: string[], venueName: string) => {
    dispatch({ type: 'CHECK_IN', eventId, genres, venueName })
  }

  // ── Persist/remove event reminder in Supabase ──────────────────────────────
  async function upsertReminder(event: Event, type: 'saved' | 'going') {
    if (!user || !event.date) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.from('event_reminders').upsert(
      {
        user_id:    user.id,
        event_id:   event.id,
        event_name: event.name,
        event_date: event.date.slice(0, 10),
        event_venue: event.venue ?? null,
        event_city:  event.city ?? null,
        type,
        reminder_7d_sent: false,
        reminder_1d_sent: false,
      },
      { onConflict: 'user_id,event_id,type' }
    )
  }

  async function deleteReminder(eventId: string, type: 'saved' | 'going') {
    if (!user) return
    const supabase = createClient()
    if (!supabase) return
    await supabase
      .from('event_reminders')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .eq('type', type)
  }

  const saveEvent = (event: Event) => {
    const isAlreadySaved = state.savedEvents.includes(event.id)
    dispatch({ type: 'SAVE_EVENT', event })
    if (isAlreadySaved) {
      deleteReminder(event.id, 'saved')
    } else {
      upsertReminder(event, 'saved')
    }
  }

  const toggleGoing = (event: Event) => {
    const isAlreadyGoing = state.goingEvents.includes(event.id)
    dispatch({ type: 'TOGGLE_GOING', event })
    if (isAlreadyGoing) {
      deleteReminder(event.id, 'going')
    } else {
      upsertReminder(event, 'going')
    }
  }

  const submitEvent = (event: Event) => {
    dispatch({ type: 'SUBMIT_EVENT', event })
  }

  const approveEvent = (id: string) => {
    dispatch({ type: 'APPROVE_EVENT', id })
  }

  const rejectEvent = (id: string) => {
    dispatch({ type: 'REJECT_EVENT', id })
  }

  return (
    <UserContext.Provider value={{ state, checkIn, saveEvent, toggleGoing, submitEvent, approveEvent, rejectEvent }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
