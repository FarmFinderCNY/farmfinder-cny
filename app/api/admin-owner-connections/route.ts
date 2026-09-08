import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type OwnerSubmission = {
  id: string; farm_name: string; address: string; city: string; state: string;
  zip_code: string; contact_email: string; created_at: string;
};
type Farm = {
  id: string; name: string; address: string | null; city: string | null;
  state: string | null; zip_code: string | null; owner_user_id: string | null;
};

const normalize = (value: string | null | undefined) => (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const matchesSubmission = (farm: Farm, submission: OwnerSubmission) =>
  normalize(farm.name) === normalize(submission.farm_name) &&
  normalize(farm.address) === normalize(submission.address) &&
  normalize(farm.city) === normalize(submission.city) &&
  normalize(farm.state) === normalize(submission.state) &&
  normalize(farm.zip_code) === normalize(submission.zip_code);

async function getAdminClients(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !authorization?.startsWith("Bearer ")) return null;
  const userClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data: userData } = await userClient.auth.getUser(authorization.slice("Bearer ".length));
  if (!userData.user) return null;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admin } = await serviceClient.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  return admin ? { serviceClient } : null;
}

export async function GET(request: Request) {
  const clients = await getAdminClients(request);
  if (!clients) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { serviceClient } = clients;
  const [submissionResult, farmResult, userResult] = await Promise.all([
    serviceClient.from("farm_stand_submissions").select("id,farm_name,address,city,state,zip_code,contact_email,created_at").eq("submission_type", "owner").eq("status", "approved").order("created_at", { ascending: false }),
    serviceClient.from("farm_stands").select("id,name,address,city,state,zip_code,owner_user_id").eq("is_active", true),
    serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);
  if (submissionResult.error || farmResult.error || userResult.error) return NextResponse.json({ error: "Unable to audit owner connections." }, { status: 500 });
  const farms = (farmResult.data ?? []) as Farm[];
  const usersByEmail = new Map(userResult.data.users.map((user) => [user.email?.trim().toLowerCase(), user]));
  const seenFarmIds = new Set<string>();
  const issues = ((submissionResult.data ?? []) as OwnerSubmission[]).flatMap((submission) => {
    const farm = farms.find((candidate) => matchesSubmission(candidate, submission));
    if (!farm || farm.owner_user_id || seenFarmIds.has(farm.id)) return [];
    seenFarmIds.add(farm.id);
    const user = usersByEmail.get(submission.contact_email.trim().toLowerCase());
    return [{ submission_id: submission.id, farm_id: farm.id, farm_name: farm.name, contact_email: submission.contact_email, account_exists: Boolean(user), email_confirmed: Boolean(user?.email_confirmed_at) }];
  });
  return NextResponse.json({ issues });
}

export async function POST(request: Request) {
  const clients = await getAdminClients(request);
  if (!clients) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { submissionId?: unknown } | null;
  const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
  if (!submissionId) return NextResponse.json({ error: "Submission is required." }, { status: 400 });
  const { serviceClient } = clients;
  const { data: submission, error: submissionError } = await serviceClient.from("farm_stand_submissions").select("id,farm_name,address,city,state,zip_code,contact_email,created_at").eq("id", submissionId).eq("submission_type", "owner").eq("status", "approved").maybeSingle();
  if (submissionError || !submission) return NextResponse.json({ error: "Approved owner submission not found." }, { status: 404 });
  const { data: farms, error: farmError } = await serviceClient.from("farm_stands").select("id,name,address,city,state,zip_code,owner_user_id").eq("is_active", true).order("created_at", { ascending: false });
  const farm = ((farms ?? []) as Farm[]).find((candidate) => matchesSubmission(candidate, submission as OwnerSubmission));
  if (farmError || !farm) return NextResponse.json({ error: "The existing farm listing could not be matched safely." }, { status: 409 });
  if (farm.owner_user_id) return NextResponse.json({ connected: true, already_connected: true, farm_name: farm.name });
  const email = submission.contact_email.trim().toLowerCase();
  const { data: usersData, error: usersError } = await serviceClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) return NextResponse.json({ error: "The owner account could not be checked." }, { status: 502 });
  let owner = usersData.users.find((user) => user.email?.trim().toLowerCase() === email);
  let invitationSent = false;
  if (!owner) {
    const { data: invitation, error: invitationError } = await serviceClient.auth.admin.inviteUserByEmail(email, { redirectTo: "https://www.farmfindercny.com/farmer" });
    if (invitationError || !invitation.user) return NextResponse.json({ error: "The owner invitation could not be sent." }, { status: 502 });
    owner = invitation.user;
    invitationSent = true;
  }
  const { error: updateError } = await serviceClient.from("farm_stands").update({ owner_user_id: owner.id, is_verified: true }).eq("id", farm.id).is("owner_user_id", null);
  if (updateError) return NextResponse.json({ error: "The existing listing could not be connected." }, { status: 500 });
  return NextResponse.json({ connected: true, invitation_sent: invitationSent, farm_name: farm.name });
}
