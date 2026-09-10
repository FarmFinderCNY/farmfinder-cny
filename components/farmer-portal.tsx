"use client";
import { FarmerInventory } from "@/components/farmer-inventory";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { FarmStand } from "@/lib/types";
import { FarmerGrowingPractices } from "@/components/farmer-growing-practices";
import { FarmerGrowthTools } from "@/components/farmer-growth-tools";

type Claim = {
  id: string;
  farm_id: string;
  status: string;
  created_at: string;
};
export function FarmerPortal() {
  const searchParams = useSearchParams(),
    requestedFarmId = searchParams.get("claim"),
    quickConfirmFarmId = searchParams.get("confirm");
  const [signedIn, setSignedIn] = useState(false),
    [mode, setMode] = useState<"signin" | "signup">("signin"),
    [farms, setFarms] = useState<FarmStand[]>([]),
    [claims, setClaims] = useState<Claim[]>([]),
    [userId, setUserId] = useState(""),
    [userEmail, setUserEmail] = useState(""),
    [loading, setLoading] = useState(true),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [editing, setEditing] = useState<FarmStand | null>(null),
    [claiming, setClaiming] = useState<FarmStand | null>(null),
    [quickConfirmationHandled, setQuickConfirmationHandled] = useState(false),
    [loginEmail, setLoginEmail] = useState("");
  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError("");
    const s = getBrowserSupabaseClient(),
      { data: u } = await s.auth.getUser(),
      id = u.user?.id ?? "";
    setUserId(id);
    setUserEmail(u.user?.email ?? "");
    const { data: ss } = await s.auth.getSession();
    if (ss.session?.access_token)
      try {
        const connectionResponse = await fetch("/api/connect-approved-owner", {
          method: "POST",
          headers: { Authorization: `Bearer ${ss.session.access_token}` },
        });
        if (!connectionResponse.ok) {
          const result = (await connectionResponse.json().catch(() => null)) as
            | { error?: string }
            | null;
          setError(
            result?.error ??
              "Your account is signed in, but FarmFinder could not connect your approved listing. Please contact FarmFinder CNY.",
          );
        }
      } catch (e) {
        console.error(e);
        setError(
          "Your account is signed in, but the approved listing connection could not be checked. Please refresh once.",
        );
      }
    const loadFarms = async () => {
      const r = await s
        .from("farm_stands")
        .select(
          "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,is_active,created_at,growing_practices,growing_practices_note,organic_certifier",
        );
      return r.error?.message.match(/growing_practices|organic_certifier/)
        ? s
            .from("farm_stands")
            .select(
              "id,owner_user_id,name,address,city,state,zip_code,latitude,longitude,description,phone,website,hours,payment_methods,product_categories,photo_url,is_verified,is_active,created_at",
            )
        : r;
    };
    const [
      { data: farmData, error: farmError },
      { data: claimData, error: claimError },
    ] = await Promise.all([
      loadFarms(),
      s
        .from("farm_claim_requests")
        .select("id,farm_id,status,created_at")
        .order("created_at", { ascending: false }),
    ]);
    if (farmError || claimError)
      setError(
        farmError?.message ?? claimError?.message ?? "Unable to load portal.",
      );
    setFarms((farmData ?? []) as FarmStand[]);
    setClaims((claimData ?? []) as Claim[]);
    setLoading(false);
  }, []);
  useEffect(() => {
    const s = getBrowserSupabaseClient();
    s.auth.getSession().then(({ data }) => {
      const a = Boolean(data.session);
      setSignedIn(a);
      if (a) void loadPortal();
      else setLoading(false);
    });
    const { data: listener } = s.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
      if (session) window.setTimeout(() => void loadPortal(), 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [loadPortal]);
  useEffect(() => {
    if (
      !signedIn ||
      loading ||
      quickConfirmationHandled ||
      !quickConfirmFarmId ||
      !userId
    )
      return;
    const farm = farms.find(
      (f) => f.id === quickConfirmFarmId && f.owner_user_id === userId,
    );
    if (!farm) return;
    setQuickConfirmationHandled(true);
    void (async () => {
      const t = new Date().toISOString(),
        { data: confirmedFarm, error: e } = await getBrowserSupabaseClient()
          .from("farm_stands")
          .update({ inventory_updated_at: t, farmer_inventory_updated_at: t })
          .eq("id", farm.id)
          .eq("owner_user_id", userId)
          .select("id")
          .maybeSingle();
      if (e || !confirmedFarm)
        setError(
          "FarmFinder could not confirm the listing. Please use the confirmation button below.",
        );
      else {
        setMessage(`${farm.name} is confirmed current for the next 7 days.`);
        window.history.replaceState({}, "", "/farmer");
      }
    })();
  }, [
    farms,
    loading,
    quickConfirmFarmId,
    quickConfirmationHandled,
    signedIn,
    userId,
  ]);
  async function authenticate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const v = new FormData(e.currentTarget),
      email = String(v.get("email")),
      password = String(v.get("password")),
      s = getBrowserSupabaseClient();
    if (mode === "signup") {
      const { data, error: a } = await s.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/farmer` },
      });
      if (a) setError(a.message);
      else if (!data.session)
        setMessage(
          "Check your email to confirm your account, then return here to sign in.",
        );
      else {
        setSignedIn(true);
        await loadPortal();
      }
    } else {
      const { error: a } = await s.auth.signInWithPassword({ email, password });
      if (a) setError("Sign-in failed. Check your email and password.");
      else {
        setSignedIn(true);
        await loadPortal();
      }
    }
    setLoading(false);
  }
  async function sendPasswordReset() {
    if (!loginEmail.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const { error: a } =
      await getBrowserSupabaseClient().auth.resetPasswordForEmail(
        loginEmail.trim(),
        { redirectTo: `${window.location.origin}/farmer` },
      );
    if (a)
      setError("Password reset email could not be sent. Please try again.");
    else setMessage("Check your email for a secure password-reset link.");
    setLoading(false);
  }
  async function saveAccountPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(
      new FormData(e.currentTarget).get("new_password") ?? "",
    );
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    const { error: a } = await getBrowserSupabaseClient().auth.updateUser({
      password,
    });
    if (a) setError("Your password could not be saved. Please try again.");
    else {
      e.currentTarget.reset();
      setMessage(
        "Your FarmFinder password is saved. You can use it the next time you sign in.",
      );
    }
    setLoading(false);
  }
  async function claimFarm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!claiming) return;
    const v = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    const { error: a } = await getBrowserSupabaseClient()
      .from("farm_claim_requests")
      .insert({
        farm_id: claiming.id,
        claimant_name: v.get("claimant_name"),
        claimant_email: v.get("claimant_email"),
        claimant_phone: v.get("claimant_phone"),
        claimant_role: v.get("claimant_role"),
        verification_notes: v.get("verification_notes"),
        message: v.get("verification_notes"),
      });
    if (a) setError(a.message);
    else {
      setMessage("Ownership request submitted for administrator review.");
      setClaiming(null);
      await loadPortal();
    }
    setLoading(false);
  }
  async function requestUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const v = new FormData(e.currentTarget);
    setLoading(true);
    setError("");
    const { error: a } = await getBrowserSupabaseClient()
      .from("farm_update_requests")
      .insert({
        farm_id: editing.id,
        name: v.get("name"),
        address: v.get("address"),
        city: v.get("city"),
        state: v.get("state"),
        zip_code: v.get("zip_code"),
        description: v.get("description"),
        phone: v.get("phone"),
        website: v.get("website"),
        hours: v.get("hours"),
        payment_methods: v.get("payment_methods"),
      });
    if (a) setError(a.message);
    else {
      setMessage("Update request submitted for administrator review.");
      setEditing(null);
      await loadPortal();
    }
    setLoading(false);
  }
  async function signOut() {
    await getBrowserSupabaseClient().auth.signOut();
    setSignedIn(false);
    setFarms([]);
  }
  if (!signedIn)
    return (
      <form className="admin-login farmer-login" onSubmit={authenticate}>
        <p className="eyebrow">Farmer portal</p>
        <h1>{mode === "signin" ? "Welcome back." : "Create your account."}</h1>
        <p>
          {mode === "signin"
            ? "Sign in to update your farm listing. If we already approved your ownership, your farm will connect automatically."
            : "Use the same email address you provided with your farm submission. You may need to confirm it."}
        </p>
        <div className="farmer-login-steps">
          <strong>Already submitted and approved your farm?</strong>
          <p>
            Use the approval email we sent you, or create an account with the
            same email from your submission. Do not submit the farm again.
          </p>
          <ol>
            <li>Open your approval email or create your account.</li>
            <li>Use the same email address you submitted with your farm.</li>
            <li>
              Create a password and sign in to manage the existing listing.
            </li>
          </ol>
        </div>
        <label>
          Email address
          <input
            type="email"
            name="email"
            required
            autoComplete="username"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <button className="submit-button" disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : "Create account"}
        </button>
        {mode === "signin" && (
          <button
            className="auth-switch"
            type="button"
            disabled={loading}
            onClick={() => void sendPasswordReset()}
          >
            Forgot or never created a password?
          </button>
        )}
        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setMessage("");
          }}
        >
          {mode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </form>
    );
  const owned = farms.filter((f) => f.owner_user_id === userId),
    claimable = farms.filter((f) => !f.owner_user_id && !f.is_verified),
    claimedIds = new Set(
      claims.filter((c) => c.status === "pending").map((c) => c.farm_id),
    );
  return (
    <section className="farmer-panel">
      <div className="admin-toolbar">
        <div>
          <p className="eyebrow">Farmer portal</p>
          <h1>Your listings</h1>
        </div>
        <button onClick={() => void signOut()}>Sign out</button>
      </div>
      {error && <p className="form-error admin-error">{error}</p>}
      {message && <p className="form-success portal-message">{message}</p>}
      <details className="portal-section account-security">
        <summary>Account password and access</summary>
        <p>
          Just opened an approval or reset email? Create a password now so you
          can return later.
        </p>
        <form onSubmit={saveAccountPassword}>
          <label>
            New password
            <input
              name="new_password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
          <button className="primary-button" disabled={loading}>
            Save password
          </button>
        </form>
      </details>
      {loading ? (
        <div className="admin-empty">Loading…</div>
      ) : (
        <>
          <section className="portal-section">
            <h2>Farms you manage</h2>
            {owned.length === 0 ? (
              <p className="portal-empty">
                No farms are connected to this account yet.
              </p>
            ) : (
              <>
                <p className="portal-guidance">
                  Ownership approved. Update availability below and use your
                  FarmFinder sign to help customers find and follow your
                  listing.
                </p>
                <div className="portal-farms">
                  {owned.map((farm) => (
                    <article key={farm.id}>
                      <h3>{farm.name}</h3>
                      <p>
                        {farm.city}, {farm.state}
                      </p>
                      <div className="detail-actions">
                        <button type="button" onClick={() => setEditing(farm)}>
                          Request an update
                        </button>
                        <a
                          className="primary-button"
                          href={`/farms/${farm.id}/sign`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          ▦ Print FarmFinder QR sign ↗
                        </a>
                      </div>
                      <FarmerInventory farmId={farm.id} farmName={farm.name} />
                      <FarmerGrowthTools farmId={farm.id} />
                      {"growing_practices" in farm && (
                        <FarmerGrowingPractices
                          farmId={farm.id}
                          initialPractices={farm.growing_practices ?? []}
                          initialNote={farm.growing_practices_note}
                          initialOrganicCertifier={farm.organic_certifier}
                        />
                      )}
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
          <section className="portal-section">
            <h2>Claim an existing listing</h2>
            <p>
              Choose only a farm you own or officially represent. Claims require
              administrator approval.
            </p>
            <div className="portal-farms">
              {claimable
                .filter((f) => !requestedFarmId || f.id === requestedFarmId)
                .map((f) => (
                  <article key={f.id}>
                    <h3>{f.name}</h3>
                    <p>
                      {f.city}, {f.state}
                    </p>
                    {claimedIds.has(f.id) && (
                      <p className="claim-pending-note">
                        Your request is waiting for FarmFinder approval.
                      </p>
                    )}
                    <button
                      disabled={claimedIds.has(f.id)}
                      onClick={() => setClaiming(f)}
                    >
                      {claimedIds.has(f.id)
                        ? "Waiting for approval"
                        : "Request ownership"}
                    </button>
                  </article>
                ))}
            </div>
          </section>
        </>
      )}
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
              Account email
              <input
                name="claimant_email"
                type="email"
                value={userEmail}
                readOnly
                required
              />
              <small>
                Ownership will be connected to this signed-in account.
              </small>
            </label>
            <label>
              Phone
              <input name="claimant_phone" type="tel" />
            </label>
            <label>
              Relationship to the farm
              <input name="claimant_role" required />
            </label>
            <input
              type="hidden"
              name="verification_notes"
              value="Applicant confirmed they own or operate this farm/stand."
            />
            <button className="submit-button" disabled={loading}>
              Submit ownership claim
            </button>
          </form>
        </div>
      )}
      {editing && (
        <div className="portal-modal" role="dialog" aria-modal="true">
          <form onSubmit={requestUpdate}>
            <div className="modal-heading">
              <h2>Update {editing.name}</h2>
              <button type="button" onClick={() => setEditing(null)}>
                ×
              </button>
            </div>
            <div className="form-grid">
              <label className="form-wide">
                Farm name
                <input name="name" defaultValue={editing.name} required />
              </label>
              <label className="form-wide">
                Address
                <input
                  name="address"
                  defaultValue={editing.address ?? ""}
                  required
                />
              </label>
              <label>
                City
                <input name="city" defaultValue={editing.city ?? ""} required />
              </label>
              <label>
                State
                <input
                  name="state"
                  defaultValue={editing.state ?? "NY"}
                  required
                />
              </label>
              <label>
                ZIP
                <input
                  name="zip_code"
                  defaultValue={editing.zip_code ?? ""}
                  required
                />
              </label>
              <label>
                Phone
                <input name="phone" defaultValue={editing.phone ?? ""} />
              </label>
              <label className="form-wide">
                Website
                <input name="website" defaultValue={editing.website ?? ""} />
              </label>
              <label className="form-wide">
                Description
                <textarea
                  name="description"
                  defaultValue={editing.description ?? ""}
                  rows={4}
                />
              </label>
              <label>
                Hours
                <textarea
                  name="hours"
                  defaultValue={editing.hours ?? ""}
                  rows={3}
                />
              </label>
              <label>
                Payment methods
                <textarea
                  name="payment_methods"
                  defaultValue={editing.payment_methods ?? ""}
                  rows={3}
                />
              </label>
            </div>
            <button className="submit-button" disabled={loading}>
              Submit update for review
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
