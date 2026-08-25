"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase";

export default function ContactPage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setResult("");

    const form = new FormData(event.currentTarget);
    const website = String(form.get("company_website") ?? "");

    if (website) {
      setResult("Thanks! Your message has been received.");
      setSending(false);
      event.currentTarget.reset();
      return;
    }

    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const contactMessage = String(form.get("message") ?? "").trim();

    const { error } = await getSupabaseClient()
      .from("contact_messages")
      .insert({
        name,
        email,
        message: contactMessage,
        status: "new",
      });

    if (error) {
      setResult("We couldn’t send your message. Please try again.");
      setSending(false);
      return;
    }

    setResult("Thanks! Your message has been sent to Ronald at FarmFinder CNY.");
    setSending(false);
    event.currentTarget.reset();
  }

  return (
    <main className="shell">
      <section style={{ maxWidth: "680px", padding: "60px 0" }}>
        <p className="eyebrow">FarmFinder CNY</p>
        <h1>Contact Ronald</h1>

        <p>
          Have a question, correction, privacy request, or idea for FarmFinder
          CNY? Send a private message below.
        </p>

        <form className="submission-form" onSubmit={handleSubmit}>
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="company_website">Company website confirmation</label>
            <input
              id="company_website"
              name="company_website"
              tabIndex={-1}
              autoComplete="off"
            />
          </div>

          <label>
            Your name
            <input name="name" type="text" required maxLength={100} />
          </label>

          <label>
            Your email
            <input name="email" type="email" required maxLength={320} />
          </label>

          <label className="form-wide">
            Message
            <textarea
              name="message"
              rows={7}
              required
              minLength={10}
              maxLength={2000}
            />
          </label>

          <button className="submit-button" type="submit" disabled={sending}>
            {sending ? "Sending..." : "Send private message"}
          </button>

          {result && <p role="status">{result}</p>}
        </form>

        <div style={{ marginTop: "28px" }}>
          <Link className="text-button" href="/">
            ← Back to FarmFinder CNY
          </Link>
        </div>
      </section>
    </main>
  );
}
