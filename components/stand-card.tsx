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
      {stand.description && <p className="description">{stand.description}</p>}
      {stand.inventory && stand.inventory.length > 0 && (
  <div className="live-inventory">
    <div className="live-inventory-heading">
      <strong>Available now</strong>

      {stand.inventory_updated_at && (
        <span>
          Updated{" "}
          {new Date(stand.inventory_updated_at).toLocaleString()}
        </span>
      )}
    </div>

    <div className="live-inventory-items">
    {stand.inventory && stand.inventory.length > 0 && (
  <section className="live-inventory">
    <div className="live-inventory-heading">
      <div>
        <p className="eyebrow">Fresh at the stand</p>
        <strong>Available now</strong>
      </div>

      {stand.inventory_updated_at && (
        <span className="inventory-updated">
          Updated{" "}
          {new Date(stand.inventory_updated_at).toLocaleString()}
        </span>
      )}
    </div>

    <div className="live-inventory-items">
      {stand.inventory
        .filter((item) => item.status !== "sold_out")
        .slice(0, 4)
        .map((item) => (
          <article className="live-inventory-item" key={item.id}>
            <div className="inventory-product-main">
              <strong>{item.name}</strong>

              {item.status === "low" && (
                <span className="inventory-low">Low stock</span>
              )}
            </div>

            <div className="inventory-product-meta">
              {item.quantity && (
                <span>{item.quantity}</span>
              )}

              {item.price && (
                <span>{item.price}</span>
              )}
            </div>
          </article>
        ))}
    </div>
  </section>
)}
          </div>
        ))}
    </div>
  </div>
)}
      {stand.product_categories.length > 0 && <div className="category-chips">{stand.product_categories.slice(0, 4).map((category) => <span key={category}>{category}</span>)}</div>}
      <dl>
        {stand.hours && <><dt>Hours</dt><dd>{stand.hours}</dd></>}
        {stand.payment_methods && <><dt>Payment</dt><dd>{stand.payment_methods}</dd></>}
      </dl>
      <div className="card-links">
        <Link href={`/farms/${stand.id}`}>View details</Link>
        <a href={directions} target="_blank" rel="noreferrer">Directions ↗</a>
      </div>
    </article>
  );
}
