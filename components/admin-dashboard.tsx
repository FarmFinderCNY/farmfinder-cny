"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type Submission = {
  submission_type: "owner" | "community";
  id: string;
  farm_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  description: string | null;
  public_phone: string | null;
  website: string | null;
  hours: string | null;
  payment_methods: string | null;
  product_categories: string[];
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  submitter_display_name: string | null;
  show_submitter_name: boolean;
  source_url: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export function AdminDashboard() {
 const [signedIn, setSignedIn] = useState(false);
const [loading, setLoading] = useState(true);
const [submissions, setSubmissions] = useState<Submission[]>([]);
const [error, setError] = useState("");
const [workingId, setWorkingId] = useState<string | null>(null);
 const loadSubmissions = useCallback(async () => {
  setLoading(true);
  setError("");

  try {
    const supabase = getBrowserSupabaseClient();

    const { data: membership, error: membershipError } = await supabase
      .from("admin_users")
      .select("user_id")
      .maybeSingle();

    if (membershipError) {
      setError("Unable to verify administrator access. Please refresh and try again.");
      return;
    }

    if (!membership) {
      setError(
        "This account is signed in but is not authorized as a FarmFinder administrator."
      );
      return;
    }

    const { data, error: queryError } = await supabase
      .from("farm_stand_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError("Unable to load farm submissions right now.");
      return;
    }

    setSubmissions((data ?? []) as Submission[]);
  } catch (err) {
    console.error("Admin dashboard load failed:", err);
    setError("Unable to connect to FarmFinder right now. Please refresh and try again.");
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    supabase.auth.getSession().then(({ data }) => {
      const active = Boolean(data.session);
      setSignedIn(active);
      if (active) void loadSubmissions();
      else setLoading(false);
    });
  }, [loadSubmissions]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const values = new FormData(event.currentTarget);
    const { error: signInError } = await getBrowserSupabaseClient().auth.signInWithPassword({
      email: String(values.get("email")),
      password: String(values.get("password")),
    });
    if (signInError) {
      setError("Sign-in failed. Check your email and password.");
      setLoading(false);
      return;
    }
    setSignedIn(true);
    await loadSubmissions();
  }

  async function signOut() {
    await getBrowserSupabaseClient().auth.signOut();
    setSignedIn(false);
    setSubmissions([]);
  }

  async function review(id: string, decision: "approve" | "reject", farmName: string) {
    const confirmed = window.confirm(decision === "approve" ? `Approve ${farmName} and publish it?` : `Reject ${farmName}?`);
    if (!confirmed) return;
    setWorkingId(id);
    setError("");
    const functionName = decision === "approve" ? "approve_farm_submission" : "reject_farm_submission";
    const { error: reviewError } = await getBrowserSupabaseClient().rpc(functionName, { submission_id: id });
    if (reviewError) setError(reviewError.message);
    else await loadSubmissions();
    setWorkingId(null);
  }

  if (!signedIn) {
    return <form className="admin-login" onSubmit={signIn}>
      <p className="eyebrow">Private access</p><h1>Administrator sign in</h1>
      <p>Use the administrator account created in Supabase.</p>
      <label>Email address<input type="email" name="email" required autoComplete="username" /></label>
      <label>Password<input type="password" name="password" required autoComplete="current-password" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="submit-button" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
    </form>;
  }

  const pending = submissions.filter((submission) => submission.status === "pending");

  return <section className="admin-panel">
    <div className="admin-toolbar"><div><p className="eyebrow">Private review queue</p><h1>Farm submissions</h1></div><div><button onClick={() => void loadSubmissions()}>Refresh</button><button onClick={() => void signOut()}>Sign out</button></div></div>
    {error && <p className="form-error admin-error" role="alert">{error}</p>}
    {loading ? <div className="admin-empty">Loading submissions…</div> : pending.length === 0 ? <div className="admin-empty"><span>✓</span><h2>You’re all caught up.</h2><p>No submissions are waiting for review.</p></div> : <div className="submission-queue">{pending.map((submission) => <article className="review-card" key={submission.id}>
      <div className="review-heading"><div><span className="pending-badge">{submission.submission_type === "community" ? "Community suggestion" : "Owner submission"}</span><h2>{submission.farm_name}</h2><p>{[submission.address, submission.city, submission.state, submission.zip_code].join(", ")}</p></div><time>{new Date(submission.created_at).toLocaleDateString()}</time></div>
      {submission.description && <p className="review-description">{submission.description}</p>}
      {submission.product_categories.length > 0 && <div className="category-chips">{submission.product_categories.map((category) => <span key={category}>{category}</span>)}</div>}
      <dl className="review-details">
        {submission.hours && <><dt>Hours</dt><dd>{submission.hours}</dd></>}
        {submission.payment_methods && <><dt>Payment</dt><dd>{submission.payment_methods}</dd></>}
        {submission.public_phone && <><dt>Public phone</dt><dd>{submission.public_phone}</dd></>}
        {submission.website && <><dt>Website</dt><dd>{submission.website}</dd></>}
        {submission.source_url && <><dt>Source</dt><dd><a href={submission.source_url} target="_blank" rel="noreferrer">Review public source ↗</a></dd></>}
        {submission.submission_type === "community" && <><dt>Attribution</dt><dd>{submission.show_submitter_name && submission.submitter_display_name ? `Community submitted by ${submission.submitter_display_name}` : "Anonymous community submission"}</dd></>}
      </dl>
      <div className="private-contact"><strong>Private {submission.submission_type === "community" ? "contributor" : "owner"} contact</strong><span>{submission.contact_name}</span><a href={`mailto:${submission.contact_email}`}>{submission.contact_email}</a>{submission.contact_phone && <a href={`tel:${submission.contact_phone}`}>{submission.contact_phone}</a>}</div>
      <p className="review-note">Before approving, verify the details. After approval, add coordinates and an authorized photo in Supabase.</p>
      <div className="review-actions"><button className="reject-button" disabled={workingId === submission.id} onClick={() => void review(submission.id, "reject", submission.farm_name)}>Reject</button><button className="approve-button" disabled={workingId === submission.id} onClick={() => void review(submission.id, "approve", submission.farm_name)}>{workingId === submission.id ? "Working…" : "Approve & publish"}</button></div>
    </article>)}</div>}
  </section>;
}
