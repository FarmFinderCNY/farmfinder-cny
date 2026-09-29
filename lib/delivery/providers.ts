import type { DeliveryProvider, DeliveryQuote, DeliveryQuoteRequest } from "./types";

function unavailableProvider(
  id: DeliveryProvider["id"],
  displayName: string,
  configured: () => boolean,
): DeliveryProvider {
  return {
    id,
    displayName,
    isConfigured: configured,
    async getQuote(_request: DeliveryQuoteRequest): Promise<DeliveryQuote> {
      return {
        provider: id,
        available: false,
        currency: "USD",
        unavailableReason: configured()
          ? "Provider integration is not enabled yet."
          : "Provider credentials are not configured.",
      };
    },
  };
}

// Provider adapters intentionally return unavailable until each provider has
// approved FarmFinder CNY and its production API flow has been implemented.
// Secrets stay server-side in environment variables and are never exposed to
// browser code.
export const deliveryProviders: DeliveryProvider[] = [
  unavailableProvider(
    "uber_direct",
    "Uber Direct",
    () => Boolean(process.env.UBER_CLIENT_ID && process.env.UBER_CLIENT_SECRET),
  ),
  unavailableProvider(
    "doordash_drive",
    "DoorDash Drive",
    () => Boolean(process.env.DOORDASH_DEVELOPER_ID && process.env.DOORDASH_KEY_ID && process.env.DOORDASH_SIGNING_SECRET),
  ),
];
