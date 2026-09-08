import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createAndSendOwnerInvitation } from "@/lib/owner-access-invitation";
import { listAllAuthUsers } from "@/lib/supabase-admin-users";

type OwnerSubmission = {
  id: string; farm_name: string; address: string; city: string; state: string;
  zip_code: string; contact_email: string; created_at: string;
};
type Farm = {
  id: string; name: string; address: string | null; city: string | null;
  state: string | null; zip_code: string | null; owner_user_id: string | null;
};

const INVITATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const invitationSentAt = (user: { user_metadata?: Record<string, unknown> } | undefined) => {
  const value = user?.user_metadata?.owner_access_invitation_sent_at;
  return typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;
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
  const resendKey = process.env.RESEND_API_KEY;
  const authorization = request.headers.get("authorization");
  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !resendKey || !authorization?.startsWith("Bearer ")) return null;
  const userClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
  const { data: userData } = await userClient.auth.getUser(authorization.slice("Bearer ".length));
  if (!userData.user) return null;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admin } = await serviceClient.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  return admin ? { serviceClient, resendKey } : null;
}

export async function GET(request: Request) {
  const clients = await getAdminClients(request);
  if (!clients) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { serviceClient } = clients;
  const [submissionResult, farmResult, userResult] = await Promise.all([
    serviceClient.from("farm_stand_submissions").select("id,farm_name,address,city,state,zip_code,contact_email,created_at").eq("submission_type", "owner").eq("status", "approved").order("created_at", { ascending: false }),
    serviceClient.from("farm_stands").select("id,name,address,city,state,zip_code,owner_user_id").eq("is_active", true),
    listAllAuthUsers(serviceClient),
  ]);
  if (submissionResult.error || farmResult.error || userResult.error) return NextResponse.json({ error: "Unable to audit owner connections." }, { status: 500 });
  const farms = (farmResult.data ?? []) as Farm[];
  const usersByEmail = new Map(userResult.users.map((user) => [user.email?.trim().toLowerCase(), user]));
  const usersById = new Map(userResult.users.map((user) => [user.id, user]));
  const seenFarmIds = new Set<string>();
  const issues = ((submissionResult.data ?? []) as OwnerSubmission[]).flatMap((submission) => {
    const farm = farms.find((candidate) => matchesSubmission(candidate, submission));
    if (!farm || seenFarmIds.has(farm.id)) return [];
    seenFarmIds.add(farm.id);
    const user = (farm.owner_user_id ? usersById.get(farm.owner_user_id) : undefined) ?? usersByEmail.get(submission.contact_email.trim().toLowerCase());
    if (farm.owner_user_id && user?.email_confirmed_at) return [];
    return [{ submission_id: submission.id, farm_id: farm.id, farm_name: farm.name, contact_email: submission.contact_email, account_exists: Boolean(user), email_confirmed: Boolean(user?.email_confirmed_at), invitation_sent_at: invitationSentAt(user) }];
  });
  return NextResponse.json({ issues });
}

export async function POST(request: Request) {
  const clients = await getAdminClients(request);
  if (!clients) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json().catch(() => null) as { submissionId?: unknown } | null;
  const submissionId = typeof body?.submissionId === "string" ? body.submissionId : "";
  if (!submissionId) return NextResponse.json({ error: "Submission is required." }, { status: 400 });
  const { serviceClient, resendKey } = clients;
  const { data: submission, error: submissionError } = await serviceClient.from("farm_stand_submissions").select("id,farm_name,address,city,state,zip_code,contact_email,created_at").eq("id", submissionId).eq("submission_type", "owner").eq("status", "approved").maybeSingle();
  if (submissionError || !submission) return NextResponse.json({ error: "Approved owner submission not found." }, { status: 404 });
  const { data: farms, error: farmError } = await serviceClient.from("farm_stands").select("id,name,address,city,state,zip_code,owner_user_id").eq("is_active", true).order("created_at", { ascending: false });
  const farm = ((farms ?? []) as Farm[]).find((candidate) => matchesSubmission(candidate, submission as OwnerSubmission));
  if (farmError || !farm) return NextResponse.json({ error: "The existing farm listing could not be matched safely." }, { status: 409 });
  const email = submission.contact_email.trim().toLowerCase();
  const { users, error: usersError } = await listAllAuthUsers(serviceClient);
  if (usersError) return NextResponse.json({ error: "The owner account could not be checked." }, { status: 502 });
  let owner = (farm.owner_user_id ? users.find((user) => user.id === farm.owner_user_id) : undefined) ?? users.find((user) => user.email?.trim().toLowerCase() === email);
  if (farm.owner_user_id && owner?.email_confirmed_at) return NextResponse.json({ connected: true, already_connected: true, farm_name: farm.name });
  const lastInvitationAt = invitationSentAt(owner);
  if (lastInvitationAt && Date.now() - Date.parse(lastInvitationAt) < INVITATION_COOLDOWN_MS) {
    return NextResponse.json({ connected: true, invitation_already_sent: true, invitation_sent_at: lastInvitationAt, farm_name: farm.name });
  }
  let invitationSent = false;
  if (!owner || !owner.email_confirmed_at) {
    const invitation = await createAndSendOwnerInvitation({ serviceClient, email, farmName: farm.name, resendKey, existingUser: owner });
    if ("error" in invitation) {
      console.error("Owner access invitation failed:", invitation.detail ?? invitation.error);
      return NextResponse.json({ error: invitation.error }, { status: 502 });
    }
    owner = invitation.user;
    invitationSent = invitation.invitationSent;
  }
  const update = serviceClient.from("farm_stands").update({ owner_user_id: owner.id, is_verified: true }).eq("id", farm.id);
  const { error: updateError } = farm.owner_user_id ? await update.eq("owner_user_id", farm.owner_user_id) : await update.is("owner_user_id", null);
  if (updateError) return NextResponse.json({ error: "The existing listing could not be connected." }, { status: 500 });
  return NextResponse.json({ connected: true, invitation_sent: invitationSent, invitation_sent_at: invitationSent ? invitationSentAt(owner) : null, farm_name: farm.name });
}
