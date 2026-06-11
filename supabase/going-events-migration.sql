-- Add going_events column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS going_events text[] DEFAULT '{}';
