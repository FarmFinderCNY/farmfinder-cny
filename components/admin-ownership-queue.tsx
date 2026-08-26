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
  const [active, setActive] = useState(false); const [claims, setClaims] = useState<Claim[]>([]); const [updates, setUpdates] = useState<Update[]>([]); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [working, setWorking] = useState("");
  const load = useCallback(async () => {
    const supabase = getBrowserSupabaseClient();
    setError("");
    try {
      const loadClaims = () => supabase.from("farm_claim_requests").select("id,farm_id,requested_by,message,status,created_at,claimant_name,claimant_email,claimant_phone,claimant_role,verification_notes,farm_stands(name,city)").eq("status", "pending").order("created_at", { ascending: false });
      let claimResult = await loadClaims();
      if (claimResult.error?.message.includes("Failed to fetch")) claimResult = await loadClaims();
      if (claimResult.error) throw claimResult.error;
      setClaims((claimResult.data ?? []) as unknown as Claim[]);

      const loadUpdates = () => supabase.from("farm_update_requests").select("id,farm_id,name,address,city,state,zip_code,description,phone,website,hours,payment_methods,status,created_at").eq("status", "pending").order("created_at", { ascending: false });
      let updateResult = await loadUpdates();
      if (updateResult.error?.message.includes("Failed to fetch")) updateResult = await loadUpdates();
      if (updateResult.error) throw updateResult.error;
      setUpdates((updateResult.data ?? []) as Update[]);
    } catch (loadError) {
      console.error("Farmer request load failed:", loadError);
      setError("Unable to load farmer requests right now. Please try Refresh.");
    }
  }, []);
  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => { if (data.session) { setActive(true); void load(); } });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { setActive(Boolean(session)); if (session && event === "SIGNED_IN") void load(); });
    return () => data.subscription.unsubscribe();
  }, [load]);
  async function decide(kind: "claim" | "update", decision: "approve" | "reject", id: string) {
    const confirmation = decision === "approve" && kind === "claim"
      ? "Approve this ownership request? The farmer will immediately be able to update this listing and its products."
      : `${decision === "approve" ? "Approve" : "Reject"} this ${kind} request?`;
    if (!window.confirm(confirmation)) return;
    setWorking(id); setError(""); setMessage("");
    const { error: rpcError } = await getBrowserSupabaseClient().rpc(`${decision}_${kind === "claim" ? "farm_claim" : "farm_update"}`, kind === "claim" ? { claim_id: id } : { request_id: id });
    if (rpcError) setError(rpcError.message); else {
      setMessage(decision === "approve" && kind === "claim"
        ? "Ownership approved. The farmer can now sign in and update products immediately."
        : `${kind === "claim" ? "Ownership" : "Listing update"} request ${decision === "approve" ? "approved" : "rejected"}.`);
      await load();
    }
    setWorking("");
  }
  if (!active) return null;
  return <section className="ownership-admin"><div className="queue-title"><div><p className="eyebrow">Ownership and updates</p><h2>Farmer requests</h2></div><button onClick={() => void load()}>Refresh</button></div>{error && <p className="form-error admin-error">{error}</p>}{message && <p className="form-success admin-review-message">{message}</p>}
   
    <h3>Ownership claims</h3>

{claims.length === 0 ? (
  <p className="portal-empty">No ownership claims are pending.</p>
) : (
  <div className="review-list">
    {claims.map((claim) => (
      <article className="review-card" key={claim.id}>
        <span className="review-badge">Claim pending</span>

        <h2>{claim.farm_stands?.name}</h2>

        {claim.farm_stands?.city && (
          <p>{claim.farm_stands.city}</p>
        )}

        <dl className="review-details">
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
        </dl>

        <div className="review-actions">
          <button
            className="reject-button"
            disabled={working === claim.id}
            onClick={() => void decide("claim", "reject", claim.id)}
          >
            Reject
          </button>

          <button
            className="approve-button"
            disabled={working === claim.id}
            onClick={() => void decide("claim", "approve", claim.id)}
          >
            Approve ownership
          </button>
        </div>
      </article>
    ))}
  </div>
)}

 <h3>Listing updates</h3>

{updates.length === 0 ? (
  <p className="portal-empty">No listing updates are pending.</p>
) : (
  <div className="submission-queue">
    {updates.map((update) => (
      <article className="review-card" key={update.id}>
        <span className="review-badge">Update pending</span>

        <h2>{update.name}</h2>

        <p>
          {update.address}, {update.city}, {update.state} {update.zip_code}
        </p>

        {update.description && (
          <p className="review-description">{update.description}</p>
        )}

        <dl className="review-details">
          {update.hours && (
            <>
              <dt>Hours</dt>
              <dd>{update.hours}</dd>
            </>
          )}

          {update.phone && (
            <>
              <dt>Phone</dt>
              <dd>{update.phone}</dd>
            </>
          )}

          {update.website && (
            <>
              <dt>Website</dt>
              <dd>{update.website}</dd>
            </>
          )}

          {update.payment_methods && (
            <>
              <dt>Payment</dt>
              <dd>{update.payment_methods}</dd>
            </>
          )}
        </dl>

        <div className="review-actions">
          <button
            className="reject-button"
            disabled={working === update.id}
            onClick={() => void decide("update", "reject", update.id)}
          >
            Reject
          </button>

          <button
            className="approve-button"
            disabled={working === update.id}
            onClick={() => void decide("update", "approve", update.id)}
          >
            Approve update
          </button>
        </div>
      </article>
    ))}
  </div>
)}     
  </section>;
}
