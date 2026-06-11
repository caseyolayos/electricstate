-- Artist live performance ratings
CREATE TABLE IF NOT EXISTS artist_votes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_name text NOT NULL,           -- normalized lowercase for consistent keying
  category    text NOT NULL,           -- set_selection | energy | stage_presence | sound | vibe
  rating      integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (artist_name, user_id, category)
);

CREATE INDEX IF NOT EXISTS artist_votes_name_idx ON artist_votes(artist_name);

ALTER TABLE artist_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read artist votes"
  ON artist_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert votes"
  ON artist_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own votes"
  ON artist_votes FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON artist_votes FOR ALL USING (true);
