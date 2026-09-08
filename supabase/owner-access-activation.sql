begin;

alter table public.farm_stands
  add column if not exists owner_access_activated_at timestamptz;

update public.farm_stands as farm
set owner_access_activated_at = coalesce(
  farm.owner_access_activated_at,
  owner.email_confirmed_at,
  farm.created_at
)
from auth.users as owner
where owner.id = farm.owner_user_id
  and owner.email_confirmed_at is not null
  and farm.owner_access_activated_at is null;

commit;

select
  count(*) filter (where owner_user_id is not null and owner_access_activated_at is not null) as activated_owners,
  count(*) filter (where owner_user_id is not null and owner_access_activated_at is null) as awaiting_activation
from public.farm_stands
where is_active = true;
