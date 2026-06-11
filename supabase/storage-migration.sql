-- ============================================================
-- Electric State — Storage & Flyer Setup
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Create event-flyers storage bucket (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-flyers',
  'event-flyers',
  true,
  10485760,  -- 10MB limit
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- 2. Storage RLS — allow authenticated users to upload
create policy "Authenticated users can upload flyers"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-flyers');

-- Allow public read
create policy "Anyone can view flyers"
  on storage.objects for select
  using (bucket_id = 'event-flyers');

-- Allow owner to delete their own uploads
create policy "Users can delete their own flyers"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-flyers' and auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Ensure festivals table has image_url column
alter table public.festivals
  add column if not exists image_url text;
