"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type FormStatus = "idle" | "submitting" | "success" | "error";

export function FarmSubmissionForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);

    if (values.get("company_website")) {
      setStatus("success");
      return;
    }

    setStatus("submitting");
    setMessage("");

    const payload = {
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
      contact_name: values.get("contact_name"),
      contact_email: values.get("contact_email"),
      contact_phone: values.get("contact_phone") || null,
      consent_to_publish: values.get("consent_to_publish") === "on",
    };

    try {
      const { error } = await getBrowserSupabaseClient()
        .from("farm_stand_submissions")
        .insert(payload);

      if (error) throw error;
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
        <p>We’ll review your farm information before it appears publicly. We may contact you if anything needs clarification.</p>
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
        <legend><span>01</span> Public farm information</legend>
        <p>This information may appear on FarmFinder CNY after approval.</p>
        <div className="form-grid">
          <label className="form-wide">Farm or stand name<input name="farm_name" required minLength={2} maxLength={120} /></label>
          <label className="form-wide">Street address<input name="address" required maxLength={180} /></label>
          <label>City or town<input name="city" required maxLength={100} /></label>
          <label>State<input name="state" required defaultValue="NY" maxLength={2} /></label>
          <label>ZIP code<input name="zip_code" required inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" /></label>
          <label>Public phone<input name="public_phone" type="tel" maxLength={30} /></label>
          <label className="form-wide">Website or social page<input name="website" type="url" placeholder="https://" maxLength={250} /></label>
          <label className="form-wide">What do you offer?<textarea name="description" rows={5} maxLength={1000} placeholder="Tell visitors about your produce, products, and farm stand." /></label>
          <label>Hours<textarea name="hours" rows={3} maxLength={300} placeholder="Example: Mon–Sat, 9 AM–6 PM" /></label>
          <label>Payment methods<textarea name="payment_methods" rows={3} maxLength={200} placeholder="Cash, cards, honor system…" /></label>
        </div>
      </fieldset>

      <fieldset>
        <legend><span>02</span> Owner contact</legend>
        <p>These details are private and used only to review your submission.</p>
        <div className="form-grid">
          <label>Contact name<input name="contact_name" required maxLength={120} /></label>
          <label>Email address<input name="contact_email" type="email" required maxLength={254} /></label>
          <label>Contact phone<input name="contact_phone" type="tel" maxLength={30} /></label>
        </div>
      </fieldset>

      <label className="consent-row">
        <input name="consent_to_publish" type="checkbox" required />
        <span>I confirm that I’m authorized to submit this listing and allow FarmFinder CNY to publish the public farm information above.</span>
      </label>

      {status === "error" && <p className="form-error" role="alert">{message}</p>}
      <button className="submit-button" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Sending…" : "Submit farm for review"}
      </button>
      <p className="form-fine-print">Submissions are reviewed before publication. Sending this form does not guarantee a listing.</p>
    </form>
  );
}
