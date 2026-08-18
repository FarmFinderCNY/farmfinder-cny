import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

type SubmissionPayload = {
  farm_name?: unknown;
  address?: unknown;
  city?: unknown;
  state?: unknown;
  zip_code?: unknown;
  description?: unknown;
  public_phone?: unknown;
  website?: unknown;
  hours?: unknown;
  payment_methods?: unknown;
  product_categories?: unknown;
  contact_name?: unknown;
  contact_email?: unknown;
  contact_phone?: unknown;
  consent_to_publish?: unknown;
  company_website?: unknown;
};

function requiredText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= maxLength ? text : null;
}

function optionalText(value: unknown, maxLength: number) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text.length <= maxLength ? text || null : undefined;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  let body: SubmissionPayload;
  try {
    body = await request.json() as SubmissionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Quietly accept bot submissions caught by the hidden field.
  if (typeof body.company_website === "string" && body.company_website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const farmName = requiredText(body.farm_name, 120);
  const address = requiredText(body.address, 180);
  const city = requiredText(body.city, 100);
  const state = requiredText(body.state, 2);
  const zipCode = requiredText(body.zip_code, 10);
  const contactName = requiredText(body.contact_name, 120);
  const contactEmail = requiredText(body.contact_email, 254);
  const emailIsValid = contactEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);
  const zipIsValid = zipCode && /^\d{5}(?:-\d{4})?$/.test(zipCode);

  const description = optionalText(body.description, 1000);
  const publicPhone = optionalText(body.public_phone, 30);
  const website = optionalText(body.website, 250);
  const hours = optionalText(body.hours, 300);
  const paymentMethods = optionalText(body.payment_methods, 200);
  const contactPhone = optionalText(body.contact_phone, 30);
  const allowedCategories = new Set(["Produce", "Meat", "Eggs", "Dairy", "Maple", "Honey", "Flowers", "Pumpkins", "Baked goods", "Other"]);
  const productCategories = Array.isArray(body.product_categories)
    ? body.product_categories.filter((item): item is string => typeof item === "string" && allowedCategories.has(item))
    : [];

  if (!farmName || !address || !city || !state || !zipIsValid || !contactName || !emailIsValid || body.consent_to_publish !== true ||
      [description, publicPhone, website, hours, paymentMethods, contactPhone].includes(undefined)) {
    return NextResponse.json({ error: "Please check the form fields." }, { status: 400 });
  }

  const { error } = await getSupabaseClient().from("farm_stand_submissions").insert({
    farm_name: farmName,
    address,
    city,
    state: state.toUpperCase(),
    zip_code: zipCode,
    description,
    public_phone: publicPhone,
    website,
    hours,
    payment_methods: paymentMethods,
    product_categories: productCategories,
    contact_name: contactName,
    contact_email: contactEmail,
    contact_phone: contactPhone,
    consent_to_publish: true,
  });

  if (error) {
    console.error("Farm submission insert failed:", error.message);
    return NextResponse.json({ error: "Unable to save the submission." }, { status: 500 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.FARMFINDER_ADMIN_EMAIL;
  if (resendKey && adminEmail) {
    try {
      const safeFarmName = escapeHtml(farmName);
      const safeContactName = escapeHtml(contactName);
      const safeContactEmail = escapeHtml(contactEmail);
      const safeLocation = escapeHtml(`${address}, ${city}, ${state.toUpperCase()} ${zipCode}`);
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "FarmFinder CNY <notifications@send.farmfindercny.com>",
          to: [adminEmail],
          reply_to: contactEmail,
          subject: `New farm submission: ${farmName}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123f2d"><h1>New farm submission</h1><h2>${safeFarmName}</h2><p><strong>Location:</strong> ${safeLocation}</p><p><strong>Submitted by:</strong> ${safeContactName} (${safeContactEmail})</p><p>A new listing is waiting in your private review queue.</p><p><a href="https://www.farmfindercny.com/admin" style="display:inline-block;padding:12px 18px;background:#123f2d;color:white;text-decoration:none;border-radius:6px">Review submission</a></p></div>`,
        }),
      });

      if (!emailResponse.ok) {
        console.error("Resend notification failed:", await emailResponse.text());
      }
    } catch (notificationError) {
      // The listing is already safely stored, so an email outage must not invite duplicate submissions.
      console.error("Resend notification request failed:", notificationError);
    }
  } else {
    console.warn("Submission saved without email notification because email settings are missing.");
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
