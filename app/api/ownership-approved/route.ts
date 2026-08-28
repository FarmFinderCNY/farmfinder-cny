import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !resendKey) {
    return NextResponse.json({ error: "Approval email delivery is not configured." }, { status: 503 });
  }
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let claimId = "";
  try {
    const body = await request.json() as { claimId?: unknown };
    claimId = typeof body.claimId === "string" ? body.claimId : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!claimId) return NextResponse.json({ error: "Claim is required." }, { status: 400 });

  const accessToken = authorization.slice("Bearer ".length);
  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  const { data: admin } = await userClient.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: claim } = await serviceClient
    .from("farm_claim_requests")
    .select("id,farm_id,status,claimant_name,claimant_email,farm_stands(name)")
    .eq("id", claimId)
    .maybeSingle();

  const farmRelation = claim?.farm_stands as unknown as { name?: string } | Array<{ name?: string }> | null;
  const farmName = Array.isArray(farmRelation) ? farmRelation[0]?.name : farmRelation?.name;
  if (!claim || claim.status !== "approved" || !claim.claimant_email || !farmName) {
    return NextResponse.json({ error: "Approved ownership information was not found." }, { status: 409 });
  }

  const safeFarmName = escapeHtml(farmName);
  const safeName = escapeHtml(claim.claimant_name?.trim() || "there");
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `ownership-approved-${claim.id}`,
    },
    body: JSON.stringify({
      from: "FarmFinder CNY <notifications@send.farmfindercny.com>",
      to: [claim.claimant_email],
      subject: `You’re approved to manage ${farmName} on FarmFinder CNY`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123f2d;line-height:1.6"><p style="font-weight:700;text-transform:uppercase;letter-spacing:.08em">FarmFinder CNY</p><h1>Welcome, ${safeName}!</h1><p>Thank you for helping customers find fresh local food. Your ownership of <strong>${safeFarmName}</strong> has been approved.</p><h2 style="font-size:20px">Get the most from your listing</h2><ol><li><strong>Sign in</strong> to the Farmer Portal.</li><li><strong>Add products</strong> and mark them available, low stock, coming soon, or sold out.</li><li><strong>Include price or quantity</strong> when helpful.</li><li><strong>Confirm your listing is accurate</strong> regularly so customers know it is worth the trip.</li><li><strong>Add growing practices</strong> honestly and turn on update reminders if you want them.</li></ol><p>Your fresh availability appears on FarmFinder for seven days after each confirmation or update.</p><p><a href="https://www.farmfindercny.com/farmer" style="display:inline-block;padding:12px 18px;background:#123f2d;color:white;text-decoration:none;border-radius:6px;font-weight:700">Manage ${safeFarmName}</a></p><p style="color:#68756c;font-size:13px">Questions? Reply to this email or use the Contact Ronald link on FarmFinder CNY.</p></div>`,
    }),
  });

  if (!emailResponse.ok) {
    console.error("Ownership approval email failed:", emailResponse.status, await emailResponse.text());
    return NextResponse.json({ error: "Ownership was approved, but the welcome email could not be sent." }, { status: 502 });
  }

  return NextResponse.json({ sent: true });
}
