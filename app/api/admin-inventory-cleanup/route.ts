import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization");

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Inventory cleanup is not configured." }, { status: 503 });
  }
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const accessToken = authorization.slice("Bearer ".length);
  const userClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData } = await userClient.auth.getUser(accessToken);
  if (!userData.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: admin } = await serviceClient.from("admin_users").select("user_id").eq("user_id", userData.user.id).maybeSingle();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const { data: items, error: loadError } = await serviceClient
    .from("farm_inventory")
    .select("id,farm_id,name,updated_at,sort_order");
  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });

  const groups = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const key = `${item.farm_id}|${normalize(item.name)}`;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  const duplicateIds = Array.from(groups.values()).flatMap((group) =>
    group
      .sort((left, right) => {
        const updatedDifference = new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
        if (updatedDifference !== 0) return updatedDifference;
        return (left.sort_order ?? Number.MAX_SAFE_INTEGER) - (right.sort_order ?? Number.MAX_SAFE_INTEGER);
      })
      .slice(1)
      .map((item) => item.id),
  );

  if (duplicateIds.length === 0) return NextResponse.json({ removed: 0 });
  const { error: deleteError } = await serviceClient.from("farm_inventory").delete().in("id", duplicateIds);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ removed: duplicateIds.length });
}
