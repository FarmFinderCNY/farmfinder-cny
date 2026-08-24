/* eslint-disable @next/next/no-img-element */
import type { FarmStand } from "@/lib/types";
import Link from "next/link";

export function StandCard({ stand }: { stand: FarmStand }) {
  const location = [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", ");
  const directions = stand.latitude !== null && stand.longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${stand.latitude},${stand.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

  return (
    <article className="stand-card">
      {stand.photo_url && <img className="stand-photo" src={stand.photo_url} alt={`${stand.name} farm`} />}
      <div className="card-topline">
        <span className="status"><i /> Open listing</span>
        {stand.is_verified && <span className="verified">✓ Verified</span>}
      </div>
      <h3>{stand.name}</h3>
      <p className="location">{location || "Central New York"}</p>
     
     {stand.inventory && stand.inventory.length > 0 && (
  <div className="inventory-summary">
    <strong>
      {stand.inventory.filter((item) => item.status !== "sold_out").length} items available
    </strong>

    {stand.inventory_updated_at && (
      <span>
        Updated {new Date(stand.inventory_updated_at).toLocaleString()}
      </span>
    )}
  </div>
)}
 
      {stand.product_categories.length > 0 && <div className="category-chips">{stand.product_categories.slice(0, 4).map((category) => <span key={category}>{category}</span>)}</div>}
    <div className="card-links">
      <div className="card-links">
        <Link href={`/farms/${stand.id}`}>View details</Link>
        <a href={directions} target="_blank" rel="noreferrer">Directions ↗</a>
      </div>
    </article>
  );
}
