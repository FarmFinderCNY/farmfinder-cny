/* eslint-disable @next/next/no-img-element */
import type { FarmStand } from "@/lib/types";
import Link from "next/link";
import { getGrowingPracticeCardBadge } from "@/lib/growing-practices";

export function StandCard({ stand, distanceMiles = null }: { stand: FarmStand; distanceMiles?: number | null }) {
  const location = [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", ");
  const directions = stand.latitude !== null && stand.longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${stand.latitude},${stand.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  const availableToday = (stand.inventory ?? []).filter(
    (item) => item.status === "available" || item.status === "low"
  );
  const inventoryUpdatedAt = stand.farmer_inventory_updated_at ? new Date(stand.farmer_inventory_updated_at).getTime() : null;
  // Server-rendered freshness is intentionally evaluated at request time.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const updatedWithinSevenDays = Boolean(
    inventoryUpdatedAt && now - inventoryUpdatedAt >= 0 && now - inventoryUpdatedAt < 7 * 24 * 60 * 60 * 1000
  );
  const practiceBadge = getGrowingPracticeCardBadge(stand.growing_practices ?? [], stand.organic_certifier);

  return (
    <article className="stand-card">
      {stand.photo_url && <img className="stand-photo" src={stand.photo_url} alt={`${stand.name} farm`} />}
      <div className="card-topline">
        <span className="status"><i /> Active listing</span>
        <div className="verification-badges">
          {stand.is_verified && <span className="verified">✓ Listing verified</span>}
          {stand.is_verified && <span className="owner-verified">🌾 Owner verified</span>}
          {stand.owner_user_id && <span className="owner-managed">● Owner managed</span>}
        </div>
      </div>
      <h3>{stand.name}</h3>
      <p className="location">{[stand.city, stand.state].filter(Boolean).join(", ") || location || "Central New York"}{distanceMiles !== null && <strong className="distance"> · {distanceMiles < 10 ? distanceMiles.toFixed(1) : Math.round(distanceMiles)} miles away</strong>}</p>
      {practiceBadge && <span className="practice-card-badge">🌱 {practiceBadge}</span>}
      {stand.submission_type === "community" && <p className="community-attribution">Community submitted{stand.submitted_by_display_name ? ` by ${stand.submitted_by_display_name}` : ""} · Not yet owner-verified</p>}

            {updatedWithinSevenDays && availableToday.length > 0 && (
        <div className="inventory-summary">
          <strong>Available today</strong>
          <span>
            {availableToday.slice(0, 3).map((item) => item.status === "low" ? `${item.name} (low)` : item.name).join(" · ")}
            {availableToday.length > 3 ? ` · +${availableToday.length - 3} more` : ""}
          </span>
          {stand.farmer_inventory_updated_at && (
            <span>Updated {new Date(stand.farmer_inventory_updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
          )}
        </div>
      )}
      {(!updatedWithinSevenDays || availableToday.length === 0) && stand.product_categories.length > 0 && (
  <div className="category-group">
    <div className="category-chips">
      {stand.product_categories.slice(0, 4).map((category) => (
        <span key={category}>{category}</span>
      ))}
    </div>
  </div>
)}
      <div className="card-links">
        <Link href={`/farms/${stand.id}`}>View details</Link>
        <a href={directions} target="_blank" rel="noreferrer">Directions ↗</a>
      </div>
    </article>
  );
}
