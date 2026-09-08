import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function listAllAuthUsers(serviceClient: SupabaseClient) {
  const users: User[] = [];
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await serviceClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { users, error };
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return { users, error: null };
}
