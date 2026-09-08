"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { recordFarmEvent } from "@/components/farm-engagement-tracker";

export default function FollowFarmForm({ farmId, farmName }: { farmId: string; farmName: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const response = await fetch("/api/inventory-alerts/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ farmId, productName: "__farm_updates__", email }),
    });

    if (!response.ok) {
      setMessage("We couldn’t follow this farm right now. Please try again.");
      setSaving(false);
      return;
    }

    setFollowing(true);
    setMessage(`You’re following ${farmName}. We’ll email you when fresh availability is posted.`);
    recordFarmEvent(farmId, "alert_subscription");
    setEmail("");
    setSaving(false);
  }

  if (following) return <div className="follow-farm-success" role="status"><strong>♥ Following</strong><span>{message}</span></div>;

  if (!open) return <button type="button" className="primary-button" onClick={() => setOpen(true)}>♡ Follow this farm</button>;

  return (
    <form onSubmit={handleSubmit} className="notify-me-form follow-farm-form">
      <strong>Follow {farmName}</strong>
      <span>Get an email when this farm posts fresh availability.</span>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required />
      </label>
      <small className="privacy-note">By following, you agree to the <a href="/privacy">Privacy Policy</a>.</small>
      <button type="submit" className="primary-button" disabled={saving}>{saving ? "Following..." : "♥ Follow this farm"}</button>
      <button type="button" className="text-button" onClick={() => { setOpen(false); setMessage(""); }}>Cancel</button>
      {message && <p>{message}</p>}
    </form>
  );
}
