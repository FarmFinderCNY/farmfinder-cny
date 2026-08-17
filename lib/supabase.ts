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

  const { data, error } = await getSupabaseClient()
    .from("farm_stands")
    .select("id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,is_verified,is_active,created_at")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Unable to load active farm stands:", error.message);
    return [];
  }

  return (data ?? []) as FarmStand[];
}
