import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type ApprovalBody = {
  submissionId?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Automatic owner access is not configured." }, { status: 503 });
  }
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: ApprovalBody;
  try {
    body = await request.json() as ApprovalBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const submissionId = typeof body.submissionId === "string" ? body.submissionId : "";
  const latitude = typeof body.latitude === "number" ? body.latitude : Number.NaN;
  const longitude = typeof body.longitude === "number" ? body.longitude : Number.NaN;
  if (!submissionId || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Approved submission and map coordinates are required." }, { status: 400 });
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
  const { data: admin } = await userClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: submission, error: submissionError } = await serviceClient
    .from("farm_stand_submissions")
    .select("id,submission_type,status,farm_name,address,city,state,zip_code,contact_email")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission || submission.status !== "approved" || submission.submission_type !== "owner") {
    return NextResponse.json({ error: "The approved owner submission could not be found." }, { status: 409 });
  }

  const { data: farm, error: farmError } = await serviceClient
    .from("farm_stands")
    .select("id,owner_user_id")
    .eq("name", submission.farm_name)
    .eq("address", submission.address)
    .eq("city", submission.city)
    .eq("state", submission.state)
    .eq("zip_code", submission.zip_code)
    .eq("latitude", latitude)
    .eq("longitude", longitude)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (farmError || !farm) {
    return NextResponse.json({ error: "The farm was published, but its new listing could not be located to connect the owner." }, { status: 409 });
  }
  if (farm.owner_user_id) {
    return NextResponse.json({ connected: true, alreadyConnected: true });
  }

  const ownerEmail = submission.contact_email.trim().toLowerCase();
  const { data: usersData, error: usersError } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) {
    return NextResponse.json({ error: "The farm was published, but the owner account could not be checked." }, { status: 502 });
  }

  let ownerUser = usersData.users.find((user) => user.email?.toLowerCase() === ownerEmail);
  let invitationSent = false;
  if (!ownerUser) {
    const { data: invitation, error: invitationError } = await serviceClient.auth.admin.inviteUserByEmail(ownerEmail, {
      redirectTo: "https://www.farmfindercny.com/farmer",
    });
    if (invitationError || !invitation.user) {
      return NextResponse.json({ error: "The farm was published, but the owner invitation could not be created." }, { status: 502 });
    }
    ownerUser = invitation.user;
    invitationSent = true;
  }

  const { error: connectionError } = await serviceClient
    .from("farm_stands")
    .update({ owner_user_id: ownerUser.id, is_verified: true })
    .eq("id", farm.id)
    .is("owner_user_id", null);

  if (connectionError) {
    return NextResponse.json({ error: "The farm was published, but owner access could not be connected." }, { status: 500 });
  }

  return NextResponse.json({ connected: true, invitationSent });
}
