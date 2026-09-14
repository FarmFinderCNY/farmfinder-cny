# FarmFinder CNY delivery foundation

Status: internal foundation only; no customer-facing delivery controls are enabled.

## Goal

Keep FarmFinder CNY independent of any single last-mile delivery provider. A farm can eventually offer delivery through one or more approved providers, while the customer sees normalized price and ETA choices.

## Flow

1. Customer chooses products from one farm.
2. Customer enters a delivery address.
3. FarmFinder requests quotes from configured/approved providers.
4. Quotes are normalized to the `DeliveryQuote` shape.
5. Available choices can be sorted by delivery fee while preserving provider and ETA information.
6. A delivery is only created after the customer selects a provider and the order/payment flow confirms it.

## Providers

- Uber Direct — approval/access pending.
- DoorDash Drive — access request submitted; review pending.

Provider adapters currently fail closed: they report unavailable and do not contact provider APIs. This prevents accidental live deliveries or false availability while access is pending.

## Security

Provider credentials belong only in server-side environment variables. They must never be committed to GitHub or sent to browser/client components.

## Next steps after provider approval

- Implement that provider's server-side authentication and quote adapter.
- Add pickup/contact validation.
- Add quote expiry handling.
- Add delivery creation/cancellation/status mapping.
- Add webhook verification and idempotency.
- Add farm-level opt-in and delivery settings.
- Add customer UI only after end-to-end testing.
