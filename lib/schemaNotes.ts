// Supabase Database Schema Notes
// These interfaces document the intended production database structure.
// Current implementation uses mock data; swap these in when connecting Supabase.

/*
Table: events
- id: uuid (primary key, default gen_random_uuid())
- name: text (not null)
- venue: text (not null)
- city: text (not null)
- date: date (not null)
- time: text
- genre: text[] (postgres array)
- ticket_link: text
- source: text (check: 'AI Found' | 'Community Submitted' | 'Verified')
- description: text
- lineup: text[]
- gradient: text
- status: text (check: 'approved' | 'pending' | 'rejected', default 'pending')
- created_at: timestamptz (default now())
- updated_at: timestamptz (default now())
- submitted_by: uuid (foreign key -> profiles.id, nullable)

Table: profiles
- id: uuid (primary key, references auth.users)
- username: text (unique)
- xp: integer (default 0)
- level: integer (default 1, computed or stored)
- attended_events: text[] (event ids)
- saved_events: text[] (event ids)
- checked_in_events: text[] (event ids)
- badges: text[] (badge ids)
- created_at: timestamptz (default now())
- updated_at: timestamptz (default now())

Table: checkins
- id: uuid (primary key)
- user_id: uuid (references profiles.id)
- event_id: uuid (references events.id)
- checked_in_at: timestamptz (default now())
- xp_awarded: integer (default 100)
unique constraint: (user_id, event_id)

Table: badges
- id: text (primary key, e.g. 'early-supporter')
- emoji: text
- name: text
- description: text
- awarded_count: integer (for leaderboard/rarity)

Table: user_badges
- user_id: uuid (references profiles.id)
- badge_id: text (references badges.id)
- awarded_at: timestamptz (default now())
primary key: (user_id, badge_id)

RLS Policies:
- events: SELECT public, INSERT authenticated, UPDATE/DELETE own submissions or admin
- profiles: SELECT public, UPDATE own row
- checkins: INSERT own row, SELECT own rows
- user_badges: SELECT public, INSERT via server function only
*/

export {}
