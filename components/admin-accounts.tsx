"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type Summary = { total: number; email_confirmed: number; with_saved_farms: number; activated_owners: number; new_last_7_days: number; new_last_30_days: number };

export function AdminAccounts() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [checkedAt, setCheckedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++generation.current;
    setLoading(true); setError(""); setSummary(null);
    try {
      const { data } = await getBrowserSupabaseClient().auth.getSession();
      if (!data.session) return;
      const response = await fetch("/api/admin-accounts", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
      if (requestId !== generation.current) return;
      if (response.status === 403) return;
      const result = await response.json() as { summary?: Summary; checked_at?: string; error?: string };
      if (requestId !== generation.current) return;
      if (!response.ok || !result.summary) throw new Error(result.error ?? "Account counts could not be loaded.");
      setSummary(result.summary); setCheckedAt(result.checked_at ?? "");
    } catch (err) {
      if (requestId === generation.current) setError(err instanceof Error ? err.message : "Account counts could not be loaded.");
    } finally {
      if (requestId === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const client = getBrowserSupabaseClient();
    void load();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      generation.current += 1;
      setSummary(null); setCheckedAt(""); setError(""); setLoading(false);
      if (session) window.setTimeout(() => void load(), 0);
    });
    return () => { generation.current += 1; data.subscription.unsubscribe(); };
  }, [load]);

  if (!summary && !error) return null;
  const cards = summary ? [
    [summary.total, "Total accounts"], [summary.email_confirmed, "Email-confirmed accounts"],
    [summary.with_saved_farms, "Accounts with saved farms"], [summary.activated_owners, "Activated farm owners"],
    [summary.new_last_7_days, "New accounts · last 7 days"], [summary.new_last_30_days, "New accounts · last 30 days"],
  ] : [];
  return <section className="admin-analytics" aria-label="Account counts">
    <div className="admin-analytics-heading"><div><p className="eyebrow">Participation</p><h2>Accounts</h2><p>FarmFinder sign-ins and use of My Farms.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Checking…" : "Refresh accounts"}</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {summary && <><div className="admin-analytics-grid">{cards.map(([value, label]) => <article key={label}><strong>{Number(value).toLocaleString()}</strong><span>{label}</span></article>)}</div><p className="customer-note">Total includes owner invitations and accounts awaiting email confirmation. Farmers can also save favorites, so the groups overlap. Email-only farm followers are not counted as accounts.</p>{checkedAt && <p className="customer-note">Checked {new Date(checkedAt).toLocaleString()}</p>}</>}
  </section>;
}
