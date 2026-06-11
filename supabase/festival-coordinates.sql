-- ============================================================
-- Lat/Lng coordinates for all approved festivals
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── Southern California ──────────────────────────────────────

-- Glen Helen Amphitheater / San Bernardino (shared venue)
UPDATE public.festivals SET lat = 34.1682, lng = -117.4032
WHERE name IN (
  'Nocturnal Wonderland', 'Dreamstate SoCal', 'Escape Halloween',
  'Desert Hearts Festival', 'Same Same But Different',
  'Nocturnal Wonderland 2026', 'Dreamstate SoCal 2026', 'Escape Halloween 2026',
  'Desert Hearts Festival 2026', 'Same Same But Different 2026'
);

-- Hard Summer — Hollywood Park, Inglewood
UPDATE public.festivals SET lat = 33.9575, lng = -118.3386
WHERE name IN ('Hard Summer', 'Hard Summer 2026');

-- NOS Events Center, San Bernardino — Countdown NYE
UPDATE public.festivals SET lat = 34.0579, lng = -117.2883
WHERE name IN ('Countdown NYE', 'Countdown NYE 2026');

-- Irvine Lake (Silverado) — Dirtybird Campout
UPDATE public.festivals SET lat = 33.7284, lng = -117.6747
WHERE name IN ('Dirtybird Campout West Coast', 'Dirtybird Campout West Coast 2026');

-- Lake Perris — Desert Daze
UPDATE public.festivals SET lat = 33.8614, lng = -117.1770
WHERE name IN ('Desert Daze', 'Desert Daze 2026');

-- Lake San Antonio (Bradley) — Lightning in a Bottle
UPDATE public.festivals SET lat = 35.7982, lng = -120.8233
WHERE name IN ('Lightning in a Bottle', 'Lightning in a Bottle 2026');

-- Splash House — Renaissance Palm Springs
UPDATE public.festivals SET lat = 33.8284, lng = -116.5426
WHERE name IN ('Splash House Weekend 1', 'Splash House Weekend 2', 'Splash House June 2026', 'Splash House August 2026');

-- Coachella — Empire Polo Club, Indio
UPDATE public.festivals SET lat = 33.6805, lng = -116.2376
WHERE name IN ('Coachella', 'Coachella 2026', 'Coachella Weekend 1', 'Coachella Weekend 2');

-- Forbidden Kingdom / EDC Orlando — Tinker Field, Orlando FL
UPDATE public.festivals SET lat = 28.5383, lng = -81.3790
WHERE name IN ('Forbidden Kingdom', 'Forbidden Kingdom 2027', 'EDC Orlando', 'EDC Orlando 2026');

-- ── San Diego ────────────────────────────────────────────────

-- Waterfront Park, San Diego — CRSSD + Into the Horizon
UPDATE public.festivals SET lat = 32.7204, lng = -117.1692
WHERE name IN (
  'CRSSD Spring', 'CRSSD Fall',
  'CRSSD Festival Spring', 'CRSSD Festival Fall 2026',
  'Into the Horizon Festival'
);

-- ── Las Vegas ────────────────────────────────────────────────

-- Las Vegas Motor Speedway — EDC Las Vegas
UPDATE public.festivals SET lat = 36.2728, lng = -115.0117
WHERE name IN ('EDC Las Vegas', 'EDC Las Vegas 2026');

-- Downtown Las Vegas — Life is Beautiful
UPDATE public.festivals SET lat = 36.1699, lng = -115.1398
WHERE name IN ('Life is Beautiful', 'Life is Beautiful 2026');

-- ── Arizona ──────────────────────────────────────────────────

-- Arizona Financial Theatre, Phoenix — Decadence Arizona
UPDATE public.festivals SET lat = 33.4484, lng = -112.0740
WHERE name IN ('Decadence Arizona', 'Decadence Arizona 2026');

-- Rawhide Western Town, Chandler — Goldrush
UPDATE public.festivals SET lat = 33.2970, lng = -111.9226
WHERE name IN ('Goldrush: Midnight Riders 2026');

-- Gila River Resorts Wild Horse Pass — LALALAND Pool Party
UPDATE public.festivals SET lat = 33.2827, lng = -111.9358
WHERE name IN ('Green Velvet presents LALALAND | Oasis Pool Party');

-- ── Florida ──────────────────────────────────────────────────

-- Spirit of Suwannee Music Park, Live Oak — Hulaween
UPDATE public.festivals SET lat = 30.3444, lng = -82.9868
WHERE name IN ('Hulaween', 'Hulaween 2026');

-- ── Miami ────────────────────────────────────────────────────

-- Bayfront Park, Miami — Ultra
UPDATE public.festivals SET lat = 25.7717, lng = -80.1887
WHERE name IN ('Ultra Music Festival', 'Ultra Music Festival 2027');

-- Mana Wynwood, Miami — III Points
UPDATE public.festivals SET lat = 25.8006, lng = -80.2002
WHERE name IN ('III Points', 'III Points 2026');

-- ── Washington DC ────────────────────────────────────────────

-- RFK Festival Grounds — Project GLOW
UPDATE public.festivals SET lat = 38.8884, lng = -76.9718
WHERE name IN ('Project GLOW', 'Project GLOW 2026');

-- ── Chicago ──────────────────────────────────────────────────

-- Union Park, Chicago — ARC, Spring Awakening
UPDATE public.festivals SET lat = 41.8836, lng = -87.6566
WHERE name IN ('ARC Music Festival', 'ARC Music Festival 2026', 'Spring Awakening Music Festival', 'Spring Awakening Music Festival 2026');

-- Douglass Park, Chicago — North Coast
UPDATE public.festivals SET lat = 41.8673, lng = -87.7081
WHERE name IN ('North Coast Music Festival', 'North Coast Music Festival 2026');

-- ── Michigan ─────────────────────────────────────────────────

-- Double JJ Resort, Rothbury — Electric Forest
UPDATE public.festivals SET lat = 43.5219, lng = -86.3272
WHERE name IN ('Electric Forest', 'Electric Forest 2026');

-- Hart Plaza, Detroit — Movement
UPDATE public.festivals SET lat = 42.3314, lng = -83.0457
WHERE name IN ('Movement Electronic Music Festival', 'Movement Electronic Music Festival 2026');

-- ── Ohio ─────────────────────────────────────────────────────

-- Legend Valley, Thornville — Lost Lands
UPDATE public.festivals SET lat = 39.9128, lng = -82.4186
WHERE name IN ('Lost Lands Music Festival', 'Lost Lands Music Festival 2026');

-- ── Washington State ─────────────────────────────────────────

-- Gorge Amphitheatre, George WA — Bass Canyon, Paradiso
UPDATE public.festivals SET lat = 47.0977, lng = -119.9986
WHERE name IN ('Bass Canyon', 'Bass Canyon 2026', 'Paradiso Festival', 'Paradiso Festival 2026');

-- ── Colorado ─────────────────────────────────────────────────

-- Hummingbird Ranch, Rye CO — Sonic Bloom
UPDATE public.festivals SET lat = 37.9248, lng = -104.9378
WHERE name IN ('Sonic Bloom', 'Sonic Bloom 2026');

-- ── Arkansas ─────────────────────────────────────────────────

-- Mulberry Mountain — Wakaan
UPDATE public.festivals SET lat = 35.3814, lng = -93.8202
WHERE name IN ('Wakaan Music Festival', 'Wakaan Music Festival 2026');

-- ── California (NorCal) ──────────────────────────────────────

-- Shoreline Amphitheatre, Mountain View — Audiotistic
UPDATE public.festivals SET lat = 37.4261, lng = -122.0800
WHERE name IN ('Audiotistic Bay Area', 'Audiotistic Bay Area 2026');

-- Commons Beach, South Lake Tahoe — SnowGlobe
UPDATE public.festivals SET lat = 38.9368, lng = -119.9772
WHERE name IN ('SnowGlobe Music Festival', 'SnowGlobe Music Festival 2026');

-- ── Los Angeles ──────────────────────────────────────────────

-- Reframe Studios LA — Framework
UPDATE public.festivals SET lat = 34.0261, lng = -118.3966
WHERE name IN ('Framework: Reframe Outdoors');

-- ── Bahamas ──────────────────────────────────────────────────

-- Baha Mar Resort, Nassau — Holy Ship Wrecked
UPDATE public.festivals SET lat = 25.0820, lng = -77.3372
WHERE name IN ('Holy Ship Wrecked', 'Holy Ship Wrecked 2027');

-- ── Canada ───────────────────────────────────────────────────

-- Salmo River Ranch, BC — Shambhala
UPDATE public.festivals SET lat = 49.1847, lng = -117.2741
WHERE name IN ('Shambhala Music Festival', 'Shambhala Music Festival 2026');

-- ── Verify: count how many still have NULL coords ────────────
SELECT COUNT(*) as missing_coords, 'festivals without lat/lng' as label
FROM public.festivals
WHERE status = 'approved' AND (lat IS NULL OR lng IS NULL);
