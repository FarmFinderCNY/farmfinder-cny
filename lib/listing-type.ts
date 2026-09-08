import type { FarmStand } from "@/lib/types";

export type ListingType = NonNullable<FarmStand["listing_type"]>;

const FARMERS_MARKET_NAME = /\b(?:farmers?|farmer['’]s)\s+market\b/i;

export function resolveListingType(name: string, listingType?: string | null): ListingType {
  if (listingType === "farmers_market" || FARMERS_MARKET_NAME.test(name)) {
    return "farmers_market";
  }

  return "farm_stand";
}
