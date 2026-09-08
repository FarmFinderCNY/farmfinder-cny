-- Keep farmers market records from inheriting the farm_stand default.
-- Safe to run more than once.

create or replace function public.classify_farmers_market_listing()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.name ~* '\\m(farmers?|farmer''s)\\s+market\\M' then
    new.listing_type := 'farmers_market';
  end if;

  return new;
end;
$$;

drop trigger if exists classify_farmers_market_listing on public.farm_stands;
create trigger classify_farmers_market_listing
before insert or update of name on public.farm_stands
for each row execute function public.classify_farmers_market_listing();

-- Repair Cooperstown and any other existing market that kept the old default.
update public.farm_stands
set listing_type = 'farmers_market'
where name ~* '\\m(farmers?|farmer''s)\\s+market\\M'
  and listing_type <> 'farmers_market';

comment on function public.classify_farmers_market_listing() is
  'Automatically classifies listings whose names identify them as farmers markets.';
