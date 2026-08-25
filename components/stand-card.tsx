/* eslint-disable @next/next/no-img-element */
import type { FarmStand } from "@/lib/types";
import Link from "next/link";

export function StandCard({ stand, distanceMiles = null }: { stand: FarmStand; distanceMiles?: number | null }) {
  const location = [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", ");
  const directions = stand.latitude !== null && stand.longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${stand.latitude},${stand.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  return (
    const availableToday = (stand.inventory ?? []).filter(
  (item) => item.status !== "sold_out"
);
    <article className="stand-card">
      {stand.photo_url && <img className="stand-photo" src={stand.photo_url} alt={`${stand.name} farm`} />}
      <div className="card-topline">
        <span className="status"><i /> Open listing</span>
        {stand.is_verified && <span className="verified">✓ Verified</span>}
      </div>
      <h3>{stand.name}</h3>
      <p className="location">{[stand.city, stand.state].filter(Boolean).join(", ") || location || "Central New York"}{distanceMiles !== null && <strong className="distance"> · {distanceMiles < 10 ? distanceMiles.toFixed(1) : Math.round(distanceMiles)} miles away</strong>}</p>
      {stand.submission_type === "community" && <p className="community-attribution">Community submitted{stand.submitted_by_display_name ? ` by ${stand.submitted_by_display_name}` : ""} · Not yet owner-verified</p>}
     
    {availableToday.length > 0 && (
  <div className="inventory-summary">
    <strong>Available today</strong>

    <span>
      {availableToday
        .slice(0, 3)
        .map((item) =>
          item.status === "low" ? `${item.name} (low)` : item.name
        )
        .join(" · ")}
      {availableToday.length > 3
        ? ` · +${availableToday.length - 3} more`
        : ""}
    </span>

    {stand.inventory_updated_at && (
      <span>
        Updated{" "}
        {new Date(stand.inventory_updated_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}
      </span>
    )}
  </div>
)}
 
      {stand.product_categories.length > 0 && <div className="category-chips">{stand.product_categories.slice(0, 4).map((category) => <span key={category}>{category}</span>)}</div>}
    <div className="card-links">
      
        <Link href={`/farms/${stand.id}`}>View details</Link>
        <a href={directions} target="_blank" rel="noreferrer">Directions ↗</a>
      </div>
    </article>
  );
}
