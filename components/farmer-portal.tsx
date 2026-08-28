"use client";
import { FarmerInventory } from "@/components/farmer-inventory";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { FarmStand } from "@/lib/types";
import { FarmerGrowingPractices } from "@/components/farmer-growing-practices";
import { FarmerGrowthTools } from "@/components/farmer-growth-tools";

type Claim = { id: string; farm_id: string; status: string; created_at: string };

export function FarmerPortal() {
  const searchParams = useSearchParams();
  const requestedFarmId = searchParams.get("claim");
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [farms, setFarms] = useState<FarmStand[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<FarmStand | null>(null);
  const [claiming, setClaiming] = useState<FarmStand | null>(null);
  const loadPortal = useCallback(async () => {
    setLoading(true); setError("");
    const supabase = getBrowserSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const id = userData.user?.id ?? "";
    setUserId(id);
    const loadFarms = async () => {
      const result = await supabase.from("farm_stands").select("id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,is_active,created_at,growing_practices,growing_practices_note,organic_certifier");
      if (result.error?.message.match(/growing_practices|organic_certifier/)) {
        return supabase.from("farm_stands").select("id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,is_active,created_at");
      }
      return result;
    };
    const [{ data: farmData, error: farmError }, { data: claimData, error: claimError }] = await Promise.all([
      loadFarms(),
      supabase.from("farm_claim_requests").select("id,farm_id,status,created_at").order("created_at", { ascending: false }),
    ]);
    if (farmError || claimError) setError(farmError?.message ?? claimError?.message ?? "Unable to load portal.");
    setFarms((farmData ?? []) as FarmStand[]); setClaims((claimData ?? []) as Claim[]); setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      const active = Boolean(data.session); setSignedIn(active);
      if (active) void loadPortal(); else setLoading(false);
    });
  }, [loadPortal]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setMessage("");
    const values = new FormData(event.currentTarget); const email = String(values.get("email")); const password = String(values.get("password"));
    const supabase = getBrowserSupabaseClient();
    if (mode === "signup") {
      const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/farmer` } });
      if (authError) setError(authError.message);
      else if (!data.session) setMessage("Check your email to confirm your account, then return here to sign in.");
      else { setSignedIn(true); await loadPortal(); }
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError("Sign-in failed. Check your email and password."); else { setSignedIn(true); await loadPortal(); }
    }
    setLoading(false);
  }

 async function claimFarm(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!claiming) return;

  const values = new FormData(event.currentTarget);

  setLoading(true);
  setError("");

  const { error: claimError } = await getBrowserSupabaseClient()
    .from("farm_claim_requests")
    .insert({
      farm_id: claiming.id,
      claimant_name: values.get("claimant_name"),
      claimant_email: values.get("claimant_email"),
      claimant_phone: values.get("claimant_phone"),
      claimant_role: values.get("claimant_role"),
      verification_notes: values.get("verification_notes"),
      message: values.get("verification_notes"),
    });

  if (claimError) {
    setError(claimError.message);
  } else {
    setMessage("Ownership request submitted for administrator review.");
    setClaiming(null);
    await loadPortal();
  }

  setLoading(false);
}
async function requestUpdate(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!editing) return;

  const values = new FormData(event.currentTarget);

  setLoading(true);
  setError("");

  const payload = {
    farm_id: editing.id,
    name: values.get("name"),
    address: values.get("address"),
    city: values.get("city"),
    state: values.get("state"),
    zip_code: values.get("zip_code"),
    description: values.get("description"),
    phone: values.get("phone"),
    website: values.get("website"),
    hours: values.get("hours"),
    payment_methods: values.get("payment_methods"),
  };

  const { error: updateError } = await getBrowserSupabaseClient()
    .from("farm_update_requests")
    .insert(payload);

  if (updateError) {
    setError(updateError.message);
  } else {
    setMessage("Update request submitted for administrator review.");
    setEditing(null);
    await loadPortal();
  }

  setLoading(false);
}
  async function signOut() { await getBrowserSupabaseClient().auth.signOut(); setSignedIn(false); setFarms([]); }

  if (!signedIn) return <form className="admin-login farmer-login" onSubmit={authenticate}>
    <p className="eyebrow">Farmer portal</p><h1>{mode === "signin" ? "Welcome back." : "Create your account."}</h1>
    <p>{mode === "signin" ? "Sign in to claim or update your farm listing." : "Use an email address you can access. You may need to confirm it."}</p>
    <div className="farmer-login-steps" aria-label="How the farmer portal works">
      <strong>New to FarmFinder?</strong>
      <ol>
        <li>Create your free account.</li>
        <li>Request ownership of your farm or stand.</li>
        <li>After approval, update what is available anytime.</li>
      </ol>
    </div>
    <label>Email address<input type="email" name="email" required autoComplete="username" /></label>
    <label>Password<input type="password" name="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
    {error && <p className="form-error">{error}</p>}{message && <p className="form-success">{message}</p>}
    <button className="submit-button" disabled={loading}>{loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}</button>
    <button className="auth-switch" type="button" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>{mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}</button>
  </form>;

  const owned = farms.filter((farm) => farm.owner_user_id === userId);
  const claimable = farms.filter((farm) => !farm.owner_user_id && !farm.is_verified);
  const claimedIds = new Set(claims.filter((claim) => claim.status === "pending").map((claim) => claim.farm_id));

  return <section className="farmer-panel">
    <div className="admin-toolbar"><div><p className="eyebrow">Farmer portal</p><h1>Your listings</h1></div><button onClick={() => void signOut()}>Sign out</button></div>
    {error && <p className="form-error admin-error">{error}</p>}{message && <p className="form-success portal-message">{message}</p>}
    {loading ? <div className="admin-empty">Loading…</div> : <>
      <section className="portal-section">
  <h2>Farms you manage</h2>

  {owned.length === 0 ? (
    <p className="portal-empty">
      No farms are connected to this account yet.
    </p>
  ) : (
    <>
    <p className="portal-guidance">Ownership approved. You can update your products below—changes to availability appear on the public website automatically.</p>
    <div className="portal-farms">
      {owned.map((farm) => (
        <article key={farm.id}>
          <h3>{farm.name}</h3>
          <p>
            {farm.city}, {farm.state}
          </p>

          <button
            type="button"
            onClick={() => setEditing(farm)}
          >
            Request an update
          </button>

          <FarmerInventory
            farmId={farm.id}
            farmName={farm.name}
          />
          <FarmerGrowthTools farmId={farm.id} />
          {"growing_practices" in farm && <FarmerGrowingPractices
              farmId={farm.id}
              initialPractices={farm.growing_practices ?? []}
              initialNote={farm.growing_practices_note}
              initialOrganicCertifier={farm.organic_certifier}
            />}
        </article>
      ))}
    </div>
    </>
  )}
</section>
      <section className="portal-section"><h2>Claim an existing listing</h2><p>Choose only a farm you own or officially represent. Claims require administrator approval.</p><div className="portal-farms">{
        claimable
  .filter((farm) => !requestedFarmId || farm.id === requestedFarmId)
  .map((farm) => <article key={farm.id}><h3>{farm.name}</h3><p>{farm.city}, {farm.state}</p>{claimedIds.has(farm.id) && <p className="claim-pending-note">Your request is waiting for FarmFinder approval. Once approved, this farm will move to “Farms you manage” above.</p>}<button disabled={claimedIds.has(farm.id)}onClick={() => setClaiming(farm)}>{claimedIds.has(farm.id) ? "Waiting for approval" : "Request ownership"}</button></article>)}</div></section>
    </>}
    {claiming && (
  <div className="portal-modal" role="dialog" aria-modal="true">
    <form onSubmit={claimFarm}>
      <div className="modal-heading">
        <h2>Claim {claiming.name}</h2>
        <button type="button" onClick={() => setClaiming(null)}>
          Close
        </button>
      </div>

      <label>
        Your name
        <input name="claimant_name" required />
      </label>

      <label>
        Email
        <input name="claimant_email" type="email" required />
      </label>

      <label>
        Phone
        <input name="claimant_phone" type="tel" />
      </label>

      <label>
        Relationship to the farm
        <input
          name="claimant_role"
          placeholder="Owner, manager, family member..."
          required
        />
      </label>

      <input
  type="hidden"
  name="verification_notes"
  value="Applicant confirmed they own or operate this farm/stand."
/>

<p className="form-wide">
  FarmFinder CNY may contact you if additional verification is needed before
  approving access.
</p>

      <button className="submit-button" disabled={loading}>
        {loading ? "Submitting..." : "Submit ownership claim"}
      </button>
    </form>
  </div>
)}
    {editing && <div className="portal-modal" role="dialog" aria-modal="true"><form onSubmit={requestUpdate}><div className="modal-heading"><h2>Update {editing.name}</h2><button type="button" onClick={() => setEditing(null)}>×</button></div><div className="form-grid">
      <label className="form-wide">Farm name<input name="name" defaultValue={editing.name} required /></label><label className="form-wide">Address<input name="address" defaultValue={editing.address ?? ""} required /></label><label>City<input name="city" defaultValue={editing.city ?? ""} required /></label><label>State<input name="state" defaultValue={editing.state ?? "NY"} required /></label><label>ZIP<input name="zip_code" defaultValue={editing.zip_code ?? ""} required /></label><label>Phone<input name="phone" defaultValue={editing.phone ?? ""} /></label><label className="form-wide">Website<input name="website" defaultValue={editing.website ?? ""} /></label><label className="form-wide">Description<textarea name="description" defaultValue={editing.description ?? ""} rows={4} /></label><label>Hours<textarea name="hours" defaultValue={editing.hours ?? ""} rows={3} /></label><label>Payment methods<textarea name="payment_methods" defaultValue={editing.payment_methods ?? ""} rows={3} /></label>
    </div><button className="submit-button" disabled={loading}>Submit update for review</button></form></div>}
  </section>;
}
