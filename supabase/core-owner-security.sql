-- Run once in Supabase SQL Editor after reviewing the policy audit at the bottom.
-- These policies make owner edits explicit and keep writes tied to auth.uid().

alter table public.farm_stands enable row level security;
alter table public.farm_inventory enable row level security;
alter table public.farm_claim_requests enable row level security;
alter table public.farm_update_requests enable row level security;

drop policy if exists "Owners update their farm" on public.farm_stands;
create policy "Owners update their farm" on public.farm_stands
for update to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "Owners insert their inventory" on public.farm_inventory;
create policy "Owners insert their inventory" on public.farm_inventory
for insert to authenticated
with check (exists (
  select 1 from public.farm_stands
  where farm_stands.id = farm_inventory.farm_id
    and farm_stands.owner_user_id = auth.uid()
));

drop policy if exists "Owners update their inventory" on public.farm_inventory;
create policy "Owners update their inventory" on public.farm_inventory
for update to authenticated
using (exists (
  select 1 from public.farm_stands
  where farm_stands.id = farm_inventory.farm_id
    and farm_stands.owner_user_id = auth.uid()
))
with check (exists (
  select 1 from public.farm_stands
  where farm_stands.id = farm_inventory.farm_id
    and farm_stands.owner_user_id = auth.uid()
));

drop policy if exists "Owners delete their inventory" on public.farm_inventory;
create policy "Owners delete their inventory" on public.farm_inventory
for delete to authenticated
using (exists (
  select 1 from public.farm_stands
  where farm_stands.id = farm_inventory.farm_id
    and farm_stands.owner_user_id = auth.uid()
));

-- Inspect every existing policy after running this script. PostgreSQL combines
-- permissive policies with OR, so remove any older write policy whose qual or
-- with_check allows unrelated authenticated/anonymous users.
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('farm_stands','farm_inventory','farm_claim_requests','farm_update_requests','farm_stand_submissions')
order by tablename, cmd, policyname;
