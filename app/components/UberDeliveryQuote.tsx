"use client";

import { FormEvent, useState } from "react";

type Props = {
  pickup: { street: string; city: string; state: string; zip: string };
};

type Quote = { fee?: number; currency?: string; duration?: number; dropoffEta?: string };

export default function UberDeliveryQuote({ pickup }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setQuote(null);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/uber-direct/quote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup: { street_address: [pickup.street], city: pickup.city, state: pickup.state, zip_code: pickup.zip, country: "US" },
        dropoff: { street_address: [String(data.get("street") || "")], city: String(data.get("city") || ""), state: String(data.get("state") || "NY"), zip_code: String(data.get("zip") || ""), country: "US" },
      }),
    });
    const result = await response.json(); setLoading(false);
    if (!response.ok) { setError(result.error || "Delivery quote unavailable."); return; }
    setQuote(result);
  }

  return <div className="uber-delivery-test">
    <button className="text-button" type="button" onClick={() => setOpen((value) => !value)}>🚗 Check local delivery</button>
    {open && <form onSubmit={submit} style={{ marginTop: 12, display: "grid", gap: 8, maxWidth: 420 }}>
      <strong>Uber Direct delivery estimate</strong>
      <span style={{ fontSize: 14 }}>Test only — checking a quote does not request a driver or place an order.</span>
      <input name="street" required placeholder="Delivery street address" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 100px", gap: 8 }}>
        <input name="city" required placeholder="City" /><input name="state" required defaultValue="NY" aria-label="State" /><input name="zip" required placeholder="ZIP" />
      </div>
      <button className="primary-button" disabled={loading} type="submit">{loading ? "Checking…" : "Get delivery estimate"}</button>
      {error && <span role="alert">{error}</span>}
      {quote && <div className="availability-note"><strong>Delivery estimate</strong><span>{typeof quote.fee === "number" ? `Estimated delivery fee: $${(quote.fee / 100).toFixed(2)}` : "Uber confirmed delivery availability."}{typeof quote.duration === "number" ? ` • About ${Math.ceil(quote.duration / 60)} min` : ""}</span></div>}
    </form>}
  </div>;
}
