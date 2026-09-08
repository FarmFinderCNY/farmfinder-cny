import type { SupabaseClient, User } from "@supabase/supabase-js";

const FARMER_PORTAL_URL = "https://www.farmfindercny.com/farmer";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function createAndSendOwnerInvitation({
  serviceClient,
  email,
  farmName,
  resendKey,
  existingUser,
}: {
  serviceClient: SupabaseClient;
  email: string;
  farmName: string;
  resendKey: string;
  existingUser?: User;
}): Promise<{ user: User; invitationSent: true; invitationSentAt: string; resendEmailId: string | null } | { error: string; detail?: string }> {
  // Generate the secure Supabase link without using Supabase's rate-limited email sender.
  const { data, error } = await serviceClient.auth.admin.generateLink({
    type: existingUser ? "magiclink" : "invite",
    email,
    options: { redirectTo: FARMER_PORTAL_URL },
  });
  if (error || !data.user || !data.properties?.action_link) {
    return { error: "The secure owner access link could not be created.", detail: error?.message };
  }

  const safeFarmName = escapeHtml(farmName);
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
      // A fresh secure link must be deliverable when an earlier email attempt failed.
      "Idempotency-Key": `owner-access-${data.user.id}-${Date.now()}`,
    },
    body: JSON.stringify({
      from: "FarmFinder CNY <notifications@send.farmfindercny.com>",
      to: [email],
      subject: `Manage ${farmName} on FarmFinder CNY`,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#123f2d;line-height:1.6"><p style="font-weight:700;text-transform:uppercase;letter-spacing:.08em">FarmFinder CNY</p><h1>Your farm is approved</h1><p>Your listing for <strong>${safeFarmName}</strong> is ready. Use the secure button below to activate your owner access and manage the farm.</p><p><a href="${escapeHtml(data.properties.action_link)}" style="display:inline-block;padding:12px 18px;background:#123f2d;color:white;text-decoration:none;border-radius:6px;font-weight:700">Activate owner access</a></p><p>After opening the link, create a password in the Farmer Portal so you can return at any time.</p><p style="color:#68756c;font-size:13px">This secure link is intended for the owner who submitted the listing. Questions? Reply to this email or contact farmfindercny@gmail.com.</p></div>`,
    }),
  });
  if (!emailResponse.ok) {
    return { error: "The owner access email could not be sent.", detail: `${emailResponse.status}: ${await emailResponse.text()}` };
  }
  const emailResult = await emailResponse.json().catch(() => null) as { id?: unknown } | null;
  const resendEmailId = typeof emailResult?.id === "string" ? emailResult.id : null;
  const invitationSentAt = new Date().toISOString();
  const { data: updatedUser, error: metadataError } = await serviceClient.auth.admin.updateUserById(data.user.id, {
    user_metadata: {
      ...data.user.user_metadata,
      owner_access_invitation_sent_at: invitationSentAt,
      owner_access_invitation_email_id: resendEmailId,
    },
  });
  if (metadataError) console.error("Owner invitation timestamp could not be saved:", metadataError.message);
  return { user: updatedUser.user ?? data.user, invitationSent: true, invitationSentAt, resendEmailId };
}
