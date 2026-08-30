import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const allowed = new Set([
  "page_view", "product_search", "farm_detail_view", "directions_click",
  "add_farm_start", "add_farm_submit", "farmer_inventory_update",
]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!allowed.has(body.eventName)) return NextResponse.json({ ok: false }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.json({ ok: false }, { status: 503 });

    const supabase = createClient(url, key);
    const { error } = await supabase.from("analytics_events").insert({
      event_name: body.eventName,
      session_id: typeof body.sessionId === "string" ? body.sessionId.slice(0, 100) : null,
      farm_id: body.farmId || null,
      product_query: typeof body.productQuery === "string" ? body.productQuery.slice(0, 150) : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    });
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
