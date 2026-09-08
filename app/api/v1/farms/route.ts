import { NextResponse } from "next/server";
import { getActiveFarmStands } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state")?.trim().toUpperCase();
  const updatedSince = searchParams.get("updated_since");
  const stands = await getActiveFarmStands();
  const filtered = stands.filter((stand) => {
    if (state && (stand.state ?? "").trim().toUpperCase() !== state)
      return false;
    if (updatedSince) {
      const threshold = new Date(updatedSince).getTime();
      const updated = stand.farmer_inventory_updated_at
        ? new Date(stand.farmer_inventory_updated_at).getTime()
        : 0;
      if (Number.isFinite(threshold) && updated < threshold) return false;
    }
    return true;
  });
  return NextResponse.json({
    api_version: "v1",
    generated_at: new Date().toISOString(),
    count: filtered.length,
    farms: filtered.map((stand) => ({
      id: stand.id,
      name: stand.name,
      listing_type: stand.listing_type ?? "farm_stand",
      address: stand.address,
      city: stand.city,
      state: stand.state,
      zip_code: stand.zip_code,
      latitude: stand.latitude,
      longitude: stand.longitude,
      description: stand.description,
      phone: stand.phone,
      website: stand.website,
      hours: stand.hours,
      payment_methods: stand.payment_methods,
      product_categories: stand.product_categories,
      photo_url: stand.photo_url,
      owner_managed: Boolean(
        stand.owner_user_id && stand.owner_access_activated_at,
      ),
      listing_verified: stand.is_verified,
      growing_practices: stand.growing_practices ?? [],
      inventory_updated_at:
        stand.farmer_inventory_updated_at ?? stand.inventory_updated_at,
      inventory: (stand.inventory ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        status: item.status,
        updated_at: item.updated_at,
      })),
    })),
  });
}
