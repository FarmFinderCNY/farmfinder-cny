# My Farms

Customers can sign in at `/my-farms`, save public farms or markets, and view the latest farmer-confirmed update dates. Public browsing remains anonymous. Saving does not create an email subscription; the existing farm-follow form remains a separate action.

Favorites are UUIDs in the signed-in user's Supabase Auth metadata under `farmfinder_saved_farms`, capped at 100. This first version uses the existing authentication service without a database migration or new permissions. Favorites never grant ownership or administrator access. Existing farm-owner accounts can use the same feature, and owner metadata is preserved.

The dashboard shows the latest snapshot, not a historical feed. Unpublished or unavailable saved IDs stay saved until the customer removes them. Recent updates use the existing seven-day farmer-confirmation window; older listings remain visible under All saved farms.

## Validation

Run `node --test tests/customer-favorites.test.cjs` and the production Next build. Tests cover normalization, duplicate saves, limits, failed saves, overlapping actions, sign-out/account isolation, recovery events, anonymous pending saves, dated dashboard ordering, unavailable listings, and save controls.

Live acceptance checks: signup and confirmation email; returning sign-in; save and remove; refresh and a second-device login; password-reset email and recovery; existing farmer login; latest posted inventory and directions. No production farmer data needs to be changed to test favorites.

Supabase must allow the live origin's `/my-farms` URLs in Auth redirect configuration for confirmation/reset links to land directly on this page. If Supabase redirects a confirmation to the home page instead, My Farms remains reachable through navigation; reset-link landing should be checked separately.

Account metadata uses a small preference list; simultaneous saves from different devices can use last-write-wins semantics. The UI serializes local actions and reads the latest account before each change. If a richer history or large favorites collections are introduced, migrate this preference to a dedicated RLS-protected table.
