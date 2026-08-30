"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";

export default function ContactPage() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setResult("");

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      company_website: String(form.get("company_website") ?? ""),
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim().toLowerCase(),
      message: String(form.get("message") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseBody = await response.json() as { error?: string };
      if (!response.ok) {
        setResult(responseBody.error ?? "We couldn’t send your message. Please try again.");
        return;
      }

      setResult("Thanks! Your message has been received by FarmFinder CNY.");
      formElement.reset();
    } catch {
      setResult("We couldn’t send your message. Please try again.");
    } finally {
      setSending(false);
    }
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

          {result && (
            <p role="status" style={{ marginTop: "18px" }}>
              {result}
            </p>
          )}
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
