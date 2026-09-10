-- Run once in the Supabase SQL Editor before relying on these guards.
-- The indexes close timing races that application-level duplicate checks cannot.

begin;

-- Only one pending submission for the same normalized location may exist.
create unique index if not exists farm_stand_submissions_one_pending_location
on public.farm_stand_submissions (
  lower(regexp_replace(btrim(farm_name), '[^a-zA-Z0-9]+', '', 'g')),
  lower(regexp_replace(btrim(address), '[^a-zA-Z0-9]+', '', 'g')),
  lower(regexp_replace(btrim(city), '[^a-zA-Z0-9]+', '', 'g')),
  upper(btrim(state)),
  regexp_replace(btrim(zip_code), '[^0-9]+', '', 'g')
)
where status = 'pending';

-- A person cannot create several simultaneous claims for the same farm.
create unique index if not exists farm_claim_requests_one_pending_per_user
on public.farm_claim_requests (farm_id, requested_by)
where status = 'pending';

-- A person cannot create several simultaneous update requests for the same farm.
create unique index if not exists farm_update_requests_one_pending_per_user
on public.farm_update_requests (farm_id, requested_by)
where status = 'pending';

commit;

