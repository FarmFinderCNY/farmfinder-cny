import { createClient } from "@supabase/supabase-js";
import type { FarmStand } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getActiveFarmStands(): Promise<FarmStand[]> {
  if (!hasSupabaseConfig()) return [];

  const client = getSupabaseClient();
  const selectWithPractices = "id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,farmer_inventory_updated_at,growing_practices,growing_practices_note,organic_certifier,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const selectWithFarmerUpdate = "id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,farmer_inventory_updated_at,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const legacySelect = "id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const practicesResult = await client
    .from("farm_stands")
    .select(selectWithPractices)
    .eq("is_active", true)
    .order("name", { ascending: true });
  let data: unknown = practicesResult.data;
  let error = practicesResult.error;

  if (error?.message.match(/growing_practices|organic_certifier/)) {
    const fallbackResult = await client
      .from("farm_stands")
      .select(selectWithFarmerUpdate)
      .eq("is_active", true)
      .order("name", { ascending: true });
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error?.message.includes("farmer_inventory_updated_at")) {
    const fallbackResult = await client
      .from("farm_stands")
      .select(legacySelect)
      .eq("is_active", true)
      .order("name", { ascending: true });
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    console.error("Unable to load active farm stands:", error.message);
    return [];
  }

  return (data ?? []) as FarmStand[];
}

export async function getActiveFarmStand(id: string): Promise<FarmStand | null> {
  if (!hasSupabaseConfig()) return null;
  const client = getSupabaseClient();
  const selectWithPractices = "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,farmer_inventory_updated_at,stand_status,status_note,status_updated_at,growing_practices,growing_practices_note,organic_certifier,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const selectWithFarmerUpdate = "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,farmer_inventory_updated_at,stand_status,status_note,status_updated_at,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const legacySelect = "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,verified_at,is_active,created_at,inventory_updated_at,stand_status,status_note,status_updated_at,inventory:farm_inventory(id,farm_id,name,price,quantity,status,sort_order,updated_at)";
  const practicesResult = await client
    .from("farm_stands")
    .select(selectWithPractices)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  let data: unknown = practicesResult.data;
  let error = practicesResult.error;
  if (error?.message.match(/growing_practices|organic_certifier/)) {
    const fallbackResult = await client
      .from("farm_stands")
      .select(selectWithFarmerUpdate)
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }
  if (error?.message.includes("farmer_inventory_updated_at")) {
    const fallbackResult = await client
      .from("farm_stands")
      .select(legacySelect)
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }
  if (error) {
    console.error("Unable to load farm stand:", error.message);
    return null;
  }
  return data as FarmStand | null;
}
