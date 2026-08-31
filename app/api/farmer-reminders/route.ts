import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type Reminder = { id: string; farm_id: string; email: string; interval_days: number; last_sent_at: string | null };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const cronSecret = process.env.CRON_SECRET;
  if (!supabaseUrl || !serviceKey || !resendKey || !cronSecret) return NextResponse.json({ error: "Reminder delivery is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await supabase.from("farmer_update_reminders").select("id,farm_id,email,interval_days,last_sent_at").eq("active", true);
  let sent = 0;
  for (const reminder of (data ?? []) as Reminder[]) {
    const { data: farm } = await supabase.from("farm_stands").select("name,farmer_inventory_updated_at").eq("id", reminder.farm_id).maybeSingle();
    if (!farm) continue;
    const baseline = Math.max(new Date(farm.farmer_inventory_updated_at ?? 0).getTime(), new Date(reminder.last_sent_at ?? 0).getTime());
    if (Date.now() - baseline < reminder.interval_days * 24 * 60 * 60 * 1000) continue;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "FarmFinder CNY <notifications@send.farmfindercny.com>",
        to: [reminder.email],
        subject: `Is ${farm.name}'s availability still accurate?`,
        html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123f2d;line-height:1.55"><p style="font-weight:700;text-transform:uppercase;letter-spacing:.08em">FarmFinder CNY</p><h1>A 30-second freshness check</h1><p>Is everything currently shown for <strong>${escapeHtml(farm.name)}</strong> still accurate?</p><p><a href="https://www.farmfindercny.com/farmer" style="display:inline-block;margin:4px 8px 8px 0;padding:12px 18px;background:#123f2d;color:white;text-decoration:none;border-radius:6px;font-weight:700">✓ Everything is still accurate</a><a href="https://www.farmfindercny.com/farmer" style="display:inline-block;margin:4px 0 8px;padding:12px 18px;border:1px solid #123f2d;color:#123f2d;text-decoration:none;border-radius:6px;font-weight:700">Update my products</a></p><p>After you confirm or update, customers will see your availability as current for the next seven days.</p><p style="color:#68756c;font-size:13px">Keeping this current helps customers know what is worth the trip. You control reminder frequency inside the Farmer Portal.</p></div>`,
      }),
    });
    if (!response.ok) continue;
    await supabase.from("farmer_update_reminders").update({ last_sent_at: new Date().toISOString() }).eq("id", reminder.id);
    sent += 1;
  }
  return NextResponse.json({ sent });
}
