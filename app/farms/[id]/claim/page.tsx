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

  if (stand.owner_user_id) {
    return (
      <main className="shell">
        <section style={{ padding: "60px 0" }}>
          <p className="eyebrow">Farm ownership</p>
          <h1>{stand.name}</h1>

          <p>This farm has already been claimed by its owner.</p>

          <Link className="primary-button" href={`/farms/${stand.id}`}>
            Back to farm
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section style={{ maxWidth: "650px", padding: "60px 0" }}>
        <p className="eyebrow">Farm ownership</p>

        <h1>Claim {stand.name}</h1>

        <p>
          Are you the owner or authorized manager of this farm?
          Submit an ownership request and FarmFinder CNY will review
          it before giving your account access to manage the listing.
        </p>

        <div style={{ marginTop: "30px" }}>
          <Link
            className="primary-button"
            href={`/farmer?claim=${stand.id}`}
          >
            Continue ownership claim
          </Link>
        </div>

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
