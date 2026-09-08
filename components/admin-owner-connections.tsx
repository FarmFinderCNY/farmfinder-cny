"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type Issue = { submission_id: string; farm_id: string; farm_name: string; contact_email: string; account_exists: boolean; email_confirmed: boolean; invitation_sent_at: string | null };
type OwnerSummary = { activated: number; awaiting_activation: number; updating_products: number; activated_without_updates: number };

export function AdminOwnerConnections() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState<OwnerSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    const { data } = await getBrowserSupabaseClient().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin-owner-connections", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const result = await response.json() as { issues?: Issue[]; summary?: OwnerSummary; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to audit owner connections.");
      setIssues(result.issues ?? []);
      setSummary(result.summary ?? null);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to audit owner connections."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const supabase = getBrowserSupabaseClient(); void load(); const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (session) window.setTimeout(() => void load(), 0); else setIssues([]); }); return () => data.subscription.unsubscribe(); }, [load]);
  async function repair(issue: Issue) {
    if (!window.confirm(`Repair owner access for ${issue.farm_name} using ${issue.contact_email}?`)) return;
    const { data } = await getBrowserSupabaseClient().auth.getSession();
    setWorkingId(issue.submission_id); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin-owner-connections", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` }, body: JSON.stringify({ submissionId: issue.submission_id }) });
      const result = await response.json() as { error?: string; invitation_sent?: boolean; invitation_already_sent?: boolean; invitation_sent_at?: string | null; farm_name?: string };
      if (!response.ok) throw new Error(result.error ?? "Owner access could not be repaired.");
      setMessage(result.invitation_already_sent
        ? `${result.farm_name ?? issue.farm_name} already received an invitation. Another email was not sent.`
        : `${result.farm_name ?? issue.farm_name} is now owner managed.${result.invitation_sent ? " An access invitation was emailed to the farmer." : " Their existing account was connected."}`);
      await load();
    } catch (repairError) { setError(repairError instanceof Error ? repairError.message : "Owner access could not be repaired."); }
    finally { setWorkingId(null); }
  }
  if (!loading && issues.length === 0 && !message && !error) return null;
  return <section className="admin-analytics owner-connection-audit"><div className="admin-analytics-heading"><div><p className="eyebrow">Owner access check</p><h2>Farmer activation</h2><p>See who activated access and whether activated farmers have started updating products.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Checking…" : "Check again"}</button></div>{summary && <div className="admin-analytics-grid"><article><strong>{summary.activated}</strong><span>Activated owners</span></article><article><strong>{summary.awaiting_activation}</strong><span>Awaiting activation</span></article><article><strong>{summary.updating_products}</strong><span>Updating products</span></article><article><strong>{summary.activated_without_updates}</strong><span>Activated, no update yet</span></article></div>}{error && <p className="form-error admin-error">{error}</p>}{message && <p className="form-success portal-message">{message}</p>}{issues.map((issue) => {
    const invitationSent = Boolean(issue.invitation_sent_at);
    return <article className="review-card" key={issue.farm_id}><div className="review-heading"><div><span className="pending-badge">{invitationSent ? "Invitation sent" : "Connection missing"}</span><h2>{issue.farm_name}</h2><p>{issue.contact_email}</p></div></div><p className="review-note">{invitationSent ? "Invitation sent—awaiting owner activation. No additional invitation will be sent automatically." : issue.account_exists ? issue.email_confirmed ? "A confirmed account exists and can be connected." : "An invited account exists and can be connected." : "No account exists yet; repairing will send an invitation."}</p><div className="review-actions"><button className="approve-button" type="button" disabled={invitationSent || workingId === issue.submission_id} onClick={() => void repair(issue)}>{workingId === issue.submission_id ? "Repairing…" : invitationSent ? "Awaiting owner" : "Repair owner access"}</button></div></article>;
  })}</section>;
}
