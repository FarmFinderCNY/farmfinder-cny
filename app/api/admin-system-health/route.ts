import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type HealthCheck = { key: string; label: string; status: "healthy" | "warning" | "error"; detail: string };
const normalize = (value: string | null) => (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) return NextResponse.json({ error: "System health is not configured." }, { status: 503 });
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const userClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data: userData } = await userClient.auth.getUser(authorization.slice("Bearer ".length));
  if (!userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const publicClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admin } = await serviceClient.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const [farms, inventory, subscriptions, submissions, claims, updates, publicFarms, publicPending] = await Promise.all([
    serviceClient.from("farm_stands").select("id,name,address,city,latitude,longitude,owner_user_id,owner_access_activated_at,farmer_inventory_updated_at,is_active"),
    serviceClient.from("farm_inventory").select("id,farm_id,status,updated_at").limit(1),
    serviceClient.from("inventory_alert_subscriptions").select("id,farm_id,active").limit(1),
    serviceClient.from("farm_stand_submissions").select("id,status,submission_type").limit(1),
    serviceClient.from("farm_claim_requests").select("id,status,requested_by,farm_id").limit(1),
    serviceClient.from("farm_update_requests").select("id,status,requested_by,farm_id").limit(1),
    publicClient.from("farm_stands").select("id,name,address,city,state,zip_code").eq("is_active", true).limit(1),
    publicClient.from("farm_stand_submissions").select("id,submission_type,farm_name,address,city,state,zip_code").eq("status", "pending").limit(1),
  ]);

  const checks: HealthCheck[] = [];
  const databaseResults = [farms, inventory, subscriptions, submissions, claims, updates];
  const databaseError = databaseResults.find((result) => result.error)?.error;
  checks.push(databaseError ? { key: "database", label: "Core database structure", status: "error", detail: databaseError.message } : { key: "database", label: "Core database structure", status: "healthy", detail: "Required owner, inventory, alert, submission, claim, and update fields are available." });

  const publicSubmissionReadError = publicFarms.error ?? publicPending.error;
  checks.push(publicSubmissionReadError
    ? { key: "public-submissions", label: "Public farm submission path", status: "error", detail: `The public submission API cannot perform its required pre-submit checks: ${publicSubmissionReadError.message}` }
    : { key: "public-submissions", label: "Public farm submission path", status: "healthy", detail: "The public API can read the active listings and pending submissions required before accepting a farm submission." });

  checks.push(process.env.RESEND_API_KEY ? { key: "email", label: "Email delivery configuration", status: "healthy", detail: "The server email connection is configured." } : { key: "email", label: "Email delivery configuration", status: "error", detail: "RESEND_API_KEY is missing." });

  const activeFarms = (farms.data ?? []).filter((farm) => farm.is_active);
  const missingCoordinates = activeFarms.filter((farm) => farm.latitude === null || farm.longitude === null || !Number.isFinite(Number(farm.latitude)) || !Number.isFinite(Number(farm.longitude)));
  checks.push(missingCoordinates.length ? { key: "coordinates", label: "Active farm map locations", status: "warning", detail: `${missingCoordinates.length} active farm${missingCoordinates.length === 1 ? " is" : "s are"} missing valid coordinates.` } : { key: "coordinates", label: "Active farm map locations", status: "healthy", detail: "Every active farm has valid map coordinates." });

  const groups = new Map<string, number>();
  for (const farm of activeFarms) { const key = [normalize(farm.name), normalize(farm.address), normalize(farm.city)].join("|"); if (key !== "||") groups.set(key, (groups.get(key) ?? 0) + 1); }
  const duplicateGroups = Array.from(groups.values()).filter((count) => count > 1).length;
  checks.push(duplicateGroups ? { key: "duplicates", label: "Duplicate active listings", status: "warning", detail: `${duplicateGroups} possible duplicate group${duplicateGroups === 1 ? "" : "s"} found by name and address.` } : { key: "duplicates", label: "Duplicate active listings", status: "healthy", detail: "No duplicate active farms were found by name and address." });

  const overall = checks.some((check) => check.status === "error") ? "error" : checks.some((check) => check.status === "warning") ? "warning" : "healthy";
  return NextResponse.json({ overall, checked_at: new Date().toISOString(), checks });
}
