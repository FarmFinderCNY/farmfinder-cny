import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { listAllAuthUsers } from "@/lib/supabase-admin-users";
import { summarizeAccounts } from "@/lib/account-summary";

export const dynamic = "force-dynamic";
const response = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return response({ error: "Authentication required." }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !serviceKey) return response({ error: "Account counts are temporarily unavailable." }, 503);
  try {
    const userClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error: authError } = await userClient.auth.getUser(authorization.slice(7));
    if (authError || !data.user) return response({ error: "Authentication required." }, 401);
    const serviceClient = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: admin, error: adminError } = await serviceClient.from("admin_users").select("user_id").eq("user_id", data.user.id).maybeSingle();
    if (adminError) return response({ error: "Administrator access could not be checked." }, 503);
    if (!admin) return response({ error: "Administrator access required." }, 403);

    const { users, error } = await listAllAuthUsers(serviceClient);
    if (error || users.length >= 100000) return response({ error: "A complete account count could not be loaded. Please try again." }, 503);
    const owners: string[] = [];
    for (let page = 0; page < 100; page += 1) {
      const result = await serviceClient.from("farm_stands").select("id,owner_user_id")
        .not("owner_user_id", "is", null).not("owner_access_activated_at", "is", null)
        .order("id", { ascending: true }).range(page * 1000, page * 1000 + 999);
      if (result.error) return response({ error: "Farmer activation counts could not be loaded." }, 503);
      owners.push(...(result.data ?? []).map((farm) => farm.owner_user_id as string));
      if ((result.data ?? []).length < 1000) break;
      if (page === 99) return response({ error: "A complete farmer count could not be loaded." }, 503);
    }
    return response({ summary: summarizeAccounts(users, owners), checked_at: new Date().toISOString() });
  } catch {
    return response({ error: "Account counts could not be loaded. Please try again." }, 503);
  }
}
