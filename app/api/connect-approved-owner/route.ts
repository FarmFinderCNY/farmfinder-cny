import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

  const accessToken = authorization.slice("Bearer ".length);
  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(accessToken);
  const user = userData.user;
  if (userError || !user?.email || !user.email_confirmed_at) {
    return NextResponse.json({ error: "A confirmed account is required." }, { status: 401 });
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: submissions, error: submissionError } = await serviceClient
    .from("farm_stand_submissions")
    .select("id,farm_name,address,city,state,zip_code,contact_email")
    .eq("submission_type", "owner")
    .eq("status", "approved");

  if (submissionError) {
    return NextResponse.json({ error: "Approved ownership could not be checked." }, { status: 500 });
  }

  let connected = 0;
  const approvedForUser = (submissions ?? []).filter(
    (submission) => submission.contact_email.trim().toLowerCase() === user.email?.trim().toLowerCase(),
  );
  for (const submission of approvedForUser) {
    const { data: farms, error: farmError } = await serviceClient
      .from("farm_stands")
      .select("id")
      .eq("name", submission.farm_name)
      .eq("address", submission.address)
      .eq("city", submission.city)
      .eq("state", submission.state)
      .eq("zip_code", submission.zip_code)
      .is("owner_user_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (farmError) {
      console.error("Approved owner farm lookup failed:", farmError.message);
      continue;
    }
    const farm = farms?.[0];
    if (!farm) continue;

    const { error: updateError } = await serviceClient
      .from("farm_stands")
      .update({ owner_user_id: user.id, is_verified: true })
      .eq("id", farm.id)
      .is("owner_user_id", null);
    if (!updateError) connected += 1;
  }

  return NextResponse.json({ connected });
}
