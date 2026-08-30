import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Admin analytics is not configured." }, { status: 503 });
  }
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
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
  const { data: admin } = await serviceClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const analyticsCount = (eventName: string) => serviceClient
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("event_name", eventName)
    .gte("created_at", since);
  const engagementCount = (eventType: string) => serviceClient
    .from("farm_engagement_events")
    .select("id", { count: "exact", head: true })
    .eq("event_type", eventType)
    .gte("created_at", since);

  const [
    pageViews, pageSessions, searches, cardFarmViews, cardDirections,
    detailViews, detailDirections, websiteClicks, alerts,
    addStarts, addSubmits, inventoryUpdates, submissions, pendingSubmissions,
  ] = await Promise.all([
    analyticsCount("page_view"),
    serviceClient.from("analytics_events").select("session_id").eq("event_name", "page_view").gte("created_at", since).not("session_id", "is", null),
    analyticsCount("product_search"),
    analyticsCount("farm_detail_view"),
    analyticsCount("directions_click"),
    engagementCount("detail_view"),
    engagementCount("directions_click"),
    engagementCount("website_click"),
    engagementCount("alert_subscription"),
    analyticsCount("add_farm_start"),
    analyticsCount("add_farm_submit"),
    analyticsCount("farmer_inventory_update"),
    serviceClient.from("farm_stand_submissions").select("id", { count: "exact", head: true }),
    serviceClient.from("farm_stand_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const errors = [
    pageViews.error, pageSessions.error, searches.error, cardFarmViews.error, cardDirections.error,
    detailViews.error, detailDirections.error, websiteClicks.error, alerts.error,
    addStarts.error, addSubmits.error, inventoryUpdates.error, submissions.error, pendingSubmissions.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    return NextResponse.json({ error: "Unable to load activity totals." }, { status: 500 });
  }

  const uniqueVisitors = new Set((pageSessions.data ?? []).map((row) => row.session_id).filter(Boolean)).size;

  return NextResponse.json({
    periodDays: 30,
    updatedAt: new Date().toISOString(),
    metrics: {
      pageViews: pageViews.count ?? 0,
      visitorSessions: uniqueVisitors,
      productSearches: searches.count ?? 0,
      farmViews: Math.max(cardFarmViews.count ?? 0, detailViews.count ?? 0),
      directions: (cardDirections.count ?? 0) + (detailDirections.count ?? 0),
      websiteClicks: websiteClicks.count ?? 0,
      productAlerts: alerts.count ?? 0,
      addFarmStarts: addStarts.count ?? 0,
      addFarmSubmits: addSubmits.count ?? 0,
      inventoryUpdates: inventoryUpdates.count ?? 0,
      totalSubmissions: submissions.count ?? 0,
      pendingSubmissions: pendingSubmissions.count ?? 0,
    },
  });
}
