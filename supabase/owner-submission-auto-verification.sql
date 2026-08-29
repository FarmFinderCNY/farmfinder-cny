-- Run once in the Supabase SQL Editor.
-- Owner-submitted farms become verified automatically when the approval RPC
-- publishes them. Community suggestions remain unverified and claimable.

create or replace function public.verify_owner_submitted_farm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1
    from public.farm_stand_submissions submission
    where submission.submission_type = 'owner'
      and lower(trim(submission.farm_name)) = lower(trim(new.name))
      and lower(trim(submission.address)) = lower(trim(coalesce(new.address, '')))
      and lower(trim(submission.city)) = lower(trim(coalesce(new.city, '')))
      and lower(trim(submission.state)) = lower(trim(coalesce(new.state, '')))
      and lower(trim(submission.zip_code)) = lower(trim(coalesce(new.zip_code, '')))
  ) then
    new.is_verified := true;
    new.verified_at := coalesce(new.verified_at, now());
  end if;

  return new;
end;
$$;

drop trigger if exists verify_owner_submitted_farm_on_publish on public.farm_stands;

create trigger verify_owner_submitted_farm_on_publish
before insert on public.farm_stands
for each row
execute function public.verify_owner_submitted_farm();

-- Repair any owner submissions that were approved before this trigger existed.
update public.farm_stands farm
set
  is_verified = true,
  verified_at = coalesce(farm.verified_at, now())
where exists (
  select 1
  from public.farm_stand_submissions submission
  where submission.submission_type = 'owner'
    and submission.status = 'approved'
    and lower(trim(submission.farm_name)) = lower(trim(farm.name))
    and lower(trim(submission.address)) = lower(trim(coalesce(farm.address, '')))
    and lower(trim(submission.city)) = lower(trim(coalesce(farm.city, '')))
    and lower(trim(submission.state)) = lower(trim(coalesce(farm.state, '')))
    and lower(trim(submission.zip_code)) = lower(trim(coalesce(farm.zip_code, '')))
);

comment on function public.verify_owner_submitted_farm() is
  'Automatically verifies published listings that came from an owner submission.';
