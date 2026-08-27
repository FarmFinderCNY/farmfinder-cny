-- Run once in the Supabase SQL Editor.
-- Adds a real verification timestamp so FarmFinder can give newly verified farms
-- a seven-day "Recently verified selection" grace period.

alter table public.farm_stands
  add column if not exists verified_at timestamptz;

-- Start Groeslon Farm's grace period today (Aug. 26, 2026).
update public.farm_stands
set verified_at = '2026-08-26T00:00:00-04:00'
where lower(name) like 'groeslon%'
  and is_verified = true;

-- Optional backfill for other already-verified farms that do not yet have a timestamp.
-- This does NOT give them a new grace period; it uses their original listing date.
update public.farm_stands
set verified_at = created_at
where is_verified = true
  and verified_at is null;

-- Future verification code should set verified_at = now() at the same time is_verified becomes true.
