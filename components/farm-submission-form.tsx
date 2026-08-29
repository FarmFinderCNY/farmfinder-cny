"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function FarmSubmissionForm({ defaultSubmissionType = "owner" }: { defaultSubmissionType?: "owner" | "community" }) {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");
  const [submissionType, setSubmissionType] = useState<"owner" | "community">(defaultSubmissionType);
  const [showAttribution, setShowAttribution] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);

    setStatus("submitting");
    setMessage("");

    const payload = {
      submission_type: values.get("submission_type"),
      farm_name: values.get("farm_name"),
      address: values.get("address"),
      city: values.get("city"),
      state: values.get("state"),
      zip_code: values.get("zip_code"),
      description: values.get("description") || null,
      public_phone: values.get("public_phone") || null,
      website: values.get("website") || null,
      hours: values.get("hours") || null,
      payment_methods: values.get("payment_methods") || null,
      product_categories: values.getAll("product_categories"),
      contact_name: values.get("contact_name"),
      contact_email: values.get("contact_email"),
      contact_phone: values.get("contact_phone") || null,
      submitter_display_name: values.get("submitter_display_name") || null,
      show_submitter_name: values.get("show_submitter_name") === "on",
      source_url: values.get("source_url") || null,
      consent_to_publish: values.get("consent_to_publish") === "on",
      company_website: values.get("company_website") || "",
    };

    try {
      const response = await fetch("/api/farm-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Submission request failed");
      form.reset();
      setStatus("success");
    } catch (error) {
      console.error("Farm submission failed", error);
      setMessage("We couldn’t send your listing. Please check the form and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="submission-success" role="status">
        <span>✓</span>
        <p className="eyebrow">Submission received</p>
        <h2>Thanks for helping CNY find local food.</h2>
        <p>{submissionType === "owner" ? "We’ll review your ownership and farm information. Once approved, your email will be connected to the listing so you can sign in and update it—no second ownership claim is needed." : "We’ll review the farm information before it appears publicly. We may contact you if anything needs clarification."}</p>
        <Link href="/">Return to FarmFinder CNY</Link>
      </div>
    );
  }

  return (
    <form className="submission-form" onSubmit={handleSubmit}>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="company_website">Company website confirmation</label>
        <input id="company_website" name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset>
        <legend><span>01</span> How are you helping?</legend>
        <p>Choose whether this is your farm or a local place you want neighbors to discover.</p>
        <div className="submission-type-options">
          <label className={submissionType === "owner" ? "active" : ""}><input type="radio" name="submission_type" value="owner" checked={submissionType === "owner"} onChange={() => setSubmissionType("owner")} /><span><strong>I own or manage this farm</strong>I’m submitting information for my own listing.</span></label>
          <label className={submissionType === "community" ? "active" : ""}><input type="radio" name="submission_type" value="community" checked={submissionType === "community"} onChange={() => setSubmissionType("community")} /><span><strong>I’m suggesting a local farm</strong>I found a farm or stand the community should know about.</span></label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>02</span> Public farm information</legend>
        <p>This information may appear on FarmFinder CNY after approval.</p>
        <div className="form-grid">
          <label className="form-wide">Farm or stand name<input name="farm_name" required minLength={2} maxLength={120} /></label>
          <label className="form-wide">Street address<input name="address" required maxLength={180} /></label>
          <label>City or town<input name="city" required maxLength={100} /></label>
          <label>State<input name="state" required defaultValue="NY" maxLength={2} /></label>
          <label>ZIP code<input name="zip_code" required inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" /></label>
          <label>Public phone<input name="public_phone" type="tel" maxLength={30} /></label>
          <label className="form-wide">Website or social page<input name="website" type="url" placeholder="https://" maxLength={250} /></label>
          {submissionType === "community" && <label className="form-wide">Where did you verify this information?<input name="source_url" type="text" required placeholder="Paste a link, or describe the source (Facebook page, Google listing, personal visit, etc.)" maxLength={500} /><small>Links and plain-language sources are both accepted.</small></label>}
          <label className="form-wide">What do you offer?<textarea name="description" rows={5} maxLength={1000} placeholder="Tell visitors about your produce, products, and farm stand." /></label>
          <label>Hours<textarea name="hours" rows={3} maxLength={300} placeholder="Example: Mon–Sat, 9 AM–6 PM" /></label>
          <label>Payment methods<textarea name="payment_methods" rows={3} maxLength={200} placeholder="Cash, cards, honor system…" /></label>
          <div className="form-wide category-fieldset"><span>Product categories</span><div className="category-options">
            {["Produce", "Meat", "Eggs", "Dairy", "Maple", "Honey", "Flowers", "Pumpkins", "Baked goods", "Other"].map((category) => (
              <label key={category}><input type="checkbox" name="product_categories" value={category} />{category}</label>
            ))}
          </div></div>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>03</span> {submissionType === "owner" ? "Owner contact" : "About the contributor"}</legend>
        <p>These contact details stay private and are used only to review the submission.</p>
        <div className="form-grid">
          <label>Contact name<input name="contact_name" required maxLength={120} /></label>
          <label>Email address<input name="contact_email" type="email" required maxLength={254} /></label>
          <label>Contact phone<input name="contact_phone" type="tel" maxLength={30} /></label>
        </div>
        {submissionType === "community" && <div className="attribution-panel">
          <label>Public display name<input name="submitter_display_name" maxLength={80} placeholder="Example: Jamie R." disabled={!showAttribution} /></label>
          <label className="consent-row"><input name="show_submitter_name" type="checkbox" checked={showAttribution} onChange={(event) => setShowAttribution(event.target.checked)} /><span>Show my display name publicly as the person who suggested this listing. My email and phone will remain private.</span></label>
        </div>}
      </fieldset>

      <label className="consent-row">
        <input name="consent_to_publish" type="checkbox" required />
        <span>{submissionType === "owner" ? "I confirm that I’m authorized to submit this listing and allow FarmFinder CNY to publish the public farm information above." : "I confirm that this information comes from public sources and may be reviewed and published by FarmFinder CNY."}</span>
      </label>

      {status === "error" && <p className="form-error" role="alert">{message}</p>}
      <button className="submit-button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Submit farm for review"}
      </button>
      <p className="form-fine-print">Submissions are reviewed before publication. Sending this form does not guarantee a listing.</p>
    </form>
  );
}
