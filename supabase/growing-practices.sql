-- Run once in the Supabase SQL editor before publishing the Growing practices UI.
alter table public.farm_stands
  add column if not exists growing_practices text[] not null default '{}',
  add column if not exists growing_practices_note text,
  add column if not exists organic_certifier text;

comment on column public.farm_stands.growing_practices is
  'Farm-reported growing practice keys displayed by FarmFinder CNY.';
comment on column public.farm_stands.growing_practices_note is
  'Optional farm-written explanation; practices may vary by crop.';
comment on column public.farm_stands.organic_certifier is
  'Certifying organization supplied by farms reporting USDA Certified Organic status.';

alter table public.farm_stands
  drop constraint if exists farm_stands_growing_practices_allowed;
alter table public.farm_stands
  add constraint farm_stands_growing_practices_allowed check (
    growing_practices <@ array[
      'certified_organic',
      'no_synthetic_pesticides',
      'no_synthetic_herbicides',
      'integrated_pest_management',
      'conventional',
      'varies_by_product',
      'ask_the_farmer'
    ]::text[]
  );

alter table public.farm_stands
  drop constraint if exists farm_stands_organic_certifier_required;
alter table public.farm_stands
  add constraint farm_stands_organic_certifier_required check (
    not ('certified_organic' = any(growing_practices))
    or nullif(btrim(organic_certifier), '') is not null
  );
