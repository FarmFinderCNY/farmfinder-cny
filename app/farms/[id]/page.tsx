/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveFarmStand } from "@/lib/supabase";
import NotifyMeForm from "@/app/components/NotifyMeForm";
import { getGrowingPracticeLabel } from "@/lib/growing-practices";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const stand = await getActiveFarmStand(id);
  return stand ? { title: `${stand.name} | FarmFinder CNY`, description: stand.description ?? `Visit ${stand.name} in Central New York.` } : {};
}

export default async function FarmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stand = await getActiveFarmStand(id);
  if (!stand) notFound();

  const address = [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", ");
  const directions = stand.latitude !== null && stand.longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${stand.latitude},${stand.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const website = stand.website && (stand.website.startsWith("http") ? stand.website : `https://${stand.website}`);
  const availableToday = (stand.inventory ?? []).filter(
    (item) => item.status === "available" || item.status === "low"
  );
  const farmerUpdatedAt = stand.farmer_inventory_updated_at ? new Date(stand.farmer_inventory_updated_at).getTime() : null;
  const updatedWithinSevenDays = Boolean(
    farmerUpdatedAt && Date.now() - farmerUpdatedAt >= 0 && Date.now() - farmerUpdatedAt < 7 * 24 * 60 * 60 * 1000
  );

  return <main>
    <nav className="nav shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><Link className="nav-link" href="/">← All farm stands</Link></nav>
    <article className="farm-detail shell">
      <div className="farm-detail-copy">
        <div className="card-topline">
          <span className="status"><i /> Active listing</span>
          <div className="verification-badges">
            {stand.is_verified && <span className="verified">✓ Listing verified</span>}
            {stand.is_verified && <span className="owner-verified">🌾 Owner verified</span>}
            {stand.owner_user_id && <span className="owner-managed">● Owner managed</span>}
          </div>
        </div>
        <h1>{stand.name}</h1><p className="farm-address">{address}</p>
        {stand.description && <p className="farm-description">{stand.description}</p>}
        {(stand.growing_practices?.length ?? 0) > 0 && <section className="growing-practices" aria-labelledby="growing-practices-heading">
          <div className="growing-practices-heading"><div><p className="eyebrow">Reported by the farm</p><h2 id="growing-practices-heading">Growing practices</h2></div><span>🌱</span></div>
          <div className="practice-chips">{stand.growing_practices?.map((practice) => <span key={practice}>{getGrowingPracticeLabel(practice)}</span>)}</div>
          {stand.growing_practices?.includes("certified_organic") && stand.organic_certifier && <p className="organic-certifier"><strong>Certifying organization:</strong> {stand.organic_certifier}</p>}
          {stand.growing_practices_note && <p className="practice-note">{stand.growing_practices_note}</p>}
          <p className="practice-disclaimer">These practices are reported by the farm and may vary by crop. Contact the farm with specific questions.</p>
        </section>}
        {stand.farmer_inventory_updated_at && !updatedWithinSevenDays && stand.product_categories.length > 0 && (
          <div className="category-group">
            <p className="category-label">Usually offers</p>
            <div className="category-chips">{stand.product_categories.map((category) => <span key={category}>{category}</span>)}</div>
          </div>
        )}
        {updatedWithinSevenDays && availableToday.length > 0 && (
          <section className="live-inventory" aria-labelledby="available-today-heading">
            <div className="live-inventory-heading">
              <div>
                <p className="eyebrow">Live inventory</p>
                <strong id="available-today-heading">Available today</strong>
              </div>
              {stand.farmer_inventory_updated_at && (
                <span className="inventory-updated">
                  Updated{" "}
                  {new Date(stand.farmer_inventory_updated_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
            <div className="live-inventory-items">
              {availableToday.map((item) => (
                <div className="live-inventory-item" key={item.id}>
                  <div className="inventory-product-main">
                    <strong>{item.name}</strong>
                    {item.status === "low" && <span className="inventory-low">Low stock</span>}
                  </div>
                  {(item.quantity || item.price) && (
                    <div className="inventory-product-meta">
                      {item.quantity && <span>{item.quantity}</span>}
                      {item.price && <span>{item.price}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
        {(!updatedWithinSevenDays || availableToday.length === 0) && (
          <div className="availability-note">
            <strong>Live availability</strong>
            <span>
              {!stand.farmer_inventory_updated_at
                ? "Live availability hasn’t been confirmed by the farm yet. Contact the farm before making a special trip."
                : !updatedWithinSevenDays
                  ? "The farm’s last inventory update is more than seven days old. Contact the farm before making a special trip."
                  : "No products are currently marked available. Contact the farm before making a special trip."}
            </span>
          </div>
        )}
        <dl className="farm-facts">
          {stand.hours && <><dt>Hours</dt><dd>{stand.hours}</dd></>}
          {stand.payment_methods && <><dt>Payment</dt><dd>{stand.payment_methods}</dd></>}
          {stand.phone && <><dt>Phone</dt><dd><a href={`tel:${stand.phone}`}>{stand.phone}</a></dd></>}
        </dl>
       <div className="detail-actions">
  <a
    className="primary-button"
    href={directions}
    target="_blank"
    rel="noreferrer"
  >
    Get directions <span>↗</span>
  </a>

  {website && (
    <a
      className="text-button"
      href={website}
      target="_blank"
      rel="noreferrer"
    >
      Visit website ↗
    </a>
  )}

  {!stand.owner_user_id && (
    <Link
      className="text-button"
      href={`/farms/${stand.id}/claim`}
    >
      🌾 Manage this farm? Connect account
    </Link>
  )}
    <NotifyMeForm farmId={stand.id} />     
</div>
      </div>
      {stand.photo_url
        ? <div className="farm-detail-visual has-photo"><img src={stand.photo_url} alt={`${stand.name} farm`} /></div>
        : <div className="farm-detail-visual"><span>Grown in Central New York</span></div>}
    </article>
    <footer className="footer shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><p>Helping Central New York find food grown closer to home.</p></footer>
  </main>;
}
