-- notifications table: stores in-app + push notification history per user
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type        text NOT NULL,   -- 'push', 'new_follower', 'event_reminder', 'friend_going', etc.
  title       text NOT NULL,
  body        text,
  data        jsonb DEFAULT '{}',   -- e.g. { "url": "/events/festival-xxx" }
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (server-side) can do everything
CREATE POLICY "Service role full access"
  ON notifications FOR ALL
  USING (true);
