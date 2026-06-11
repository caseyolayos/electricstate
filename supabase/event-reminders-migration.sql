-- Event Reminders table
-- Persists event name/date/venue when a user saves or marks going
-- so we can send reminder notifications even for TM/EB events (which aren't in our DB)

CREATE TABLE IF NOT EXISTS public.event_reminders (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_id        text        NOT NULL,
  event_name      text        NOT NULL,
  event_date      date        NOT NULL,
  event_venue     text,
  event_city      text,
  type            text        NOT NULL CHECK (type IN ('saved', 'going')),
  reminder_7d_sent boolean   DEFAULT false,
  reminder_1d_sent boolean   DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id, type)
);

ALTER TABLE public.event_reminders ENABLE ROW LEVEL SECURITY;

-- Users can manage their own reminders
CREATE POLICY "Users manage own reminders"
  ON public.event_reminders
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypasses RLS anyway, but explicit for clarity
CREATE POLICY "Service role full access"
  ON public.event_reminders
  FOR ALL
  USING (auth.role() = 'service_role');
