# FarmFinder CNY

A first-release Next.js app for discovering active farm stands in Central New York. It uses the App Router, TypeScript, and Supabase, and is ready for a future interactive map.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local`.
3. Replace `your_supabase_publishable_key` with the project's Supabase publishable key.
4. Run `npm run dev` and open `http://localhost:3000`.

Never commit `.env.local` or a secret/service-role key. This app only needs the browser-safe Supabase publishable key.

## Supabase requirements

The app reads from the existing `farm_stands` table and filters with `is_active = true`, sorted by `name`. Because the app uses a publishable key, enable Row Level Security and add a public `SELECT` policy limited to active rows if one does not already exist.

Example policy (review in the Supabase SQL editor before applying):

```sql
create policy "Public can view active farm stands"
on public.farm_stands
for select
to anon
using (is_active = true);
```

## Vercel deployment

Import `FarmFinderCNY/farmfinder-cny` in Vercel. It should detect Next.js automatically. Add these project environment variables for Production, Preview, and Development:

- `NEXT_PUBLIC_SUPABASE_URL` = `https://impcokbejslrowjfclwy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable key

No other build settings are required.

## Map integration

`components/map-placeholder.tsx` is deliberately isolated as the map boundary. Replace its visual placeholder with Mapbox, Leaflet, Google Maps, or another provider; the component already receives active stands with latitude and longitude.
