-- Add scanner_token to festivals for shareable door scanner links
ALTER TABLE festivals ADD COLUMN IF NOT EXISTS scanner_token UUID DEFAULT gen_random_uuid();

-- Backfill any existing rows that don't have a token yet
UPDATE festivals SET scanner_token = gen_random_uuid() WHERE scanner_token IS NULL;
