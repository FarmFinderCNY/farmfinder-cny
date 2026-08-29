import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveFarmStand } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ClaimFarmPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const stand = await getActiveFarmStand(id);

  if (!stand) notFound();

  if (stand.owner_user_id || stand.is_verified) {
    return (
      <main className="shell">
        <section style={{ padding: "60px 0" }}>
          <p className="eyebrow">Farm ownership</p>
          <h1>{stand.name}</h1>

          <p>{stand.owner_user_id
            ? "This farm is already connected to its owner’s account."
            : "Ownership of this farm has already been verified. The approved owner can sign in to the Farmer Portal using the same email address provided to FarmFinder CNY."}</p>

          <div className="detail-actions">
            {!stand.owner_user_id && <Link className="primary-button" href="/farmer">Farmer Portal</Link>}
            <Link className={stand.owner_user_id ? "primary-button" : "text-button"} href={`/farms/${stand.id}`}>Back to farm</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section style={{ maxWidth: "650px", padding: "60px 0" }}>
        <p className="eyebrow">Farm ownership</p>

        <h1>Claim {stand.name}</h1>

        <p>Do you own or operate this farm/stand?</p>

<div className="detail-actions" style={{ marginTop: "24px" }}>
  <Link
    className="primary-button"
    href={`/farmer?claim=${stand.id}`}
  >
    Yes
  </Link>

  <Link
    className="text-button"
    href={`/farms/${stand.id}`}
  >
    No
  </Link>
</div>

<p style={{ marginTop: "18px" }}>
  If you continue, FarmFinder CNY may contact you to verify your connection
  to this farm before approving access. No proof document is required now.
</p>

        <div style={{ marginTop: "20px" }}>
          <Link
            className="text-button"
            href={`/farms/${stand.id}`}
          >
            ← Back to {stand.name}
          </Link>
        </div>
      </section>
    </main>
  );
}
