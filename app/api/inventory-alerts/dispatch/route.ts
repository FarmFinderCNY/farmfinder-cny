import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type DispatchPayload = { farmId?: unknown; inventoryItemId?: unknown };
type AlertSubscription = { id: string; email: string; product_name: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

function normalizeProduct(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !resendKey) {
    console.error("Inventory alert delivery is missing required environment settings.");
    return NextResponse.json({ error: "Alert delivery is not configured." }, { status: 503 });
  }
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let payload: DispatchPayload;
  try {
    payload = await request.json() as DispatchPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const farmId = typeof payload.farmId === "string" ? payload.farmId : "";
  const inventoryItemId = typeof payload.inventoryItemId === "string" ? payload.inventoryItemId : "";
  if (!farmId || !inventoryItemId) {
    return NextResponse.json({ error: "Farm and product are required." }, { status: 400 });
  }

  const accessToken = authorization.slice("Bearer ".length);
  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const [{ data: farm }, { data: item }] = await Promise.all([
    serviceClient.from("farm_stands").select("id,name,owner_user_id").eq("id", farmId).maybeSingle(),
    serviceClient.from("farm_inventory").select("id,name,price,quantity,status").eq("id", inventoryItemId).eq("farm_id", farmId).maybeSingle(),
  ]);

  if (!farm || farm.owner_user_id !== userData.user.id) {
    return NextResponse.json({ error: "You do not manage this farm." }, { status: 403 });
  }
  if (!item || (item.status !== "available" && item.status !== "low")) {
    return NextResponse.json({ sent: 0 });
  }

  const { data: subscriptions, error: subscriptionError } = await serviceClient
    .from("inventory_alert_subscriptions")
    .select("id,email,product_name")
    .eq("farm_id", farmId)
    .eq("active", true);
  if (subscriptionError) {
    console.error("Unable to load inventory alerts:", subscriptionError.message);
    return NextResponse.json({ error: "Unable to check alerts." }, { status: 500 });
  }

  const itemName = normalizeProduct(item.name);
  const matches = ((subscriptions ?? []) as AlertSubscription[]).filter((subscription) => {
    const requestedProduct = normalizeProduct(subscription.product_name);
    return requestedProduct && (itemName.includes(requestedProduct) || requestedProduct.includes(itemName));
  });

  let sent = 0;
  for (const subscription of matches) {
    const details = [item.quantity, item.price].filter(Boolean).map((value) => escapeHtml(String(value))).join(" · ");
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "FarmFinder CNY <notifications@send.farmfindercny.com>",
        to: [subscription.email],
        subject: `${item.name} is available at ${farm.name}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123f2d"><p style="font-weight:700;text-transform:uppercase;letter-spacing:.08em">FarmFinder CNY</p><h1>${escapeHtml(item.name)} is available</h1><h2>${escapeHtml(farm.name)}</h2>${details ? `<p>${details}</p>` : ""}<p><a href="https://www.farmfindercny.com/farms/${encodeURIComponent(farmId)}" style="display:inline-block;padding:12px 18px;background:#123f2d;color:white;text-decoration:none;border-radius:6px">View farm details</a></p><p style="color:#68756c;font-size:13px">This was a one-time alert and has now been completed.</p></div>`,
      }),
    });
    if (!emailResponse.ok) {
      console.error("Inventory alert email failed:", await emailResponse.text());
      continue;
    }
    await serviceClient.from("inventory_alert_subscriptions").update({ active: false }).eq("id", subscription.id);
    sent += 1;
  }

  return NextResponse.json({ sent });
}
