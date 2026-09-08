import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type SubscribeBody = { farmId?: unknown; email?: unknown; productName?: unknown };
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ error: "Alerts are not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as SubscribeBody | null;
  const farmId = typeof body?.farmId === "string" ? body.farmId : "";
  const email = typeof body?.email === "string" ? normalize(body.email) : "";
  const rawProduct = typeof body?.productName === "string" ? body.productName : "";
  const productName = rawProduct === "__farm_updates__" ? rawProduct : normalize(rawProduct);
  if (!farmId || !emailPattern.test(email) || !productName || email.length > 254 || productName.length > 120) {
    return NextResponse.json({ error: "Please check the farm, email, and product." }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: farm } = await supabase.from("farm_stands").select("id").eq("id", farmId).eq("is_active", true).maybeSingle();
  if (!farm) return NextResponse.json({ error: "This farm is not available for alerts." }, { status: 404 });

  const { data: subscriptions, error: lookupError } = await supabase
    .from("inventory_alert_subscriptions")
    .select("id,product_name")
    .eq("farm_id", farmId)
    .eq("email", email);
  if (lookupError) return NextResponse.json({ error: "The alert could not be checked." }, { status: 500 });
  const existing = (subscriptions ?? []).find((item) => normalize(item.product_name) === productName);
  if (existing) {
    const { error } = await supabase.from("inventory_alert_subscriptions").update({ active: true }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: "The alert could not be reactivated." }, { status: 500 });
    return NextResponse.json({ ok: true, reactivated: true });
  }
  if ((subscriptions ?? []).length >= 20) return NextResponse.json({ error: "This email already has many alerts for this farm." }, { status: 429 });

  const { error } = await supabase.from("inventory_alert_subscriptions").insert({ farm_id: farmId, email, product_name: productName, active: true });
  if (error?.code === "23505") return NextResponse.json({ ok: true, already_exists: true });
  if (error) return NextResponse.json({ error: "The alert could not be created." }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
