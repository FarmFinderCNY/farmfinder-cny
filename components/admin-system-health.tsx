"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type HealthCheck = { key: string; label: string; status: "healthy" | "warning" | "error"; detail: string };

export function AdminSystemHealth() {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [overall, setOverall] = useState<"healthy" | "warning" | "error" | null>(null);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const { data } = await getBrowserSupabaseClient().auth.getSession();
    if (!data.session) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin-system-health", { headers: { Authorization: `Bearer ${data.session.access_token}` }, cache: "no-store" });
      const result = await response.json() as { checks?: HealthCheck[]; overall?: "healthy" | "warning" | "error"; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to run the system check.");
      setChecks(result.checks ?? []); setOverall(result.overall ?? null);
    } catch (healthError) { setError(healthError instanceof Error ? healthError.message : "Unable to run the system check."); }
    finally { setLoading(false); }
  }, []);
  async function removeDuplicateProducts() {
    setCleaning(true); setError(""); setMessage("");
    try {
      const supabase = getBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in again before cleaning inventory.");
      const response = await fetch("/api/admin-inventory-cleanup", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json() as { removed?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to remove duplicate products.");
      setMessage(result.removed ? `${result.removed} older duplicate product record${result.removed === 1 ? "" : "s"} removed.` : "No duplicate product records remain.");
      await load();
    } catch (cleanupError) { setError(cleanupError instanceof Error ? cleanupError.message : "Unable to remove duplicate products."); }
    finally { setCleaning(false); }
  }
  useEffect(() => { const supabase = getBrowserSupabaseClient(); void load(); const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (session) window.setTimeout(() => void load(), 0); else { setChecks([]); setOverall(null); } }); return () => data.subscription.unsubscribe(); }, [load]);
  if (!loading && !overall && !error) return null;
  return <section className="admin-analytics system-health"><div className="admin-analytics-heading"><div><p className="eyebrow">Prevent problems early</p><h2>System health</h2><p>Checks the core services and data that farmers and customers depend on.</p></div><button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Checking…" : "Run check"}</button></div>{overall && <p className={`health-overall ${overall}`}>{overall === "healthy" ? "✓ Everything checked is healthy" : overall === "warning" ? "! Some records need attention" : "× A core feature needs attention"}</p>}{error && <p className="form-error admin-error">{error}</p>}{message && <p className="form-success portal-message">{message}</p>}<div className="health-check-list">{checks.map((check) => <article key={check.key} className={`health-check ${check.status}`}><span>{check.status === "healthy" ? "✓" : check.status === "warning" ? "!" : "×"}</span><div><strong>{check.label}</strong><p>{check.detail}</p>{check.key === "duplicate-products" && check.status === "warning" && <button type="button" className="text-button" disabled={cleaning} onClick={() => void removeDuplicateProducts()}>{cleaning ? "Removing older copies…" : "Remove older duplicates"}</button>}</div></article>)}</div></section>;
}
