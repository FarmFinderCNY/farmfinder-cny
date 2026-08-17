import type { FarmStand } from "@/lib/types";

function displayUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;
}

export function StandCard({ stand }: { stand: FarmStand }) {
  const location = [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", ");

  return (
    <article className="stand-card">
      <div className="card-topline">
        <span className="status"><i /> Open listing</span>
        {stand.is_verified && <span className="verified">✓ Verified</span>}
      </div>
      <h3>{stand.name}</h3>
      <p className="location">{location || "Central New York"}</p>
      {stand.description && <p className="description">{stand.description}</p>}
      <dl>
        {stand.hours && <><dt>Hours</dt><dd>{stand.hours}</dd></>}
        {stand.payment_methods && <><dt>Payment</dt><dd>{stand.payment_methods}</dd></>}
      </dl>
      <div className="card-links">
        {stand.website && <a href={displayUrl(stand.website)} target="_blank" rel="noreferrer">Website ↗</a>}
        {stand.phone && <a href={`tel:${stand.phone}`}>{stand.phone}</a>}
      </div>
    </article>
  );
}
