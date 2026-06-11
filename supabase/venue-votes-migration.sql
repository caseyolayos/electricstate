-- Venue ratings table
CREATE TABLE IF NOT EXISTS venue_votes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_slug  text NOT NULL,           -- URL slug (consistent key)
  venue_name  text NOT NULL,           -- display name
  category    text NOT NULL,           -- sound | dance_floor | bar | bathrooms | location | vibe
  rating      integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (venue_slug, user_id, category)
);

CREATE INDEX IF NOT EXISTS venue_votes_slug_idx ON venue_votes(venue_slug);

ALTER TABLE venue_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read venue votes"
  ON venue_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert venue votes"
  ON venue_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own venue votes"
  ON venue_votes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON venue_votes FOR ALL USING (true);
