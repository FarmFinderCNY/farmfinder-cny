import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  company_website?: unknown;
};

function requiredText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  let body: ContactPayload;
  try {
    body = await request.json() as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (typeof body.company_website === "string" && body.company_website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const name = requiredText(body.name, 100);
  const email = requiredText(body.email, 320);
  const message = requiredText(body.message, 2000);
  if (!name || !email || !message || message.length < 10 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please check the form fields." }, { status: 400 });
  }

  const { error } = await getSupabaseClient().from("contact_messages").insert({
    name,
    email: email.toLowerCase(),
    message,
    status: "new",
  });

  if (error) {
    console.error("Contact message insert failed:", error.message);
    return NextResponse.json({ error: "Unable to save your message." }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = "farmfindercny@gmail.com";
  let notified = false;

  if (resendKey && adminEmail) {
    try {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FarmFinder CNY <notifications@send.farmfindercny.com>",
          to: [adminEmail],
          reply_to: email.toLowerCase(),
          subject: `New FarmFinder message from ${name}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123f2d"><h1>New contact message</h1><p><strong>From:</strong> ${escapeHtml(name)} (${escapeHtml(email.toLowerCase())})</p><div style="white-space:pre-wrap">${escapeHtml(message)}</div><p><a href="https://www.farmfindercny.com/admin" style="display:inline-block;padding:12px 18px;background:#123f2d;color:white;text-decoration:none;border-radius:6px">Open admin</a></p></div>`,
        }),
      });
      notified = emailResponse.ok;
      if (!emailResponse.ok) console.error("Contact notification failed:", await emailResponse.text());
    } catch (notificationError) {
      console.error("Contact notification request failed:", notificationError);
    }
  } else {
    console.warn("Contact message saved without email notification because email settings are missing.");
  }

  return NextResponse.json({ ok: true, notified }, { status: 201 });
}
