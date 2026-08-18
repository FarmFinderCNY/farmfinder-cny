"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type Claim = {
  id: string;
  farm_id: string;
  requested_by: string;
  message: string | null;
  status: string;
  created_at: string;
  claimant_name: string | null;
  claimant_email: string | null;
  claimant_phone: string | null;
  claimant_role: string | null;
  verification_notes: string | null;
  farm_stands: { name: string; city: string } | null;
};
type Update = { id: string; farm_id: string; name: string; address: string; city: string; state: string; zip_code: string; description: string | null; phone: string | null; website: string | null; hours: string | null; payment_methods: string | null; status: string; created_at: string };

export function AdminOwnershipQueue() {
  const [active, setActive] = useState(false); const [claims, setClaims] = useState<Claim[]>([]); const [updates, setUpdates] = useState<Update[]>([]); const [error, setError] = useState(""); const [working, setWorking] = useState("");
  const load = useCallback(async () => {
    const supabase = getBrowserSupabaseClient();
    const [{ data: claimData, error: claimError }, { data: updateData, error: updateError }] = await Promise.all([
      supabase.from("farm_claim_requests").select(".select("id,farm_id,requested_by,message,status,created_at,claimant_name,claimant_email,claimant_phone,claimant_role,verification_notes,farm_stands(name,city)")"),
      supabase.from("farm_update_requests").select("id,farm_id,name,address,city,state,zip_code,description,phone,website,hours,payment_methods,status,created_at").eq("status", "pending").order("created_at"),
    ]);
    if (claimError || updateError) setError(claimError?.message ?? updateError?.message ?? "Unable to load requests.");
    setClaims((claimData ?? []) as unknown as Claim[]); setUpdates((updateData ?? []) as Update[]);
  }, []);
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => { if (data.session) { setActive(true); void load(); } });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { setActive(Boolean(session)); if (session) void load(); });
    return () => data.subscription.unsubscribe();
  }, [load]);
  async function decide(kind: "claim" | "update", decision: "approve" | "reject", id: string) {
    if (!window.confirm(`${decision === "approve" ? "Approve" : "Reject"} this ${kind} request?`)) return;
    setWorking(id); setError("");
    const { error: rpcError } = await getBrowserSupabaseClient().rpc(`${decision}_${kind === "claim" ? "farm_claim" : "farm_update"}`, kind === "claim" ? { claim_id: id } : { request_id: id });
    if (rpcError) setError(rpcError.message); else await load(); setWorking("");
  }
  if (!active) return null;
  return <section className="ownership-admin"><div className="queue-title"><div><p className="eyebrow">Ownership and updates</p><h2>Farmer requests</h2></div><button onClick={() => void load()}>Refresh</button></div>{error && <p className="form-error admin-error">{error}</p>}
    <h3>Ownership claims</h3>{claims.length === 0 ? <p className="portal-empty">No ownership claims are pending.</p> : <div className="submission-queue">{claims.map((claim) => <article className="review-card" key={claim.id}><span className="pending-badge">Claim pending</span><h2>{claim.farm_stands?.name ?? "Farm listing"}</h2><p>{claim.farm_stands?.city}</p>{claim.message && <div className="review-details">
  {claim.claimant_name && (
    <>
      <dt>Name</dt>
      <dd>{claim.claimant_name}</dd>
    </>
  )}

  {claim.claimant_email && (
    <>
      <dt>Email</dt>
      <dd>{claim.claimant_email}</dd>
    </>
  )}

  {claim.claimant_phone && (
    <>
      <dt>Phone</dt>
      <dd>{claim.claimant_phone}</dd>
    </>
  )}

  {claim.claimant_role && (
    <>
      <dt>Relationship</dt>
      <dd>{claim.claimant_role}</dd>
    </>
  )}

  {claim.verification_notes && (
    <>
      <dt>Verification details</dt>
      <dd>{claim.verification_notes}</dd>
    </>
  )}

  <dt>Account ID</dt>
  <dd>{claim.requested_by}</dd>
</div><div className="review-actions"><button className="reject-button" disabled={working === claim.id} onClick={() => void decide("claim", "reject", claim.id)}>Reject</button><button className="approve-button" disabled={working === claim.id} onClick={() => void decide("claim", "approve", claim.id)}>Approve ownership</button></div></article>)}</div>}
    <h3>Listing updates</h3>{updates.length === 0 ? <p className="portal-empty">No listing updates are pending.</p> : <div className="submission-queue">{updates.map((update) => <article className="review-card" key={update.id}><span className="pending-badge">Update pending</span><h2>{update.name}</h2><p>{update.address}, {update.city}, {update.state} {update.zip_code}</p>{update.description && <p className="review-description">{update.description}</p>}<dl className="review-details">{update.hours && <><dt>Hours</dt><dd>{update.hours}</dd></>}{update.phone && <><dt>Phone</dt><dd>{update.phone}</dd></>}{update.website && <><dt>Website</dt><dd>{update.website}</dd></>}</dl><div className="review-actions"><button className="reject-button" disabled={working === update.id} onClick={() => void decide("update", "reject", update.id)}>Reject</button><button className="approve-button" disabled={working === update.id} onClick={() => void decide("update", "approve", update.id)}>Approve changes</button></div></article>)}</div>}
  </section>;
}
