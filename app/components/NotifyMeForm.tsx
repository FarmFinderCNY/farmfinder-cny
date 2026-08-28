"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";
import { recordFarmEvent } from "@/components/farm-engagement-tracker";
export default function NotifyMeForm({ farmId }: { farmId: string }) {
  const [showForm, setShowForm] = useState(false);
  const [alertType, setAlertType] = useState<"product" | "farm">("product");
  const [productName, setProductName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const supabase = getBrowserSupabaseClient();

    const { error } = await supabase
      .from("inventory_alert_subscriptions")
      .insert({
        farm_id: farmId,
        product_name: alertType === "farm" ? "__farm_updates__" : productName.trim(),
        email: email.trim().toLowerCase(),
        active: true,
      });

    if (error) {
      setMessage("We couldn’t create your alert. Please try again.");
      setSaving(false);
      return;
    }

    setMessage(alertType === "farm" ? "We’ll email you about this farm’s next fresh availability update." : "Your product alert has been saved.");
    recordFarmEvent(farmId, "alert_subscription");
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
      <fieldset className="notify-choice">
        <legend>What would you like to follow?</legend>
        <label><input type="radio" name="alert_type" checked={alertType === "product"} onChange={() => setAlertType("product")} /> A specific product</label>
        <label><input type="radio" name="alert_type" checked={alertType === "farm"} onChange={() => setAlertType("farm")} /> This farm’s next fresh update</label>
      </fieldset>
      {alertType === "product" && <>
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
      </>}

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
        {saving ? "Saving..." : alertType === "farm" ? "Notify me on next update" : "Create product alert"}
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
