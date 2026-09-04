import { createClient } from "@supabase/supabase-js";
import type { FarmStand, MarketVendor } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function hasSupabaseConfig() { return Boolean(supabaseUrl && supabaseKey); }

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase environment variables are not configured.");
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function addMarketData(client: ReturnType<typeof getSupabaseClient>, farms: FarmStand[]): Promise<FarmStand[]> {
  if (farms.length === 0) return farms;
  const ids = farms.map((farm) => farm.id);
  const typeResult = await client.from("farm_stands").select("id,listing_type").in("id", ids);
  if (typeResult.error) return farms.map((farm) => ({ ...farm, listing_type: "farm_stand" as const }));
  const types = new Map((typeResult.data ?? []).map((row) => [row.id, row.listing_type]));
  const marketIds = (typeResult.data ?? []).filter((row) => row.listing_type === "farmers_market").map((row) => row.id);
  let vendors: MarketVendor[] = [];
  if (marketIds.length > 0) {
    const vendorResult = await client.from("market_vendors").select("id,market_id,vendor_name,linked_farm_id,is_attending,display_order,note,updated_at,created_at").in("market_id", marketIds).eq("is_attending", true).order("display_order", { ascending: true }).order("vendor_name", { ascending: true });
    if (!vendorResult.error) vendors = (vendorResult.data ?? []) as MarketVendor[];
  }
  return farms.map((farm) => ({ ...farm, listing_type: (types.get(farm.id) === "farmers_market" ? "farmers_market" : "farm_stand"), market_vendors: vendors.filter((vendor) => vendor.market_id === farm.id) }));
}

export async function getActiveFarmStands(): Promise<FarmStand[]> {
  if (!hasSupabaseConfig()) return [];
  const client = getSupabaseClient();
  const selectWithFarmerUpdate = "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,farmer_inventory_updated_at,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const legacySelect = "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const primaryResult = await client.from("farm_stands").select(selectWithFarmerUpdate).eq("is_active", true).order("name", { ascending: true });
  let data: unknown = primaryResult.data; let error = primaryResult.error;
  if (error?.message.includes("farmer_inventory_updated_at")) { const fallback = await client.from("farm_stands").select(legacySelect).eq("is_active", true).order("name", { ascending: true }); data = fallback.data; error = fallback.error; }
  if (error) { console.error("Unable to load active farm stands:", error.message); return []; }
  let farms = (data ?? []) as FarmStand[];
  const practices = await client.from("farm_stands").select("id,growing_practices,growing_practices_note,organic_certifier").eq("is_active", true);
  if (!practices.error) { const byFarm = new Map((practices.data ?? []).map((row) => [row.id, row])); farms = farms.map((farm) => ({ ...farm, ...(byFarm.get(farm.id) ?? {}) })); }
  return addMarketData(client, farms);
}

export async function getActiveFarmStand(id: string): Promise<FarmStand | null> {
  if (!hasSupabaseConfig()) return null;
  const client = getSupabaseClient();
  const selectWithFarmerUpdate = "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,farmer_inventory_updated_at,stand_status,status_note,status_updated_at,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const legacySelect = "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,stand_status,status_note,status_updated_at,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const primary = await client.from("farm_stands").select(selectWithFarmerUpdate).eq("id", id).eq("is_active", true).maybeSingle();
  let data: unknown = primary.data; let error = primary.error;
  if (error?.message.includes("farmer_inventory_updated_at")) { const fallback = await client.from("farm_stands").select(legacySelect).eq("id", id).eq("is_active", true).maybeSingle(); data = fallback.data; error = fallback.error; }
  if (error) { console.error("Unable to load farm stand:", error.message); return null; }
  let farm = data as FarmStand | null; if (!farm) return null;
  const practices = await client.from("farm_stands").select("growing_practices,growing_practices_note,organic_certifier").eq("id", id).eq("is_active", true).maybeSingle();
  if (!practices.error) farm = { ...farm, ...(practices.data ?? {}) };
  return (await addMarketData(client, [farm]))[0] ?? null;
}
