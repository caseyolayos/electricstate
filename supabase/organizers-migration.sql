-- Organizers Migration
-- Electric State — "Organized By" feature
-- Run in: Supabase Dashboard → SQL Editor → New Query

-- 1. Create organizers table
CREATE TABLE IF NOT EXISTS public.organizers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       text UNIQUE NOT NULL,
  name       text NOT NULL,
  description text,
  founded_year int,
  key_people  jsonb DEFAULT '[]'::jsonb,
  logo_url   text,
  website    text,
  genres     text[] DEFAULT '{}',
  instagram  text,
  twitter    text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (read-only public access)
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view organizers" ON public.organizers;
CREATE POLICY "Anyone can view organizers"
  ON public.organizers FOR SELECT USING (true);

-- 2. Add organizer fields to festivals table
ALTER TABLE public.festivals
  ADD COLUMN IF NOT EXISTS organizer_slug text REFERENCES public.organizers(slug),
  ADD COLUMN IF NOT EXISTS organizer_name text;

-- 3. Seed core organizers
INSERT INTO public.organizers (slug, name, description, founded_year, genres, website, instagram, twitter, key_people)
VALUES
  (
    'do-lab',
    'Do LaB',
    'Do LaB is an independent arts and music production company based in Los Angeles, founded by brothers Dede, Jesse, and Josh Flemming. Best known for producing Lightning in a Bottle, they also create the iconic Do LaB stage at Coachella. Their events are defined by immersive art installations, community-driven culture, and a deep commitment to sustainability and environmental stewardship.',
    2003,
    ARRAY['House', 'Techno', 'Electronic', 'Psychedelic', 'Experimental'],
    'https://dolab.com',
    'thedolab',
    'thedolab',
    '[{"name":"Dede Flemming","role":"Co-Founder"},{"name":"Jesse Flemming","role":"Co-Founder"},{"name":"Josh Flemming","role":"Co-Founder"}]'::jsonb
  ),
  (
    'insomniac',
    'Insomniac Events',
    'Insomniac Events is one of the world''s leading electronic music event producers, founded by Pasquale Rotella in Los Angeles in 1993. Known for spectacular production, elaborate themed environments, and a "Headliner" community ethos, Insomniac produces some of the biggest dance music events in the world — including EDC Las Vegas, Beyond Wonderland, Escape Halloween, Nocturnal Wonderland, and dozens more annually.',
    1993,
    ARRAY['EDM', 'House', 'Techno', 'Trance', 'Bass', 'Dubstep'],
    'https://insomniac.com',
    'insomniacevents',
    'insomniacevents',
    '[{"name":"Pasquale Rotella","role":"Founder & CEO"}]'::jsonb
  ),
  (
    'goldenvoice',
    'Goldenvoice / AEG Presents',
    'Goldenvoice is a Los Angeles-based concert promotion company and subsidiary of AEG Presents. Founded in 1981 as an independent punk and hardcore promoter, they evolved into a major force in live music. They are best known for producing Coachella Valley Music and Arts Festival — one of the most influential music events in the world — as well as Stagecoach, and hundreds of club and theater shows across the US each year.',
    1981,
    ARRAY['Electronic', 'Indie', 'Pop', 'Hip-Hop', 'Alternative', 'Country'],
    'https://www.goldenvoice.com',
    'goldenvoice',
    'goldenvoice',
    '[{"name":"Paul Tollett","role":"President & CEO"},{"name":"Skip Bishop","role":"Co-Founder (retired)"}]'::jsonb
  ),
  (
    'id-t',
    'ID&T',
    'ID&T is a Dutch event organization founded in 1992 by Duncan Stutterheim and Irene Esteves. Responsible for some of the world''s most iconic electronic music festivals — including Tomorrowland, Thunderdome, and Sensation — ID&T helped shape the global dance music industry. Now part of SFX Entertainment and Live Style, their events attract hundreds of thousands of attendees annually from every corner of the world.',
    1992,
    ARRAY['Trance', 'Techno', 'House', 'Hardstyle', 'EDM'],
    'https://www.id-t.com',
    'tomorrowland',
    'tomorrowland',
    '[{"name":"Duncan Stutterheim","role":"Co-Founder"},{"name":"Irene Esteves","role":"Co-Founder"}]'::jsonb
  ),
  (
    'relentless-beats',
    'Relentless Beats',
    'Relentless Beats is Arizona''s premier electronic music promoter, founded in Tempe in 2002 by Shawn Rhoades. They produce events across Phoenix, Tucson, and the broader Southwest — ranging from intimate club nights to large-scale outdoor festivals. Known for championing both underground and mainstream electronic music, they have helped build a passionate regional scene for over two decades.',
    2002,
    ARRAY['House', 'Techno', 'Electronic', 'Bass'],
    'https://relentlessbeats.com',
    'relentlessbeats',
    'relentlessbeats',
    '[{"name":"Shawn Rhoades","role":"Founder"}]'::jsonb
  ),
  (
    'hard-events',
    'HARD Events',
    'HARD Events (now part of Live Nation) is one of the most adventurous electronic music event brands in the US, founded by DJ and producer Gary Richards (aka Destructo) in 2007. Known for eclectic, boundary-pushing lineups that span house, techno, bass, and hip-hop crossover, their flagship events include HARD Summer Music Festival, HARD Day of the Dead, and the legendary Holy Ship! cruise experience.',
    2007,
    ARRAY['House', 'Techno', 'Electronic', 'Bass', 'Hip-Hop'],
    'https://hardfest.com',
    'hardevents',
    'hardevents',
    '[{"name":"Gary Richards","role":"Founder (Destructo)"}]'::jsonb
  ),
  (
    'festival-republic',
    'Festival Republic',
    'Festival Republic is a UK-based live music company and subsidiary of Live Nation, responsible for producing some of Britain''s most beloved festivals including Reading & Leeds, Latitude, Wilderness, Download, and Truck Festival. Led by MD Melvin Benn, they have been a cornerstone of the UK festival scene for decades, representing over 70 events across the country each year.',
    1999,
    ARRAY['Rock', 'Indie', 'Electronic', 'Alternative', 'Pop'],
    'https://www.festivalrepublic.com',
    'festivalrepublic',
    'festivalrepublic',
    '[{"name":"Melvin Benn","role":"Managing Director"}]'::jsonb
  ),
  (
    'secret-garden-party',
    'Secret Garden Party',
    'Secret Garden Party was a beloved boutique festival held annually in Cambridgeshire, UK, founded by Freddie Fellowes in 2004. Renowned for its intimate atmosphere, interactive art installations, and participatory spirit, it ran until 2017. The legacy of SGP lives on through its ethos of creativity-first, community-driven events that inspired a generation of UK festival culture.',
    2004,
    ARRAY['Electronic', 'Indie', 'Folk', 'Experimental'],
    'https://www.secretgardenparty.com',
    'secretgardenparty',
    null,
    '[{"name":"Freddie Fellowes","role":"Founder"}]'::jsonb
  )
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  description  = EXCLUDED.description,
  founded_year = EXCLUDED.founded_year,
  genres       = EXCLUDED.genres,
  website      = EXCLUDED.website,
  instagram    = EXCLUDED.instagram,
  twitter      = EXCLUDED.twitter,
  key_people   = EXCLUDED.key_people;

-- 4. Link known festivals to their organizers
UPDATE public.festivals SET organizer_slug = 'do-lab'
  WHERE slug ILIKE '%lightning-in-a-bottle%' OR name ILIKE '%lightning in a bottle%';

UPDATE public.festivals SET organizer_slug = 'insomniac'
  WHERE slug ILIKE '%edc-%' OR name ILIKE '%electric daisy carniv%'
     OR slug ILIKE '%beyond-wonderland%' OR name ILIKE '%beyond wonderland%'
     OR slug ILIKE '%escape-halloween%'  OR name ILIKE '%escape halloween%'
     OR slug ILIKE '%nocturnal-wonderland%' OR name ILIKE '%nocturnal wonderland%'
     OR slug ILIKE '%countdown-nye%'     OR name ILIKE '%countdown nye%';

UPDATE public.festivals SET organizer_slug = 'goldenvoice'
  WHERE slug ILIKE '%coachella%' OR name ILIKE '%coachella%'
     OR slug ILIKE '%stagecoach%' OR name ILIKE '%stagecoach%';

UPDATE public.festivals SET organizer_slug = 'id-t'
  WHERE slug ILIKE '%tomorrowland%' OR name ILIKE '%tomorrowland%';

UPDATE public.festivals SET organizer_slug = 'relentless-beats'
  WHERE name ILIKE '%relentless%' AND city ILIKE ANY(ARRAY['%phoenix%','%tempe%','%tucson%','%scottsdale%','%arizona%']);

UPDATE public.festivals SET organizer_slug = 'hard-events'
  WHERE slug ILIKE '%hard-summer%' OR name ILIKE '%hard summer%'
     OR slug ILIKE '%hard-day-of-the-dead%' OR name ILIKE '%hard day of the dead%'
     OR slug ILIKE '%holy-ship%' OR name ILIKE '%holy ship%';
