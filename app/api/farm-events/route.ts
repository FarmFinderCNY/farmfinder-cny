import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const allowedEvents = new Set(["detail_view", "directions_click", "website_click", "alert_subscription"]);

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ recorded: false }, { status: 503 });

  let body: { farmId?: unknown; eventType?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ recorded: false }, { status: 400 }); }
  const farmId = typeof body.farmId === "string" ? body.farmId : "";
  const eventType = typeof body.eventType === "string" ? body.eventType : "";
  if (!farmId || !allowedEvents.has(eventType)) return NextResponse.json({ recorded: false }, { status: 400 });

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from("farm_engagement_events").insert({ farm_id: farmId, event_type: eventType });
  return NextResponse.json({ recorded: !error });
}
