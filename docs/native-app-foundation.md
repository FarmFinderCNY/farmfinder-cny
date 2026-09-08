# FarmFinder native app foundation

FarmFinder's web product remains the primary product. Native iOS/Android clients should reuse the same Supabase data, owner accounts, follows, inventory, and notification concepts rather than creating a separate data silo.

## Stable public read API

`GET /api/v1/farms`

Optional query parameters:
- `state=NY` — filter active listings by state.
- `updated_since=<ISO date>` — return listings whose farmer inventory timestamp is at or after the supplied date.

The response exposes customer-safe listing and inventory data and intentionally excludes owner account IDs, subscriber emails, and admin/submission data.

## Native app rules

1. Keep farm IDs stable across web and native clients so deep links use `/farms/{id}`.
2. Use the existing Supabase authentication/account model for farmer management.
3. Keep Follow a Farm subscriptions and product alerts in the existing subscription infrastructure.
4. Treat the versioned `/api/v1` contract as the compatibility boundary for customer-facing native reads.
5. Add future mobile-only capabilities (push tokens, device preferences) as additive tables/API endpoints rather than changing farm identity or duplicating inventory.
6. Preserve the seven-day farmer-confirmed freshness rule consistently across clients.

## Next native milestone

When FarmFinder is ready for App Store / Play Store work, build a thin client around: Available Near Me, product search, farm detail, Follow a Farm, directions, and farmer sign-in/update. The web product and native apps should point to the same backend and data.