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
- `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service-role key (server only; never expose this value in browser code)
- `RESEND_API_KEY` = your Resend API key for submission and product-alert emails
- `FARMFINDER_ADMIN_EMAIL` = the private address that receives new-listing notices

No other build settings are required. Keep service-role and Resend keys private and never prefix them with `NEXT_PUBLIC_`.

## Map integration

The app includes an interactive Leaflet map using OpenStreetMap tiles. Active stands with both latitude and longitude appear automatically as clickable pins; listings without coordinates remain visible in the stand list but are omitted from the map.

## Farmer submissions

The `/list-your-farm` page sends new listings to the protected `farm_stand_submissions` table with a pending status. Public users may insert submissions but cannot read the table. Review pending rows in Supabase before copying approved public information into `farm_stands`.

## Installable app

FarmFinder CNY includes a web app manifest, branded icons, standalone display settings, and a service worker for static assets. Compatible browsers can install it to a phone or computer home screen. Private admin and farmer-portal pages are deliberately excluded from service-worker caching.
