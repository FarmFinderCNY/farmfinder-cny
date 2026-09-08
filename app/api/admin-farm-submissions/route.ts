import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAndSendOwnerInvitation } from "@/lib/owner-access-invitation";
import { listingsMatch } from "@/lib/listing-match";
import { listAllAuthUsers } from "@/lib/supabase-admin-users";

type ReviewBody = { submissionId?: unknown; decision?: unknown; latitude?: unknown; longitude?: unknown };

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const authorization = request.headers.get("authorization");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !resendKey) return NextResponse.json({ error: "Submission review is not configured." }, { status: 503 });
  if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const body = await request.json().catch(() => null) as ReviewBody | null;
  const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
  const decision = body?.decision === "approve" || body?.decision === "reject" ? body.decision : null;
  const latitude = typeof body?.latitude === "number" ? body.latitude : Number.NaN;
  const longitude = typeof body?.longitude === "number" ? body.longitude : Number.NaN;
  if (!submissionId || !decision || (decision === "approve" && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180))) return NextResponse.json({ error: "A valid review decision and map coordinates are required." }, { status: 400 });

  const userClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data: userData } = await userClient.auth.getUser(authorization.slice("Bearer ".length));
  if (!userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admin } = await serviceClient.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const { data: submission, error: submissionError } = await serviceClient.from("farm_stand_submissions").select("id,submission_type,status,farm_name,address,city,state,zip_code,contact_email").eq("id", submissionId).maybeSingle();
  if (submissionError || !submission || submission.status !== "pending") return NextResponse.json({ error: "This submission is no longer pending." }, { status: 409 });

  const rpcName = decision === "approve" ? "approve_farm_submission" : "reject_farm_submission";
  const rpcArgs = decision === "approve" ? { submission_id: submissionId, farm_latitude: latitude, farm_longitude: longitude } : { submission_id: submissionId };
  const { error: rpcError } = await userClient.rpc(rpcName, rpcArgs);
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 500 });
  if (decision === "reject") return NextResponse.json({ completed: true, decision });
  if (submission.submission_type === "community") return NextResponse.json({ completed: true, decision, owner_connection_required: false });

  const { data: farms, error: farmError } = await serviceClient.from("farm_stands").select("id,name,address,city,state,zip_code,owner_user_id").eq("is_active", true).order("created_at", { ascending: false }).limit(500);
  const farm = farms?.find((candidate) => listingsMatch(candidate, submission));
  if (farmError || !farm) return NextResponse.json({ error: "The farm was published, but owner access is incomplete. It is now flagged in Owner Access Check." }, { status: 502 });
  if (farm.owner_user_id) return NextResponse.json({ completed: true, decision, owner_connected: true });

  const email = submission.contact_email.trim().toLowerCase();
  const { users, error: usersError } = await listAllAuthUsers(serviceClient);
  if (usersError) return NextResponse.json({ error: "The farm was published, but its owner account could not be checked. It is now flagged in Owner Access Check." }, { status: 502 });
  let owner = users.find((user) => user.email?.trim().toLowerCase() === email);
  let invitationSent = false;
  if (!owner || !owner.email_confirmed_at) {
    const invitation = await createAndSendOwnerInvitation({ serviceClient, email, farmName: farm.name, resendKey, existingUser: owner });
    if ("error" in invitation) {
      console.error("Owner access invitation failed:", invitation.detail ?? invitation.error);
      return NextResponse.json({ error: `The farm was published, but ${invitation.error.toLowerCase()} It remains flagged in Owner Access Check.` }, { status: 502 });
    }
    owner = invitation.user;
    invitationSent = true;
  }
  const { error: updateError } = await serviceClient.from("farm_stands").update({ owner_user_id: owner.id, is_verified: true }).eq("id", farm.id).is("owner_user_id", null);
  if (updateError) return NextResponse.json({ error: "The farm was published, but owner access is incomplete. It remains flagged in Owner Access Check." }, { status: 502 });
  return NextResponse.json({ completed: true, decision, owner_connected: true, invitation_sent: invitationSent });
}
