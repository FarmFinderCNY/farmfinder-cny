"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCustomerFavorites } from "@/components/customer-favorites";
import { StandCard } from "@/components/stand-card";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import { FAVORITES_KEY, isFarmId } from "@/lib/customer-favorites";
import type { FarmStand } from "@/lib/types";

function updateTime(stand: FarmStand) {
  const timestamp = stand.farmer_inventory_updated_at ? new Date(stand.farmer_inventory_updated_at).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function CustomerDashboard({ stands }: { stands: FarmStand[] }) {
  const { user, ready, recovery, savedIds, busy, error: accountError, retry, finishRecovery, setSaved } = useCustomerFavorites();
  const params = useSearchParams();
  const router = useRouter();
  const requestedId = params.get("save");
  const requestedFarm = isFarmId(requestedId) ? stands.find((stand) => stand.id === requestedId) : undefined;
  const pendingHandled = useRef<string | null>(null);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [recentOnly, setRecentOnly] = useState(false);
  const [pendingRetry, setPendingRetry] = useState(0);

  useEffect(() => {
    if (!ready || !user || recovery || !requestedFarm || busy) return;
    const key = `${user.id}:${requestedFarm.id}:${pendingRetry}`;
    if (pendingHandled.current === key) return;
    pendingHandled.current = key;
    if (savedIds.includes(requestedFarm.id)) { router.replace("/my-farms"); return; }
    void setSaved(requestedFarm.id, true).then(() => {
      setMessage(`${requestedFarm.name} saved to My Farms.`);
      router.replace("/my-farms");
    }).catch((err) => setError(err instanceof Error ? err.message : "That farm couldn’t be saved."));
  }, [ready, user, recovery, requestedFarm, savedIds, busy, setSaved, router, pendingRetry]);

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    setError(""); setMessage("");
    if (mode === "signup" && password !== values.get("confirm_password")) { setError("The two passwords don’t match."); return; }
    setWorking(true);
    try {
      const client = getBrowserSupabaseClient();
      if (mode === "signup") {
        const returnPath = requestedFarm ? `/my-farms?save=${requestedFarm.id}` : "/my-farms";
        const { data, error: authError } = await client.auth.signUp({ email: email.trim(), password, options: {
          emailRedirectTo: `${window.location.origin}${returnPath}`,
          data: { [FAVORITES_KEY]: requestedFarm ? [requestedFarm.id] : [] },
        } });
        if (authError) throw authError;
        if (!data.session) {
          setMessage("Check your email for the confirmation link, then sign in here. If you already have a FarmFinder account, use your existing password or Forgot password.");
          setMode("signin");
        }
      } else {
        const { error: authError } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw new Error("Sign-in failed. Check your email and password, and confirm your account if needed.");
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Account access is unavailable. Please try again."); }
    finally { setWorking(false); }
  }

  async function resetPassword() {
    if (!email.trim()) { setError("Enter your email address first."); return; }
    setWorking(true); setError(""); setMessage("");
    try {
      const { error: authError } = await getBrowserSupabaseClient().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/my-farms?reset=1` });
      if (authError) throw authError;
      setMessage("If an account exists for this email, check your inbox for a secure password-reset link.");
    } catch { setError("The reset email could not be requested. Please try again."); }
    finally { setWorking(false); }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const password = String(values.get("password") ?? "");
    if (password !== values.get("confirm_password")) { setError("The two passwords don’t match."); return; }
    setWorking(true); setError(""); setMessage("");
    try {
      const { error: authError } = await getBrowserSupabaseClient().auth.updateUser({ password });
      if (authError) throw authError;
      form.reset(); finishRecovery(); router.replace("/my-farms");
      setMessage("Your new password is saved.");
    } catch { setError("Your password couldn’t be saved. Please try again."); }
    finally { setWorking(false); }
  }

  async function signOut() {
    setWorking(true); setError(""); setMessage("");
    try {
      const { error: authError } = await getBrowserSupabaseClient().auth.signOut();
      if (authError) throw authError;
      pendingHandled.current = null;
      router.replace("/my-farms");
    } catch { setError("Sign-out failed. Please try again."); }
    finally { setWorking(false); }
  }

  const feedback = <>{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}</>;
  if (!ready) return <p role="status">Loading your account…</p>;
  if (accountError) return <section className="customer-auth"><h1>My Farms</h1><p role="alert">{accountError}</p><button className="primary-button" type="button" onClick={() => void retry()}>Try again</button></section>;
  if (recovery && user) return <section className="customer-auth"><p className="eyebrow">Your account</p><h1>Choose a new password</h1><form className="customer-account-form" onSubmit={savePassword}><label>New password<input name="password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label><label>Confirm password<input name="confirm_password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label>{feedback}<button className="submit-button" disabled={working}>{working ? "Saving…" : "Save password"}</button></form></section>;

  if (!user) return <div className="customer-welcome">
    <section className="customer-auth" aria-label="Customer account"><p className="eyebrow">My Farms</p><h2>{mode === "signup" ? "Create your account" : "Welcome back"}</h2><p>{mode === "signup" ? "A simple sign-in for your favorite local farms." : "Sign in to see your saved farms."}</p>{requestedFarm && <p className="customer-pending">Ready to save <strong>{requestedFarm.name}</strong> after you sign in.</p>}<form className="customer-account-form" onSubmit={authenticate}>
      <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="username" /></label>
      <label>Password<input name="password" type="password" required minLength={mode === "signup" ? 8 : undefined} maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
      {mode === "signup" && <><label>Confirm password<input name="confirm_password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" /></label><p className="customer-note">Use at least 8 characters. Your saved farms stay with your account. <Link href="/privacy">Read our Privacy Policy.</Link></p></>}
      {feedback}<button className="submit-button" disabled={working}>{working ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}</button>
    </form><div className="customer-auth-actions"><button className="text-button" type="button" disabled={working} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>{mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}</button>{mode === "signin" && <button className="text-button" type="button" disabled={working} onClick={() => void resetPassword()}>Forgot password?</button>}</div><p className="customer-note">Farm owners can use their existing FarmFinder email and password.</p></section>
    <section className="customer-intro"><p className="eyebrow">Your local favorites</p><h1>Your farms.<br /><em>In one place.</em></h1><p className="lede">Save the farms, stands and markets you love. See their latest product updates whenever you return.</p><div className="customer-benefits"><p><strong>♥ Keep your favorites close</strong><span>Find them again on any device when you sign in.</span></p><p><strong>🌱 See what’s been updated</strong><span>Actual update dates help you plan your next visit.</span></p><p><strong>↗ Make it an easy trip</strong><span>Quick access to farm details, hours and directions.</span></p></div><p className="customer-note">Browsing is always open to everyone. Saving a farm does not subscribe you to emails.</p><Link className="text-button" href="/#stands">Keep browsing →</Link></section>
  </div>;

  const saved = stands.filter((stand) => savedIds.includes(stand.id)).sort((a, b) => updateTime(b) - updateTime(a) || a.name.localeCompare(b.name));
  const now = Date.now();
  const recent = saved.filter((stand) => { const timestamp = updateTime(stand); return timestamp > 0 && now >= timestamp && now - timestamp < 7 * 86400000; });
  const visible = recentOnly ? recent : saved;
  const missing = savedIds.filter((id) => !stands.some((stand) => stand.id === id));
  return <section className="customer-dashboard">
    <header className="customer-dashboard-heading"><div><p className="eyebrow">Your local favorites</p><h1>My Farms</h1><p>Saved for <strong>{user.email}</strong></p></div><div className="customer-dashboard-actions"><Link className="primary-button" href="/#stands">Find more farms →</Link><button className="text-button" type="button" disabled={working || busy} onClick={() => void signOut()}>Sign out</button></div></header>
    {feedback}{requestedFarm && error && <button className="text-button" type="button" disabled={busy} onClick={() => { setError(""); setPendingRetry((value) => value + 1); }}>Try saving {requestedFarm.name} again</button>}
    <div className="customer-summary"><div><strong>{savedIds.length}</strong><span>saved farms & markets</span></div><div><strong>{recent.length}</strong><span>updated in the last 7 days</span></div><p>Farmers choose when to post. An older update does not mean a farm is closed. Check hours or call before making a special trip.</p></div>
    <div className="customer-filter" aria-label="Saved farm filters"><button type="button" aria-pressed={!recentOnly} onClick={() => setRecentOnly(false)}>All saved farms</button><button type="button" aria-pressed={recentOnly} onClick={() => setRecentOnly(true)}>Recent updates</button><button type="button" className="text-button" onClick={() => router.refresh()}>Refresh updates</button></div>
    {visible.length ? <div className="stand-grid">{visible.map((stand) => <div className="customer-saved-entry" key={stand.id}><div className="customer-update-date"><strong>{updateTime(stand) ? "Latest farmer update" : "No farmer update posted yet"}</strong>{updateTime(stand) > 0 && <time dateTime={stand.farmer_inventory_updated_at ?? undefined}>{new Date(updateTime(stand)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</time>}</div><StandCard stand={stand} /><p className="customer-follow-note"><Link href={`/farms/${stand.id}`}>View {stand.listing_type === "farmers_market" ? "market details" : "details or follow by email"} →</Link></p></div>)}</div> : <div className="empty-state"><span>♡</span><h2>{recentOnly ? "No recent updates yet" : "Your favorites start here"}</h2><p>{recentOnly ? "Your farms are still saved. Owners post updates when they choose." : savedIds.length ? "Your saved listings aren’t currently available. Try refreshing or browse other farms." : "Tap Save farm on any farm, stand or market to keep it here."}</p><Link className="primary-button" href="/#stands">Browse local farms →</Link></div>}
    {missing.length > 0 && <section className="customer-unavailable"><h2>Unavailable listings</h2><p>These saved listings could not be loaded. They may be unpublished or temporarily unavailable.</p>{missing.map((id) => <div key={id}><span>Saved listing · {id.slice(0, 8)}</span><button className="text-button" type="button" disabled={busy} onClick={async () => { setError(""); try { await setSaved(id, false); } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); } }}>Remove from saved farms</button></div>)}</section>}
  </section>;
}
