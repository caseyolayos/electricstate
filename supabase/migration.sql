-- Electric State Passport — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query

-- 1. Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_emoji text default '🎵',
  bio text,
  xp integer default 0,
  attended_events text[] default '{}',
  saved_events text[] default '{}',
  checked_in_events text[] default '{}',
  badges text[] default '{"early-supporter"}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Row Level Security
alter table public.profiles enable row level security;

create policy "Anyone can view profiles"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- 3. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    '🎵'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
