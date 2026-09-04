-- Farmers market listing support for FarmFinder CNY
-- Safe to run once or more than once.
-- Existing listings remain farm stands by default.

alter table public.farm_stands
  add column if not exists listing_type text not null default 'farm_stand';

-- Keep listing types predictable while allowing the migration to be re-run.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'farm_stands_listing_type_check'
      and conrelid = 'public.farm_stands'::regclass
  ) then
    alter table public.farm_stands
      add constraint farm_stands_listing_type_check
      check (listing_type in ('farm_stand', 'farmers_market'));
  end if;
end $$;

create table if not exists public.market_vendors (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.farm_stands(id) on delete cascade,
  vendor_name text not null,
  linked_farm_id uuid references public.farm_stands(id) on delete set null,
  is_attending boolean not null default true,
  display_order integer not null default 0,
  note text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists market_vendors_market_id_idx
  on public.market_vendors (market_id, is_attending, display_order, vendor_name);

create index if not exists market_vendors_linked_farm_id_idx
  on public.market_vendors (linked_farm_id);

alter table public.market_vendors enable row level security;

-- Public visitors may read the vendor list shown on market pages.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'market_vendors'
      and policyname = 'Public can read market vendors'
  ) then
    create policy "Public can read market vendors"
      on public.market_vendors
      for select
      using (true);
  end if;
end $$;

comment on column public.farm_stands.listing_type is
  'farm_stand for individual farms/stands; farmers_market for multi-vendor markets';

comment on table public.market_vendors is
  'Vendors displayed for a farmers market listing. linked_farm_id optionally connects a vendor to its FarmFinder CNY listing.';
