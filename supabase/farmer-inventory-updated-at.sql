-- Run once in the Supabase SQL Editor.
-- This timestamp is intentionally not backfilled. Existing inventory was entered
-- while FarmFinder was being set up and must not count as a farmer confirmation.

alter table public.farm_stands
  add column if not exists farmer_inventory_updated_at timestamptz;

comment on column public.farm_stands.farmer_inventory_updated_at is
  'Last inventory change made through the verified Farmer Portal.';
