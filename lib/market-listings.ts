import type { FarmStand, MarketVendor } from "@/lib/types";
import { getSupabaseClient, hasSupabaseConfig } from "@/lib/supabase";

export async function enrichWithMarketData(stands: FarmStand[]): Promise<FarmStand[]> {
  if (!hasSupabaseConfig() || stands.length === 0) return stands;
  const client = getSupabaseClient();
  const ids = stands.map((stand) => stand.id);
  const typeResult = await client.from("farm_stands").select("id,listing_type").in("id", ids);

  // Before the migration is run, preserve the existing site behavior.
  if (typeResult.error) return stands.map((stand) => ({ ...stand, listing_type: "farm_stand" }));

  const typeById = new Map((typeResult.data ?? []).map((row) => [row.id, row.listing_type]));
  const marketIds = ids.filter((id) => typeById.get(id) === "farmers_market");
  if (marketIds.length === 0) return stands.map((stand) => ({ ...stand, listing_type: "farm_stand" }));

  const vendorsResult = await client
    .from("market_vendors")
    .select("id,market_id,vendor_name,linked_farm_id,is_attending,display_order,note,updated_at,created_at")
    .in("market_id", marketIds)
    .eq("is_attending", true)
    .order("display_order", { ascending: true })
    .order("vendor_name", { ascending: true });

  const vendorsByMarket = new Map<string, MarketVendor[]>();
  if (!vendorsResult.error) {
    for (const vendor of (vendorsResult.data ?? []) as MarketVendor[]) {
      const current = vendorsByMarket.get(vendor.market_id) ?? [];
      current.push(vendor);
      vendorsByMarket.set(vendor.market_id, current);
    }
  }

  return stands.map((stand) => ({
    ...stand,
    listing_type: typeById.get(stand.id) === "farmers_market" ? "farmers_market" : "farm_stand",
    market_vendors: vendorsByMarket.get(stand.id) ?? [],
  }));
}

export async function enrichOneWithMarketData(stand: FarmStand): Promise<FarmStand> {
  const [enriched] = await enrichWithMarketData([stand]);
  return enriched ?? stand;
}
