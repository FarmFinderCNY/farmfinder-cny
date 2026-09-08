import type { FarmStand } from "@/lib/types";

export type ListingType = NonNullable<FarmStand["listing_type"]>;
export type MarketSchedule = "seasonal" | "year_round";

const FARMERS_MARKET_NAME = /\bfarmer(?:s['’]?|['’]s)?\s+market\b/i;

export function resolveListingType(name: string, listingType?: string | null): ListingType {
  if (listingType === "farmers_market" || FARMERS_MARKET_NAME.test(name)) {
    return "farmers_market";
  }

  return "farm_stand";
}

export function resolveMarketSchedule(name: string): MarketSchedule | null {
  const normalizedName = name.trim().toLowerCase().replace(/[’]/g, "'");

  if (normalizedName === "cooperstown farmers' market") return "year_round";
  if (normalizedName === "boonville area farmers market") return "seasonal";

  return null;
}

export function getMarketLabel(name: string): string {
  const schedule = resolveMarketSchedule(name);
  if (schedule === "year_round") return "Year-Round Farmers Market";
  if (schedule === "seasonal") return "Seasonal Farmers Market";
  return "Farmers Market";
}
