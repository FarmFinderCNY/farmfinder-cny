import { deliveryProviders } from "./providers";
import type { DeliveryQuote, DeliveryQuoteRequest } from "./types";

export async function getDeliveryQuotes(
  request: DeliveryQuoteRequest,
): Promise<DeliveryQuote[]> {
  const results = await Promise.allSettled(
    deliveryProviders.map((provider) => provider.getQuote(request)),
  );

  return results.map((result, index) => {
    const provider = deliveryProviders[index];

    if (result.status === "fulfilled") return result.value;

    return {
      provider: provider.id,
      available: false,
      currency: "USD",
      unavailableReason: "Delivery quote is temporarily unavailable.",
    };
  });
}

export function getAvailableDeliveryQuotes(quotes: DeliveryQuote[]) {
  return quotes
    .filter((quote) => quote.available && typeof quote.feeCents === "number")
    .sort((a, b) => (a.feeCents ?? 0) - (b.feeCents ?? 0));
}
