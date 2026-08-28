create table if not exists public.farm_engagement_events (
  id bigint generated always as identity primary key,
  farm_id uuid not null references public.farm_stands(id) on delete cascade,
  event_type text not null check (event_type in ('detail_view','directions_click','website_click','alert_subscription')),
  created_at timestamptz not null default now()
);

create index if not exists farm_engagement_events_farm_created_idx
  on public.farm_engagement_events (farm_id, created_at desc);

alter table public.farm_engagement_events enable row level security;

drop policy if exists "Owners can view their farm engagement" on public.farm_engagement_events;
create policy "Owners can view their farm engagement"
on public.farm_engagement_events for select to authenticated
using (exists (
  select 1 from public.farm_stands
  where farm_stands.id = farm_engagement_events.farm_id
    and farm_stands.owner_user_id = auth.uid()
));

create table if not exists public.farmer_update_reminders (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farm_stands(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  interval_days integer not null default 7 check (interval_days in (3,7,14)),
  active boolean not null default true,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, user_id)
);

alter table public.farmer_update_reminders enable row level security;

drop policy if exists "Owners manage their update reminders" on public.farmer_update_reminders;
create policy "Owners manage their update reminders"
on public.farmer_update_reminders for all to authenticated
using (user_id = auth.uid() and exists (
  select 1 from public.farm_stands
  where farm_stands.id = farmer_update_reminders.farm_id
    and farm_stands.owner_user_id = auth.uid()
))
with check (user_id = auth.uid() and exists (
  select 1 from public.farm_stands
  where farm_stands.id = farmer_update_reminders.farm_id
    and farm_stands.owner_user_id = auth.uid()
));
