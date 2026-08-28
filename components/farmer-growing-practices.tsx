"use client";

import { FormEvent, useState } from "react";
import { GROWING_PRACTICE_OPTIONS } from "@/lib/growing-practices";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

export function FarmerGrowingPractices({
  farmId,
  initialPractices = [],
  initialNote = "",
  initialOrganicCertifier = "",
}: {
  farmId: string;
  initialPractices?: string[];
  initialNote?: string | null;
  initialOrganicCertifier?: string | null;
}) {
  const [selected, setSelected] = useState(initialPractices);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function toggle(value: string) {
    setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const organicCertifier = String(values.get("organic_certifier") ?? "").trim();
    if (selected.includes("certified_organic") && !organicCertifier) {
      setError("Enter the certifying organization before selecting USDA Certified Organic.");
      return;
    }
    setSaving(true); setError(""); setMessage("");
    const { error: updateError } = await getBrowserSupabaseClient()
      .from("farm_stands")
      .update({
        growing_practices: selected,
        growing_practices_note: String(values.get("growing_practices_note") ?? "").trim() || null,
        organic_certifier: selected.includes("certified_organic") ? organicCertifier : null,
      })
      .eq("id", farmId);
    if (updateError) setError(updateError.message.includes("growing_practices") ? "Growing practices need to be enabled in FarmFinder before they can be saved." : updateError.message);
    else setMessage("Growing practices saved. They now appear on your public listing.");
    setSaving(false);
  }

  return <form className="practice-editor" onSubmit={save}>
    <div className="practice-editor-heading">
      <div><h4>Growing practices</h4><p>Choose every statement that accurately describes this farm. Practices may vary by crop.</p></div>
      <span>Optional · Reported by your farm</span>
    </div>
    <div className="practice-honesty-note">
      <strong>Honesty builds trust.</strong>
      <p>You want customers to be honest with you. Please be honest with them—select only practices you can confidently stand behind.</p>
    </div>
    <div className="practice-options">
      {GROWING_PRACTICE_OPTIONS.map((option) => <label className={selected.includes(option.value) ? "selected" : ""} key={option.value}>
        <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)} />
        {option.label}
      </label>)}
    </div>
    {selected.includes("certified_organic") && <label className="practice-field">Certifying organization<input name="organic_certifier" defaultValue={initialOrganicCertifier ?? ""} placeholder="Required, for example: NOFA-NY Certified Organic" /></label>}
    <label className="practice-field">Optional explanation<textarea name="growing_practices_note" defaultValue={initialNote ?? ""} rows={3} placeholder="Tell shoppers how your methods work or which crops they apply to." /></label>
    <p className="practice-fine-print">You can leave this entire section blank. FarmFinder labels selected practices as farm-reported so shoppers can ask you for details.</p>
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success">{message}</p>}
    <button className="practice-save" disabled={saving}>{saving ? "Saving…" : "Save growing practices"}</button>
  </form>;
}
