-- ============================================================
-- Electric State — Ticketing Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- --------------------------------------------------------
-- 0. Add organizer fields to festivals table
-- --------------------------------------------------------
alter table public.festivals
  add column if not exists submitted_by uuid references auth.users(id) on delete set null,
  add column if not exists ticketing_enabled boolean default false;

-- --------------------------------------------------------
-- 1. Organizer Profiles
--    Extends auth.users/profiles with Stripe Connect info.
--    One row per organizer (created when they start onboarding).
-- --------------------------------------------------------
create table if not exists public.organizer_profiles (
  id                          uuid references auth.users(id) on delete cascade primary key,
  business_name               text,
  payout_email                text,
  stripe_account_id           text unique,           -- Stripe Connect account ID (acct_xxx)
  stripe_onboarding_complete  boolean default false,
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

alter table public.organizer_profiles enable row level security;

create policy "Organizers can manage their own profile"
  on public.organizer_profiles
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Public can view organizer profiles"
  on public.organizer_profiles for select
  using (true);

-- --------------------------------------------------------
-- 2. Ticket Tiers
--    Defines the ticket types for a platform-managed event.
--    (GA, VIP, Early Bird, etc.)
-- --------------------------------------------------------
create table if not exists public.ticket_tiers (
  id              uuid default gen_random_uuid() primary key,
  event_id        uuid references public.festivals(id) on delete cascade not null,
  name            text not null,                       -- e.g. "General Admission"
  description     text,
  price_cents     integer not null check (price_cents >= 0),
  quantity_total  integer not null check (quantity_total > 0),
  quantity_sold   integer not null default 0 check (quantity_sold >= 0),
  sale_starts_at  timestamptz,                         -- null = on sale now
  sale_ends_at    timestamptz,                         -- null = until sold out / event day
  max_per_order   integer not null default 10,
  sort_order      integer not null default 0,          -- display ordering
  created_at      timestamptz default now()
);

alter table public.ticket_tiers enable row level security;

create policy "Anyone can view ticket tiers"
  on public.ticket_tiers for select
  using (true);

create policy "Organizers can manage their event's tiers"
  on public.ticket_tiers
  using (
    exists (
      select 1 from public.festivals f
      where f.id = event_id
        and f.submitted_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.festivals f
      where f.id = event_id
        and f.submitted_by = auth.uid()
    )
  );

-- --------------------------------------------------------
-- 3. Orders
--    One row per checkout session (may contain multiple tickets).
-- --------------------------------------------------------
create table if not exists public.orders (
  id                        uuid default gen_random_uuid() primary key,
  buyer_id                  uuid references auth.users(id) on delete set null,  -- null = guest
  event_id                  uuid references public.festivals(id) on delete restrict not null,
  stripe_session_id         text unique,               -- Stripe Checkout Session ID
  stripe_payment_intent_id  text,                      -- filled after payment
  status                    text not null default 'pending'
                              check (status in ('pending', 'completed', 'refunded', 'failed')),
  total_cents               integer not null,
  platform_fee_cents        integer not null default 0,
  buyer_email               text not null,
  buyer_name                text,
  created_at                timestamptz default now(),
  completed_at              timestamptz
);

alter table public.orders enable row level security;

create policy "Buyers can view their own orders"
  on public.orders for select
  using (auth.uid() = buyer_id);

create policy "Organizers can view orders for their events"
  on public.orders for select
  using (
    exists (
      select 1 from public.festivals f
      where f.id = event_id
        and f.submitted_by = auth.uid()
    )
  );

-- Service role only for insert/update (via API routes + webhooks)

-- --------------------------------------------------------
-- 4. Tickets
--    One row per individual ticket. QR token is the check-in key.
-- --------------------------------------------------------
create table if not exists public.tickets (
  id            uuid default gen_random_uuid() primary key,
  order_id      uuid references public.orders(id) on delete cascade not null,
  tier_id       uuid references public.ticket_tiers(id) on delete restrict not null,
  event_id      uuid references public.festivals(id) on delete restrict not null,
  buyer_id      uuid references auth.users(id) on delete set null,  -- null = guest
  buyer_email   text not null,
  buyer_name    text,
  qr_token      text not null unique,                  -- UUID used for QR code + check-in
  checked_in    boolean not null default false,
  checked_in_at timestamptz,
  price_cents   integer not null,                      -- snapshot of price at purchase
  tier_name     text not null,                         -- snapshot of tier name at purchase
  created_at    timestamptz default now()
);

alter table public.tickets enable row level security;

create policy "Buyers can view their own tickets"
  on public.tickets for select
  using (auth.uid() = buyer_id);

create policy "Organizers can view and check in tickets for their events"
  on public.tickets for select
  using (
    exists (
      select 1 from public.festivals f
      where f.id = event_id
        and f.submitted_by = auth.uid()
    )
  );

create policy "Organizers can update check-in status"
  on public.tickets for update
  using (
    exists (
      select 1 from public.festivals f
      where f.id = event_id
        and f.submitted_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.festivals f
      where f.id = event_id
        and f.submitted_by = auth.uid()
    )
  );

-- --------------------------------------------------------
-- 5. Helper function: decrement available tickets atomically
--    Called from API route when creating an order.
--    Returns false if sold out.
-- --------------------------------------------------------
create or replace function public.reserve_tickets(
  p_tier_id uuid,
  p_quantity integer
) returns boolean
language plpgsql security definer as $$
declare
  v_available integer;
begin
  select (quantity_total - quantity_sold)
    into v_available
    from public.ticket_tiers
   where id = p_tier_id
     for update;

  if v_available < p_quantity then
    return false;
  end if;

  update public.ticket_tiers
     set quantity_sold = quantity_sold + p_quantity
   where id = p_tier_id;

  return true;
end;
$$;

-- --------------------------------------------------------
-- 6. Indexes for common queries
-- --------------------------------------------------------
create index if not exists idx_ticket_tiers_event_id on public.ticket_tiers(event_id);
create index if not exists idx_orders_buyer_id       on public.orders(buyer_id);
create index if not exists idx_orders_event_id       on public.orders(event_id);
create index if not exists idx_orders_stripe_session on public.orders(stripe_session_id);
create index if not exists idx_tickets_order_id      on public.tickets(order_id);
create index if not exists idx_tickets_buyer_id      on public.tickets(buyer_id);
create index if not exists idx_tickets_event_id      on public.tickets(event_id);
create index if not exists idx_tickets_qr_token      on public.tickets(qr_token);
create index if not exists idx_festivals_submitted_by on public.festivals(submitted_by);
