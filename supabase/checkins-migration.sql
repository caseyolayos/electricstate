-- check_ins table: server-side audit trail for all check-ins
create table public.check_ins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  event_id text not null,
  event_name text,
  venue_name text,
  venue_city text,
  event_date date not null,
  checked_in_at timestamptz default now(),
  user_lat double precision,
  user_lng double precision,
  venue_lat double precision,
  venue_lng double precision,
  distance_km double precision,
  xp_awarded integer default 100,
  constraint check_ins_user_event_unique unique (user_id, event_id)
);

alter table public.check_ins enable row level security;

create policy "Users can view their own check-ins"
  on public.check_ins for select using (auth.uid() = user_id);

create policy "Users can insert their own check-ins"
  on public.check_ins for insert with check (auth.uid() = user_id);
