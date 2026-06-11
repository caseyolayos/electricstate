-- ============================================================
-- Fix CRSSD + Splash House listings
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Remove old entries ───────────────────────────────────────
DELETE FROM public.festivals
WHERE name IN (
  'CRSSD Festival Fall 2026',
  'Splash House June 2026',
  'Splash House August 2026'
);

-- ── Insert corrected entries ─────────────────────────────────
INSERT INTO public.festivals
  (id, name, city, venue, date_start, date_end, genre, lineup, ticket_link, description, status, source, slug, event_type, image_url)
VALUES

-- CRSSD Spring (past event, March 14–15 2026)
(gen_random_uuid(), 'CRSSD Spring', 'San Diego', 'Waterfront Park', '2026-03-14', '2026-03-15',
 ARRAY['House','Techno','Electronic'],
 ARRAY['Lineup TBA'],
 'https://crssdfest.com/',
 'CRSSD Festival Spring brings world-class house and techno to San Diego''s Waterfront Park for an outdoor daytime festival experience on the waterfront.',
 'approved', 'community', 'crssd-festival-spring',
 'mainstream', NULL),

-- CRSSD Fall (September 2026, dates TBA)
(gen_random_uuid(), 'CRSSD Fall', 'San Diego', 'Waterfront Park', '2026-09-26', '2026-09-27',
 ARRAY['House','Techno','Electronic'],
 ARRAY['Lineup TBA'],
 'https://crssdfest.com/',
 'CRSSD Festival Fall returns to San Diego''s Waterfront Park for another weekend of world-class house and techno. Exact dates TBA.',
 'approved', 'community', 'crssd-festival-fall',
 'mainstream', NULL),

-- Splash House Weekend 1 (August 7–9 2026)
(gen_random_uuid(), 'Splash House Weekend 1', 'Palm Springs', 'Renaissance Palm Springs Hotel', '2026-08-07', '2026-08-09',
 ARRAY['House','Electronic','Dance'],
 ARRAY['Lineup TBA'],
 'https://splashhouse.com/',
 'Splash House Weekend 1 — three hotels, one music festival. House music, pools, and desert heat in Palm Springs.',
 'approved', 'community', 'splash-house-weekend-1',
 'mainstream', NULL),

-- Splash House Weekend 2 (August 14–16 2026)
(gen_random_uuid(), 'Splash House Weekend 2', 'Palm Springs', 'Renaissance Palm Springs Hotel', '2026-08-14', '2026-08-16',
 ARRAY['House','Electronic','Dance'],
 ARRAY['Lineup TBA'],
 'https://splashhouse.com/',
 'Splash House Weekend 2 — the second weekend of Palm Springs'' beloved pool festival. Three hotels, house music, and desert vibes.',
 'approved', 'community', 'splash-house-weekend-2',
 'mainstream', NULL)

ON CONFLICT DO NOTHING;
