import { savedFarmIds } from "@/lib/customer-favorites";

type Account = { id: string; created_at: string; email_confirmed_at?: string | null; user_metadata?: Record<string, unknown> };
export function summarizeAccounts(accounts: Account[], activatedOwnerIds: string[], now = Date.now()) {
  const owners = new Set(activatedOwnerIds);
  const recent = (days: number) => accounts.filter((account) => {
    const created = new Date(account.created_at).getTime();
    return Number.isFinite(created) && created <= now && now - created < days * 86400000;
  }).length;
  return {
    total: accounts.length,
    email_confirmed: accounts.filter((account) => Boolean(account.email_confirmed_at)).length,
    with_saved_farms: accounts.filter((account) => savedFarmIds(account.user_metadata).length > 0).length,
    activated_owners: accounts.filter((account) => owners.has(account.id)).length,
    new_last_7_days: recent(7),
    new_last_30_days: recent(30),
  };
}
