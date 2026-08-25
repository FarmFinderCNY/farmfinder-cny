"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { getSupabaseClient } from "@/lib/supabase";
export default function NotifyMeForm({ farmId }: { farmId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [productName, setProductName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from("inventory_alert_subscriptions")
      .insert({
        farm_id: farmId,
        product_name: productName.trim(),
        email: email.trim().toLowerCase(),
        active: true,
      });

    if (error) {
      setMessage("We couldn’t create your alert. Please try again.");
      setSaving(false);
      return;
    }

    setMessage(
    "Your alert request has been saved."
    );
    setProductName("");
    setEmail("");
    setSaving(false);
  }

  if (!showForm) {
    return (
      <button
        type="button"
        className="text-button"
        onClick={() => setShowForm(true)}
      >
        🔔 Notify me
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="notify-me-form">
      <label>
        Product
        <input
          type="text"
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
          placeholder="Example: sweet corn"
          required
        />
      </label>

      <label>
   
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </label>
     <small className="privacy-note">
  By creating an alert, you agree to the{" "}
  <a href="/privacy">Privacy Policy</a>.
</small>
      <button type="submit" className="primary-button" disabled={saving}>
        {saving ? "Saving..." : "Create alert"}
      </button>

      <button
        type="button"
        className="text-button"
        onClick={() => setShowForm(false)}
      >
        Cancel
      </button>

      {message && <p>{message}</p>}
    </form>
  );
}
