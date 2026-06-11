-- Analytics: track page views and ticket button clicks per event per day
-- Run this in the Supabase SQL editor

CREATE TABLE IF NOT EXISTS event_analytics (
  event_id      uuid    NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  date          date    NOT NULL DEFAULT CURRENT_DATE,
  views         integer NOT NULL DEFAULT 0,
  ticket_clicks integer NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, date)
);

CREATE INDEX IF NOT EXISTS event_analytics_event_id_idx ON event_analytics(event_id);

-- RLS
ALTER TABLE event_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_analytics_insert" ON event_analytics;
CREATE POLICY "allow_analytics_insert" ON event_analytics
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "allow_analytics_update" ON event_analytics;
CREATE POLICY "allow_analytics_update" ON event_analytics
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "allow_analytics_select" ON event_analytics;
CREATE POLICY "allow_analytics_select" ON event_analytics
  FOR SELECT USING (true);

-- Atomic increment function (avoids race conditions)
CREATE OR REPLACE FUNCTION increment_event_analytics(
  p_event_id uuid,
  p_date     date,
  p_column   text   -- 'views' or 'ticket_clicks'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_column NOT IN ('views', 'ticket_clicks') THEN
    RAISE EXCEPTION 'Invalid column: %', p_column;
  END IF;

  INSERT INTO event_analytics (event_id, date, views, ticket_clicks)
  VALUES (
    p_event_id,
    p_date,
    CASE WHEN p_column = 'views' THEN 1 ELSE 0 END,
    CASE WHEN p_column = 'ticket_clicks' THEN 1 ELSE 0 END
  )
  ON CONFLICT (event_id, date) DO UPDATE SET
    views         = event_analytics.views         + CASE WHEN p_column = 'views' THEN 1 ELSE 0 END,
    ticket_clicks = event_analytics.ticket_clicks + CASE WHEN p_column = 'ticket_clicks' THEN 1 ELSE 0 END;
END;
$$;
