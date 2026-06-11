-- ============================================================
-- Electric State — Missing Festivals Migration
-- Run in: Supabase Dashboard → SQL Editor → New Query
--
-- Adds all Tier 1–4 festivals from the master list that were
-- not yet in the database. Safe to re-run (ON CONFLICT DO NOTHING).
--
-- Dates marked ⚠️ are best estimates — verify before publishing.
-- ============================================================

INSERT INTO public.festivals
  (id, name, city, venue, date_start, date_end, genre, lineup, ticket_link, description, status, source, slug, event_type, image_url)
VALUES

-- ============================================================
-- TIER 1 — CORE "MUST HAVE"
-- ============================================================

-- --------------------------------------------------------
-- COACHELLA (past event, essential for passport/check-ins)
-- --------------------------------------------------------
(gen_random_uuid(), 'Coachella', 'Indio', 'Empire Polo Club', '2026-04-11', '2026-04-19',
 ARRAY['Electronic','House','Pop','Hip-Hop','EDM','Multi-Genre'],
 ARRAY['Lineup TBA'],
 'https://www.coachella.com/',
 'Coachella Valley Music and Arts Festival — one of the largest and most iconic music festivals in the world. Two weekends of world-class music, larger-than-life art installations, and desert culture in Indio, CA.',
 'approved', 'community', 'coachella',
 'mainstream', 'https://media.coachella.com/content/seo_images/795/EBn21kXwRGMWDHIFsOpxoc2DgUFFdcZ0IknKjGSS.jpg'),

-- ============================================================
-- TIER 2 — MAJOR EDM CULTURE FESTIVALS
-- ============================================================

-- --------------------------------------------------------
-- ARC MUSIC FESTIVAL
-- Confirmed: Sept 4–7, 2026 | Union Park, Chicago
-- --------------------------------------------------------
(gen_random_uuid(), 'ARC Music Festival', 'Chicago', 'Union Park', '2026-09-04', '2026-09-07',
 ARRAY['House','Techno','Electronic'],
 ARRAY['Lineup TBA'],
 'https://arcmusicfestival.com/',
 'ARC Music Festival is a four-day celebration of house and techno at Chicago''s Union Park. One of the fastest-growing and most credible festivals in underground dance music, ARC draws top-tier international DJs in the birthplace of house music.',
 'approved', 'community', 'arc-music-festival',
 'mainstream', 'https://arcmusicfestival.com/wp-content/uploads/2024/03/ARClogo2024_BLK.svg'),

-- ============================================================
-- TIER 3 — IMPORTANT REGIONAL & GENRE FESTIVALS
-- ============================================================

-- --------------------------------------------------------
-- EDC ORLANDO
-- ⚠️ Date estimated based on 2025 pattern (Nov 7–8). Verify.
-- --------------------------------------------------------
(gen_random_uuid(), 'EDC Orlando', 'Orlando', 'Tinker Field', '2026-11-06', '2026-11-08',
 ARRAY['EDM','House','Techno','Trance','Bass','Electronic'],
 ARRAY['Lineup TBA'],
 'https://orlando.electricdaisycarnival.com/',
 'Electric Daisy Carnival Orlando brings the magic of EDC to Florida. Three nights of electronic music under the electric sky featuring multiple stages of world-class EDM acts.',
 'approved', 'community', 'edc-orlando',
 'mainstream', NULL),

-- --------------------------------------------------------
-- COUNTDOWN NYE
-- Confirmed: Dec 31, 2026 – Jan 1, 2027 | NOS Events Center, San Bernardino
-- --------------------------------------------------------
(gen_random_uuid(), 'Countdown NYE', 'San Bernardino', 'NOS Events Center', '2026-12-31', '2027-01-01',
 ARRAY['EDM','House','Techno','Bass','Electronic'],
 ARRAY['Lineup TBA'],
 'https://countdownnye.com/',
 'Countdown NYE is Insomniac''s flagship New Year''s Eve festival — five stages of electronic music, a midnight champagne toast, and an unforgettable sendoff to the year at NOS Events Center.',
 'approved', 'community', 'countdown-nye',
 'mainstream', 'https://d3vhc53cl8e8km.cloudfront.net/hello-staging/wp-content/uploads/sites/59/2026/04/27112827/csc_2026_mk_ps_fs_seo_1200x630_r01.jpg'),

-- --------------------------------------------------------
-- AUDIOTISTIC BAY AREA
-- ⚠️ Date estimated based on 2025 pattern. Verify when announced.
-- --------------------------------------------------------
(gen_random_uuid(), 'Audiotistic Bay Area', 'Mountain View', 'Shoreline Amphitheatre', '2026-07-11', '2026-07-12',
 ARRAY['Electronic','House','Techno','Bass','EDM'],
 ARRAY['Lineup TBA'],
 'https://audiotistic.com/',
 'Insomniac''s Audiotistic brings two days of diverse electronic music to the Bay Area — spanning house, techno, bass, and everything in between at one of the best outdoor amphitheater settings in California.',
 'approved', 'community', 'audiotistic-bay-area',
 'mainstream', NULL),

-- --------------------------------------------------------
-- NORTH COAST MUSIC FESTIVAL
-- ⚠️ Date estimated (Labor Day weekend). Verify when announced.
-- --------------------------------------------------------
(gen_random_uuid(), 'North Coast Music Festival', 'Chicago', 'Douglass Park', '2026-08-28', '2026-08-30',
 ARRAY['Electronic','House','Techno','Bass','EDM','Funk'],
 ARRAY['Lineup TBA'],
 'https://northcoastfestival.com/',
 'North Coast Music Festival is Chicago''s beloved Labor Day weekend electronic music festival. Three days of diverse electronic music, local food, and community art in the city.',
 'approved', 'community', 'north-coast-music-festival',
 'mainstream', 'https://northcoastfestival.com/wp-content/uploads/2025/12/Share.jpg'),

-- --------------------------------------------------------
-- WAKAAN MUSIC FESTIVAL
-- Confirmed: Oct 1–3, 2026 | Mulberry Mountain, AR
-- --------------------------------------------------------
(gen_random_uuid(), 'Wakaan Music Festival', 'Mulberry', 'Mulberry Mountain', '2026-10-01', '2026-10-03',
 ARRAY['Bass','Psychedelic','Electronic','Experimental'],
 ARRAY['Liquid Stranger','Lineup TBA'],
 'https://wakaanfestival.com/',
 'Wakaan Music Festival is a three-day camping bass and psychedelic music experience curated by Liquid Stranger on the hills of Mulberry Mountain in Arkansas. Known for its deeply immersive atmosphere and devoted community of bass heads.',
 'approved', 'community', 'wakaan-music-festival',
 'underground', 'https://wakaanfestival.com/wp-content/uploads/2026/04/Share-1024x576.jpg'),

-- --------------------------------------------------------
-- III POINTS
-- Confirmed: Oct 16–17, 2026 | Mana Wynwood, Miami
-- --------------------------------------------------------
(gen_random_uuid(), 'III Points', 'Miami', 'Mana Wynwood', '2026-10-16', '2026-10-17',
 ARRAY['Electronic','House','Techno','Hip-Hop','Bass'],
 ARRAY['Lineup TBA'],
 'https://www.iiipoints.com/',
 'III Points is a two-day music and technology festival spanning 5 city blocks at Mana Wynwood in Miami. Blending underground electronic music with cutting-edge art, culture, and nightlife, III Points is one of the most forward-thinking festivals in the country.',
 'approved', 'community', 'iii-points',
 'mainstream', 'https://d3vhc53cl8e8km.cloudfront.net/hello-staging/wp-content/uploads/sites/72/2026/04/22123729/iiipoints_2026_mk_lu_phase1_fs_seo_1200x630_r01.jpg'),

-- --------------------------------------------------------
-- DECADENCE ARIZONA
-- Confirmed: Dec 30–31, 2026 | Phoenix, AZ
-- --------------------------------------------------------
(gen_random_uuid(), 'Decadence Arizona', 'Phoenix', 'Arizona Financial Theatre', '2026-12-30', '2026-12-31',
 ARRAY['Electronic','House','EDM','Bass','Techno'],
 ARRAY['Lineup TBA'],
 'https://decadencearizona.com/',
 'Decadence Arizona is Relentless Beats'' New Year''s Eve festival — two massive nights of electronic music in Phoenix to ring in the new year.',
 'approved', 'community', 'decadence-arizona',
 'mainstream', 'https://decadencearizona.com/wp-content/uploads/2026/03/261230-31-Decadence-FB-Event_Presale.jpg'),

-- --------------------------------------------------------
-- PROJECT GLOW
-- Confirmed: May 30–31, 2026 | RFK Festival Grounds, Washington D.C.
-- --------------------------------------------------------
(gen_random_uuid(), 'Project GLOW', 'Washington', 'RFK Festival Grounds', '2026-05-30', '2026-05-31',
 ARRAY['Electronic','House','Techno','EDM','Bass'],
 ARRAY['Lineup TBA'],
 'https://projectglowfest.com/',
 'Project GLOW is Washington D.C.''s premier electronic music festival, celebrating 20+ years of dance music, art, and culture at RFK Festival Grounds.',
 'approved', 'community', 'project-glow',
 'mainstream', 'https://d3vhc53cl8e8km.cloudfront.net/hello-staging/wp-content/uploads/sites/109/2026/01/06111047/pgdc_2026_mk_an_fest_site_seo_1200x630_r02.jpg'),

-- --------------------------------------------------------
-- FORBIDDEN KINGDOM
-- Confirmed: April 23–25, 2027 | Orlando, FL
-- --------------------------------------------------------
(gen_random_uuid(), 'Forbidden Kingdom', 'Orlando', 'Tinker Field', '2027-04-23', '2027-04-25',
 ARRAY['Bass','Dubstep','Electronic','EDM'],
 ARRAY['Lineup TBA'],
 'https://www.forbiddenkingdomfestival.com/',
 'Forbidden Kingdom is a three-day bass music festival in Orlando, FL. Featuring 5 stages of fire, fury, and bass across an immersive fantasy kingdom setting produced by Bassrush.',
 'approved', 'community', 'forbidden-kingdom',
 'mainstream', 'https://d3vhc53cl8e8km.cloudfront.net/hello-staging/wp-content/uploads/sites/84/2026/04/29183010/fk_2027_mk_ps_fest_site_seo_1200x630_r02.jpg'),

-- ============================================================
-- TIER 4 — UNDERGROUND / COMMUNITY BUILDERS
-- ============================================================

-- --------------------------------------------------------
-- SAME SAME BUT DIFFERENT
-- ⚠️ Date estimated based on 2025 pattern (early Oct). Verify.
-- --------------------------------------------------------
(gen_random_uuid(), 'Same Same But Different', 'Victorville', 'Glen Helen Regional Park', '2026-10-09', '2026-10-11',
 ARRAY['Electronic','House','Techno','Bass','Experimental'],
 ARRAY['Lineup TBA'],
 'https://www.samesamebutdifferentfest.com/',
 'Same Same But Different is a three-day camping music festival in the Southern California desert. A community-first festival known for diverse underground music, art installations, and an inclusive, tight-knit culture.',
 'approved', 'community', 'same-same-but-different',
 'underground', NULL),

-- --------------------------------------------------------
-- HULAWEEN
-- Confirmed: Oct 22–25, 2026 | Spirit of Suwannee Music Park, Live Oak, FL
-- --------------------------------------------------------
(gen_random_uuid(), 'Hulaween', 'Live Oak', 'Spirit of Suwannee Music Park', '2026-10-22', '2026-10-25',
 ARRAY['Electronic','Jam','Bass','Psychedelic','House'],
 ARRAY['Lineup TBA'],
 'https://hulaween.com/',
 'Hulaween is a four-day Halloween-weekend camping festival at the Spirit of Suwannee Music Park in Florida. Beloved for blending jam, bass, and electronic music with deep community roots and an otherworldly atmosphere.',
 'approved', 'community', 'hulaween',
 'underground', 'https://hulaween.com/wp-content/uploads/2026/03/HL26_SocialShare_1200x675.png'),

-- --------------------------------------------------------
-- SHAMBHALA MUSIC FESTIVAL (Canadian, but deeply loved by US ravers)
-- Confirmed: July 24–27, 2026 | Salmo River Ranch, BC, Canada
-- --------------------------------------------------------
(gen_random_uuid(), 'Shambhala Music Festival', 'Salmo', 'Salmo River Ranch', '2026-07-24', '2026-07-27',
 ARRAY['Electronic','Bass','Psytrance','House','Techno','Experimental'],
 ARRAY['A-Trak','Excision','Boris Brejcha','Clozee','Chromeo','Lineup TBA'],
 'https://www.shambhalamusicfestival.com/',
 'Shambhala Music Festival is a legendary four-day Canadian electronic music festival on the Salmo River Ranch in British Columbia. Famous for its six uniquely themed stages, world-class sound systems, and deeply community-driven culture — one of the most respected underground festivals in North America.',
 'approved', 'community', 'shambhala-music-festival',
 'underground', NULL)

ON CONFLICT DO NOTHING;

-- ============================================================
-- Approve all newly inserted community festivals
-- ============================================================
UPDATE public.festivals
SET status = 'approved'
WHERE source = 'community'
  AND status = 'pending'
  AND name IN (
    'Coachella',
    'ARC Music Festival',
    'EDC Orlando',
    'Countdown NYE',
    'Audiotistic Bay Area',
    'North Coast Music Festival',
    'Wakaan Music Festival',
    'III Points',
    'Decadence Arizona',
    'Project GLOW',
    'Forbidden Kingdom',
    'Same Same But Different',
    'Hulaween',
    'Shambhala Music Festival'
  );
