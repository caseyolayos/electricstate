-- ============================================================
-- Electric State — Festival Seed Data
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- Skips any festival where name + date_start already exists.
-- ============================================================

INSERT INTO public.festivals
  (id, name, city, venue, date_start, date_end, genre, lineup, ticket_link, description, status, source, slug, event_type, image_url)
VALUES

-- --------------------------------------------------------
-- COACHELLA
-- --------------------------------------------------------
(gen_random_uuid(), 'Coachella 2026', 'Indio', 'Empire Polo Club', '2026-04-11', '2026-04-19',
 ARRAY['Electronic','House','Pop','Hip-Hop','EDM','Multi-Genre'],
 ARRAY['Lineup TBA'],
 'https://www.coachella.com/',
 'Coachella Valley Music and Arts Festival — one of the largest and most iconic music festivals in the world. Two weekends of world-class music, larger-than-life art installations, and desert culture in Indio, CA.',
 'approved', 'community', 'coachella-2026',
 'mainstream', NULL),

-- --------------------------------------------------------
-- ULTRA MUSIC FESTIVAL
-- --------------------------------------------------------
(gen_random_uuid(), 'Ultra Music Festival 2027', 'Miami', 'Bayfront Park', '2027-03-26', '2027-03-28',
 ARRAY['Electronic','House','Techno','Trance','EDM'],
 ARRAY['Lineup TBA'],
 'https://ultramusicfestival.com/tickets/',
 'Ultra Music Festival returns to Bayfront Park in Downtown Miami for its 27th edition. Three days of world-class electronic music across multiple stages featuring the biggest names in dance music.',
 'approved', 'community', 'ultra-music-festival',
 'mainstream', 'https://ultramusicfestival.com/wp-content/uploads/2015/07/ultra-music-festival.png'),

-- --------------------------------------------------------
-- RELENTLESS BEATS FESTIVALS
-- --------------------------------------------------------
(gen_random_uuid(), 'Goldrush: Midnight Riders 2026', 'Chandler', 'Rawhide Western Town', '2026-09-11', '2026-09-12',
 ARRAY['Electronic','House','EDM','Bass'],
 ARRAY['Lineup TBA'],
 'https://relentlessbeats.com/events/goldrush-midnight-riders-2026-rawhide-western-town-091126/',
 'Relentless Beats presents Goldrush: Midnight Riders 2026 at Rawhide Western Town in Chandler, AZ. Two nights of electronic music in the desert. 18+.',
 'approved', 'community', 'goldrush-midnight-riders',
 'mainstream', 'https://cdn.relentlessbeats.com/wp-content/themes/RelentlessBeatsv308/img/rb.png'),

(gen_random_uuid(), 'Green Velvet presents LALALAND | Oasis Pool Party', 'Chandler', 'Gila River Resorts & Casinos — Wild Horse Pass', '2026-05-30', NULL,
 ARRAY['House','Electronic','Dance'],
 ARRAY['Green Velvet'],
 'https://relentlessbeats.com/events/green-velvet-presents-lalaland-oasis-pool-party-gila-river-resorts-casinos-wild-horse-pass-053026/',
 'Relentless Beats presents Green Velvet for an Oasis Pool Party at Gila River Resorts & Casinos — Wild Horse Pass. 21+.',
 'approved', 'community', 'lalaland-oasis-pool-party',
 'mainstream', 'https://cdn.relentlessbeats.com/wp-content/themes/RelentlessBeatsv308/img/rb.png'),

-- --------------------------------------------------------
-- INSOMNIAC / EDC
-- --------------------------------------------------------
(gen_random_uuid(), 'EDC Las Vegas 2026', 'Las Vegas', 'Las Vegas Motor Speedway', '2026-05-15', '2026-05-17',
 ARRAY['EDM','House','Techno','Trance','Bass','Electronic'],
 ARRAY['Lineup TBA'],
 'https://lasvegas.electricdaisycarnival.com/',
 'Electric Daisy Carnival Las Vegas — the world''s largest electronic music festival. Three nights under the electric sky at Las Vegas Motor Speedway.',
 'approved', 'community', 'edc-las-vegas',
 'mainstream', NULL),

(gen_random_uuid(), 'Beyond Wonderland SoCal 2026', 'San Bernardino', 'Glen Helen Amphitheater', '2026-03-20', '2026-03-21',
 ARRAY['House','Techno','Electronic','EDM'],
 ARRAY['Lineup TBA'],
 'https://beyondwonderland.com/',
 'Insomniac''s Beyond Wonderland brings a fantastical world of electronic music to Glen Helen Amphitheater in San Bernardino, CA.',
 'approved', 'community', 'beyond-wonderland-socal',
 'mainstream', NULL),

(gen_random_uuid(), 'Nocturnal Wonderland 2026', 'San Bernardino', 'Glen Helen Amphitheater', '2026-09-04', '2026-09-05',
 ARRAY['Electronic','Techno','House','Bass','EDM'],
 ARRAY['Lineup TBA'],
 'https://nocturnalwonderland.com/',
 'Nocturnal Wonderland is America''s longest-running electronic music festival. Two nights of underground and mainstage electronic music at Glen Helen Amphitheater.',
 'approved', 'community', 'nocturnal-wonderland',
 'mainstream', NULL),

(gen_random_uuid(), 'Hard Summer 2026', 'Los Angeles', 'Hollywood Park', '2026-08-01', '2026-08-02',
 ARRAY['Electronic','House','Techno','Bass','EDM'],
 ARRAY['Lineup TBA'],
 'https://hardfest.com/',
 'Hard Summer Music Festival returns with two days of cutting-edge electronic music in Los Angeles.',
 'approved', 'community', 'hard-summer',
 'mainstream', NULL),

(gen_random_uuid(), 'Dreamstate SoCal 2026', 'San Bernardino', 'Glen Helen Amphitheater', '2026-11-27', '2026-11-28',
 ARRAY['Trance','Electronic','Progressive'],
 ARRAY['Lineup TBA'],
 'https://dreamstateusa.com/',
 'Insomniac''s Dreamstate is North America''s premier trance music festival, taking over Glen Helen Amphitheater for a Thanksgiving weekend trance experience.',
 'approved', 'community', 'dreamstate-socal',
 'mainstream', NULL),

(gen_random_uuid(), 'Escape Halloween 2026', 'San Bernardino', 'Glen Helen Amphitheater', '2026-10-30', '2026-10-31',
 ARRAY['Electronic','House','Techno','Bass','EDM'],
 ARRAY['Lineup TBA'],
 'https://escapehalloween.com/',
 'Insomniac''s Escape Halloween transforms Glen Helen Amphitheater into a haunted electronic music experience for Halloween weekend.',
 'approved', 'community', 'escape-halloween',
 'mainstream', NULL),

-- --------------------------------------------------------
-- CRSSD FESTIVAL
-- --------------------------------------------------------
-- --------------------------------------------------------
-- CRSSD FESTIVAL
-- --------------------------------------------------------
(gen_random_uuid(), 'CRSSD Spring', 'San Diego', 'Waterfront Park', '2026-03-14', '2026-03-15',
 ARRAY['House','Techno','Electronic'],
 ARRAY['Lineup TBA'],
 'https://crssdfest.com/',
 'CRSSD Festival Spring brings world-class house and techno to San Diego''s Waterfront Park for an outdoor daytime festival experience.',
 'approved', 'community', 'crssd-festival-spring',
 'mainstream', NULL),

(gen_random_uuid(), 'CRSSD Fall', 'San Diego', 'Waterfront Park', '2026-09-26', '2026-09-27',
 ARRAY['House','Techno','Electronic'],
 ARRAY['Lineup TBA'],
 'https://crssdfest.com/',
 'CRSSD Festival Fall returns to San Diego''s Waterfront Park for another weekend of world-class house and techno. Exact dates TBA.',
 'approved', 'community', 'crssd-festival-fall',
 'mainstream', NULL),

-- --------------------------------------------------------
-- SPLASH HOUSE
-- --------------------------------------------------------
(gen_random_uuid(), 'Splash House Weekend 1', 'Palm Springs', 'Renaissance Palm Springs Hotel', '2026-08-07', '2026-08-09',
 ARRAY['House','Electronic','Dance'],
 ARRAY['Lineup TBA'],
 'https://splashhouse.com/',
 'Splash House Weekend 1 — three hotels, one music festival. House music, pools, and desert heat in Palm Springs.',
 'approved', 'community', 'splash-house-weekend-1',
 'mainstream', NULL),

(gen_random_uuid(), 'Splash House Weekend 2', 'Palm Springs', 'Renaissance Palm Springs Hotel', '2026-08-14', '2026-08-16',
 ARRAY['House','Electronic','Dance'],
 ARRAY['Lineup TBA'],
 'https://splashhouse.com/',
 'Splash House Weekend 2 — the second weekend of Palm Springs'' beloved pool festival. Three hotels, house music, and desert vibes.',
 'approved', 'community', 'splash-house-weekend-2',
 'mainstream', NULL),

-- --------------------------------------------------------
-- LIGHTNING IN A BOTTLE
-- --------------------------------------------------------
(gen_random_uuid(), 'Lightning in a Bottle 2026', 'Bradley', 'Lake San Antonio', '2026-05-20', '2026-05-25',
 ARRAY['Electronic','House','Techno','Ambient','Bass'],
 ARRAY['Lineup TBA'],
 'https://lightninginabottle.org/',
 'Lightning in a Bottle is a transformational arts and music festival in California featuring electronic music, art installations, workshops, and community.',
 'approved', 'community', 'lightning-in-a-bottle',
 'mainstream', NULL),

-- --------------------------------------------------------
-- DESERT HEARTS
-- --------------------------------------------------------
(gen_random_uuid(), 'Desert Hearts Festival 2026', 'San Bernardino', 'Glen Helen Amphitheater', '2026-04-17', '2026-04-19',
 ARRAY['House','Techno','Electronic'],
 ARRAY['Lineup TBA'],
 'https://deserthearts.us/',
 'Desert Hearts Festival — a 72-hour house and techno experience built on community, love, and underground music culture.',
 'approved', 'community', 'desert-hearts-festival',
 'underground', NULL),

-- --------------------------------------------------------
-- DIRTYBIRD CAMPOUT
-- --------------------------------------------------------
(gen_random_uuid(), 'Dirtybird Campout West Coast 2026', 'Silverado', 'Irvine Lake', '2026-10-08', '2026-10-11',
 ARRAY['House','Techno','Electronic','Bass'],
 ARRAY['Claude VonStroke','Justin Martin','Lineup TBA'],
 'https://dirtybirdcampout.com/',
 'Dirtybird Campout — three days of camping, games, and underground house and techno in the California wilderness.',
 'approved', 'community', 'dirtybird-campout',
 'underground', NULL),

-- --------------------------------------------------------
-- SNOWGLOBE
-- --------------------------------------------------------
(gen_random_uuid(), 'SnowGlobe Music Festival 2026', 'South Lake Tahoe', 'Commons Beach', '2026-12-29', '2026-12-31',
 ARRAY['Electronic','House','Techno','Bass','EDM'],
 ARRAY['Lineup TBA'],
 'https://snowglobemusic.com/',
 'SnowGlobe Music Festival rings in the New Year at Lake Tahoe with three days of electronic music, snow, and mountain vibes.',
 'approved', 'community', 'snowglobe-music-festival',
 'mainstream', NULL),

-- --------------------------------------------------------
-- ELECTRIC FOREST
-- --------------------------------------------------------
(gen_random_uuid(), 'Electric Forest 2026', 'Rothbury', 'Double JJ Resort', '2026-06-25', '2026-06-28',
 ARRAY['Electronic','House','Jam','Bass','EDM'],
 ARRAY['Lineup TBA'],
 'https://electricforestfestival.com/',
 'Electric Forest is a magical four-day music and art festival in the forests of Michigan. Known for its enchanted forest art installation and diverse electronic and jam music lineup.',
 'approved', 'community', 'electric-forest',
 'mainstream', NULL),

-- --------------------------------------------------------
-- ARC MUSIC FESTIVAL
-- --------------------------------------------------------
(gen_random_uuid(), 'ARC Music Festival 2026', 'Chicago', 'Union Park', '2026-09-04', '2026-09-07',
 ARRAY['House','Techno','Electronic'],
 ARRAY['Lineup TBA'],
 'https://arcmusicfestival.com/',
 'ARC Music Festival is a four-day celebration of house and techno at Chicago''s Union Park. One of the fastest-growing and most credible festivals in underground dance music, ARC draws top-tier international DJs in the birthplace of house music.',
 'approved', 'community', 'arc-music-festival',
 'mainstream', NULL),

-- --------------------------------------------------------
-- MOVEMENT DETROIT
-- --------------------------------------------------------
(gen_random_uuid(), 'Movement Electronic Music Festival 2026', 'Detroit', 'Hart Plaza', '2026-05-23', '2026-05-25',
 ARRAY['Techno','House','Electronic'],
 ARRAY['Lineup TBA'],
 'https://movement.us/',
 'Movement Electronic Music Festival is the world''s premier techno festival, held annually over Memorial Day weekend at Detroit''s Hart Plaza — birthplace of techno.',
 'approved', 'community', 'movement-electronic-music-festival',
 'mainstream', NULL),

-- --------------------------------------------------------
-- PROJECT GLOW
-- --------------------------------------------------------
(gen_random_uuid(), 'Project GLOW 2026', 'Washington', 'RFK Festival Grounds', '2026-05-30', '2026-05-31',
 ARRAY['Electronic','House','Techno','EDM','Bass'],
 ARRAY['Lineup TBA'],
 'https://projectglowfest.com/',
 'Project GLOW is Washington D.C.''s premier electronic music festival, celebrating 20+ years of dance music, art, and culture at RFK Festival Grounds.',
 'approved', 'community', 'project-glow',
 'mainstream', NULL),

-- --------------------------------------------------------
-- SPRING AWAKENING
-- --------------------------------------------------------
(gen_random_uuid(), 'Spring Awakening Music Festival 2026', 'Chicago', 'Addams/Medill Park', '2026-06-12', '2026-06-14',
 ARRAY['Electronic','House','EDM','Techno'],
 ARRAY['Lineup TBA'],
 'https://samf.springawakeningfestival.com/',
 'Spring Awakening Music Festival brings three days of electronic music to Chicago in June, featuring top EDM acts across multiple stages.',
 'approved', 'community', 'spring-awakening-music-festival',
 'mainstream', NULL),

-- --------------------------------------------------------
-- NORTH COAST MUSIC FESTIVAL
-- ⚠️ Date estimated (Labor Day weekend). Verify when announced.
-- --------------------------------------------------------
(gen_random_uuid(), 'North Coast Music Festival 2026', 'Chicago', 'Douglass Park', '2026-08-28', '2026-08-30',
 ARRAY['Electronic','House','Techno','Bass','EDM','Funk'],
 ARRAY['Lineup TBA'],
 'https://northcoastfestival.com/',
 'North Coast Music Festival is Chicago''s beloved Labor Day weekend electronic music festival. Three days of diverse electronic music, local food, and community art in the city.',
 'approved', 'community', 'north-coast-music-festival',
 'mainstream', NULL),

-- --------------------------------------------------------
-- LOST LANDS
-- --------------------------------------------------------
(gen_random_uuid(), 'Lost Lands Music Festival 2026', 'Thornville', 'Legend Valley', '2026-09-25', '2026-09-27',
 ARRAY['Bass','Dubstep','EDM','Electronic'],
 ARRAY['Excision','Lineup TBA'],
 'https://lostlandsfestival.com/',
 'Lost Lands is a bass music festival in Ohio created by Excision. Three days of the hardest bass music on earth in a prehistoric festival setting.',
 'approved', 'community', 'lost-lands-music-festival',
 'mainstream', NULL),

-- --------------------------------------------------------
-- WAKAAN MUSIC FESTIVAL
-- --------------------------------------------------------
(gen_random_uuid(), 'Wakaan Music Festival 2026', 'Mulberry', 'Mulberry Mountain', '2026-10-01', '2026-10-03',
 ARRAY['Bass','Psychedelic','Electronic','Experimental'],
 ARRAY['Liquid Stranger','Lineup TBA'],
 'https://wakaanfestival.com/',
 'Wakaan Music Festival is a three-day camping bass and psychedelic music experience curated by Liquid Stranger on the hills of Mulberry Mountain in Arkansas.',
 'approved', 'community', 'wakaan-music-festival',
 'underground', NULL),

-- --------------------------------------------------------
-- BASS CANYON
-- --------------------------------------------------------
(gen_random_uuid(), 'Bass Canyon 2026', 'George', 'Gorge Amphitheatre', '2026-08-14', '2026-08-16',
 ARRAY['Bass','Dubstep','Electronic','EDM'],
 ARRAY['Excision','Lineup TBA'],
 'https://basscanyon.com/',
 'Bass Canyon is a three-day bass music festival at the iconic Gorge Amphitheatre in Washington State — one of the most beautiful festival venues in the world.',
 'approved', 'community', 'bass-canyon',
 'mainstream', NULL),

-- --------------------------------------------------------
-- PARADISO
-- --------------------------------------------------------
(gen_random_uuid(), 'Paradiso Festival 2026', 'George', 'Gorge Amphitheatre', '2026-06-26', '2026-06-27',
 ARRAY['Electronic','House','EDM','Techno'],
 ARRAY['Lineup TBA'],
 'https://paradisofestival.com/',
 'Paradiso Festival is a two-day electronic music experience at the Gorge Amphitheatre overlooking the Columbia River gorge — one of the most stunning festival settings in North America.',
 'approved', 'community', 'paradiso-festival',
 'mainstream', NULL),

-- --------------------------------------------------------
-- SHAMBHALA
-- --------------------------------------------------------
(gen_random_uuid(), 'Shambhala Music Festival 2026', 'Salmo', 'Salmo River Ranch', '2026-07-24', '2026-07-27',
 ARRAY['Electronic','Bass','Psytrance','House','Techno','Experimental'],
 ARRAY['A-Trak','Excision','Boris Brejcha','Clozee','Chromeo','Lineup TBA'],
 'https://www.shambhalamusicfestival.com/',
 'Shambhala Music Festival is a legendary four-day Canadian electronic music festival on the Salmo River Ranch in British Columbia. Famous for its six uniquely themed stages, world-class sound systems, and deeply community-driven culture.',
 'approved', 'community', 'shambhala-music-festival',
 'underground', NULL),

-- --------------------------------------------------------
-- SONIC BLOOM
-- --------------------------------------------------------
(gen_random_uuid(), 'Sonic Bloom 2026', 'Rye', 'Hummingbird Ranch', '2026-06-18', '2026-06-21',
 ARRAY['Electronic','Psytrance','Bass','House','Ambient'],
 ARRAY['Lineup TBA'],
 'https://sonicbloom.net/',
 'Sonic Bloom is a four-day transformational arts and music festival in Colorado featuring electronic music, yoga, art installations, and community.',
 'approved', 'community', 'sonic-bloom',
 'mainstream', NULL),

-- --------------------------------------------------------
-- AUDIOTISTIC BAY AREA
-- ⚠️ Date estimated based on 2025 pattern. Verify when announced.
-- --------------------------------------------------------
(gen_random_uuid(), 'Audiotistic Bay Area 2026', 'Mountain View', 'Shoreline Amphitheatre', '2026-07-11', '2026-07-12',
 ARRAY['Electronic','House','Techno','Bass','EDM'],
 ARRAY['Lineup TBA'],
 'https://audiotistic.com/',
 'Insomniac''s Audiotistic brings two days of diverse electronic music to the Bay Area — spanning house, techno, bass, and everything in between.',
 'approved', 'community', 'audiotistic-bay-area',
 'mainstream', NULL),

-- --------------------------------------------------------
-- LIFE IS BEAUTIFUL
-- --------------------------------------------------------
(gen_random_uuid(), 'Life is Beautiful 2026', 'Las Vegas', 'Downtown Las Vegas', '2026-09-18', '2026-09-20',
 ARRAY['Electronic','Indie','House','Alternative','EDM'],
 ARRAY['Lineup TBA'],
 'https://lifeisbeautiful.com/',
 'Life is Beautiful is a multi-genre arts and music festival in Downtown Las Vegas featuring electronic music, art, comedy, and culinary experiences.',
 'approved', 'community', 'life-is-beautiful',
 'mainstream', NULL),

-- --------------------------------------------------------
-- III POINTS
-- --------------------------------------------------------
(gen_random_uuid(), 'III Points 2026', 'Miami', 'Mana Wynwood', '2026-10-16', '2026-10-17',
 ARRAY['Electronic','House','Techno','Hip-Hop','Bass'],
 ARRAY['Lineup TBA'],
 'https://www.iiipoints.com/',
 'III Points is a two-day music and technology festival spanning 5 city blocks at Mana Wynwood in the heart of Miami. Blending underground electronic music with cutting-edge art and culture.',
 'approved', 'community', 'iii-points',
 'mainstream', NULL),

-- --------------------------------------------------------
-- COUNTDOWN NYE
-- --------------------------------------------------------
(gen_random_uuid(), 'Countdown NYE 2026', 'San Bernardino', 'NOS Events Center', '2026-12-31', '2027-01-01',
 ARRAY['EDM','House','Techno','Bass','Electronic'],
 ARRAY['Lineup TBA'],
 'https://countdownnye.com/',
 'Countdown NYE is Insomniac''s flagship New Year''s Eve festival — five stages of electronic music ringing in the new year at NOS Events Center.',
 'approved', 'community', 'countdown-nye',
 'mainstream', NULL),

-- --------------------------------------------------------
-- EDC ORLANDO
-- ⚠️ Date estimated based on 2025 pattern (Nov 7–8). Verify.
-- --------------------------------------------------------
(gen_random_uuid(), 'EDC Orlando 2026', 'Orlando', 'Tinker Field', '2026-11-06', '2026-11-08',
 ARRAY['EDM','House','Techno','Trance','Bass','Electronic'],
 ARRAY['Lineup TBA'],
 'https://orlando.electricdaisycarnival.com/',
 'Electric Daisy Carnival Orlando brings the magic of EDC to Florida. Three nights of electronic music under the electric sky featuring multiple stages of world-class EDM acts.',
 'approved', 'community', 'edc-orlando',
 'mainstream', NULL),

-- --------------------------------------------------------
-- DECADENCE ARIZONA
-- --------------------------------------------------------
(gen_random_uuid(), 'Decadence Arizona 2026', 'Phoenix', 'Arizona Financial Theatre', '2026-12-30', '2026-12-31',
 ARRAY['Electronic','House','EDM','Bass','Techno'],
 ARRAY['Lineup TBA'],
 'https://decadencearizona.com/',
 'Decadence Arizona is Relentless Beats'' New Year''s Eve festival — two massive nights of electronic music in Phoenix to ring in the new year.',
 'approved', 'community', 'decadence-arizona',
 'mainstream', NULL),

-- --------------------------------------------------------
-- HOLY SHIP WRECKED
-- --------------------------------------------------------
(gen_random_uuid(), 'Holy Ship Wrecked 2027', 'Nassau', 'Baha Mar Resort', '2027-01-08', '2027-01-11',
 ARRAY['House','Techno','Electronic'],
 ARRAY['Lineup TBA'],
 'https://holyshipwrecked.com/',
 'Holy Ship Wrecked is an immersive beach festival experience in the Bahamas featuring the best in house and techno music.',
 'approved', 'community', 'holy-ship-wrecked',
 'mainstream', NULL),

-- --------------------------------------------------------
-- SAME SAME BUT DIFFERENT
-- ⚠️ Date estimated based on 2025 pattern. Verify when announced.
-- --------------------------------------------------------
(gen_random_uuid(), 'Same Same But Different 2026', 'Victorville', 'Glen Helen Regional Park', '2026-10-09', '2026-10-11',
 ARRAY['Electronic','House','Techno','Bass','Experimental'],
 ARRAY['Lineup TBA'],
 'https://www.samesamebutdifferentfest.com/',
 'Same Same But Different is a three-day camping music festival in the Southern California desert. A community-first festival known for diverse underground music, art installations, and an inclusive culture.',
 'approved', 'community', 'same-same-but-different',
 'underground', NULL),

-- --------------------------------------------------------
-- HULAWEEN
-- --------------------------------------------------------
(gen_random_uuid(), 'Hulaween 2026', 'Live Oak', 'Spirit of Suwannee Music Park', '2026-10-22', '2026-10-25',
 ARRAY['Electronic','Jam','Bass','Psychedelic','House'],
 ARRAY['Lineup TBA'],
 'https://hulaween.com/',
 'Hulaween is a four-day Halloween-weekend camping festival at the Spirit of Suwannee Music Park in Florida. Beloved for blending jam, bass, and electronic music with deep community roots.',
 'approved', 'community', 'hulaween',
 'underground', NULL),

-- --------------------------------------------------------
-- FORBIDDEN KINGDOM 2027
-- (2026 event already seeded separately)
-- --------------------------------------------------------
(gen_random_uuid(), 'Forbidden Kingdom 2027', 'Orlando', 'Tinker Field', '2027-04-23', '2027-04-25',
 ARRAY['Bass','Dubstep','Electronic','EDM'],
 ARRAY['Lineup TBA'],
 'https://www.forbiddenkingdomfestival.com/',
 'Forbidden Kingdom is a three-day bass music festival in Orlando, FL. Featuring 5 stages of fire, fury, and bass in an immersive fantasy kingdom setting produced by Bassrush.',
 'approved', 'community', 'forbidden-kingdom-2027',
 'mainstream', NULL),

-- --------------------------------------------------------
-- DESERT DAZE
-- --------------------------------------------------------
(gen_random_uuid(), 'Desert Daze 2026', 'Lake Perris', 'Lake Perris State Recreation Area', '2026-10-15', '2026-10-18',
 ARRAY['Electronic','Indie','Psychedelic','House'],
 ARRAY['Lineup TBA'],
 'https://desert-daze.com/',
 'Desert Daze is a Southern California music and arts festival blending electronic, indie, and psychedelic music with immersive art experiences.',
 'approved', 'community', 'desert-daze',
 'mainstream', NULL),

-- --------------------------------------------------------
-- FRAMEWORKS (LA)
-- --------------------------------------------------------
(gen_random_uuid(), 'Framework: Reframe Outdoors', 'Los Angeles', 'Reframe Studios Outdoors', '2026-06-06', NULL,
 ARRAY['Techno','House','Electronic'],
 ARRAY['Lineup TBA'],
 'https://thisisframework.com/',
 'Framework presents Reframe Outdoors — an outdoor electronic music experience at Reframe Studios in Los Angeles featuring underground house and techno.',
 'approved', 'community', 'framework-reframe-outdoors',
 'underground', 'https://thisisframework.com/wp-content/uploads/2023/08/framework-logo-askew-sm3.png')

ON CONFLICT DO NOTHING;

-- Make sure all the festivals we just inserted are approved
UPDATE public.festivals
SET status = 'approved'
WHERE source = 'community'
  AND status = 'pending'
  AND name IN (
    'Ultra Music Festival 2027',
    'Goldrush: Midnight Riders 2026',
    'Green Velvet presents LALALAND | Oasis Pool Party',
    'EDC Las Vegas 2026',
    'Beyond Wonderland SoCal 2026',
    'Nocturnal Wonderland 2026',
    'Hard Summer 2026',
    'Dreamstate SoCal 2026',
    'Escape Halloween 2026',
    'CRSSD Spring',
    'CRSSD Fall',
    'Splash House Weekend 1',
    'Splash House Weekend 2',
    'Lightning in a Bottle 2026',
    'Desert Hearts Festival 2026',
    'Dirtybird Campout West Coast 2026',
    'SnowGlobe Music Festival 2026',
    'Electric Forest 2026',
    'Movement Electronic Music Festival 2026',
    'Spring Awakening Music Festival 2026',
    'Lost Lands Music Festival 2026',
    'Bass Canyon 2026',
    'Paradiso Festival 2026',
    'Sonic Bloom 2026',
    'Life is Beautiful 2026',
    'Holy Ship Wrecked 2027',
    'Desert Daze 2026',
    'Framework: Reframe Outdoors',
    'Coachella 2026',
    'ARC Music Festival 2026',
    'EDC Orlando 2026',
    'Countdown NYE 2026',
    'Audiotistic Bay Area 2026',
    'North Coast Music Festival 2026',
    'Wakaan Music Festival 2026',
    'III Points 2026',
    'Decadence Arizona 2026',
    'Project GLOW 2026',
    'Forbidden Kingdom 2027',
    'Same Same But Different 2026',
    'Hulaween 2026',
    'Shambhala Music Festival 2026'
  );
