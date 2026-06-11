-- ============================================================
-- Replace single Coachella listing with Weekend 1 + Weekend 2
-- for 2027 dates.
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Remove the old combined Coachella listing
DELETE FROM public.festivals
WHERE name IN ('Coachella', 'Coachella 2026');

-- Insert Weekend 1
INSERT INTO public.festivals
  (id, name, city, venue, date_start, date_end, genre, lineup, ticket_link, description, status, source, slug, event_type, image_url)
VALUES
(gen_random_uuid(), 'Coachella Weekend 1', 'Indio', 'Empire Polo Club', '2027-04-09', '2027-04-11',
 ARRAY['Electronic','House','Pop','Hip-Hop','EDM','Multi-Genre'],
 ARRAY['Lineup TBA'],
 'https://www.coachella.com/',
 'Coachella Valley Music and Arts Festival — Weekend 1. Two weekends of world-class music, art, and culture in the desert outside Palm Springs.',
 'approved', 'community', 'coachella-weekend-1',
 'mainstream', 'https://media.coachella.com/content/seo_images/795/EBn21kXwRGMWDHIFsOpxoc2DgUFFdcZ0IknKjGSS.jpg'),

-- Insert Weekend 2
(gen_random_uuid(), 'Coachella Weekend 2', 'Indio', 'Empire Polo Club', '2027-04-16', '2027-04-18',
 ARRAY['Electronic','House','Pop','Hip-Hop','EDM','Multi-Genre'],
 ARRAY['Lineup TBA'],
 'https://www.coachella.com/',
 'Coachella Valley Music and Arts Festival — Weekend 2. Same lineup, same magic — a second chance to experience one of the world''s most iconic music and arts festivals.',
 'approved', 'community', 'coachella-weekend-2',
 'mainstream', 'https://media.coachella.com/content/seo_images/795/EBn21kXwRGMWDHIFsOpxoc2DgUFFdcZ0IknKjGSS.jpg')

ON CONFLICT DO NOTHING;
