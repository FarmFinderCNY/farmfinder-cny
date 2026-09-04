/* eslint-disable @next/next/no-img-element */
"use client";

import type { FarmStand } from "@/lib/types";
import Link from "next/link";
import { getGrowingPracticeCardBadge } from "@/lib/growing-practices";
import { recordAnalyticsEvent } from "@/components/analytics-tracker";

type InventoryItem = FarmStand["inventory"][number];

export function StandCard({ stand, distanceMiles = null, matchingProducts = [], listedProductMatch = false, searchLabel = "" }: {
  stand: FarmStand;
  distanceMiles?: number | null;
  matchingProducts?: InventoryItem[];
  listedProductMatch?: boolean;
  searchLabel?: string;
}) {
  const location = [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", ");
  const directions = stand.latitude !== null && stand.longitude !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${stand.latitude},${stand.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  const isMarket = stand.listing_type === "farmers_market";
  const attendingVendors = (stand.market_vendors ?? []).filter((vendor) => vendor.is_attending);
  const availableToday = (stand.inventory ?? []).filter((item) => item.status === "available" || item.status === "low");
  const inventoryUpdatedAt = stand.farmer_inventory_updated_at ? new Date(stand.farmer_inventory_updated_at).getTime() : null;
  const now = Date.now();
  const updatedWithinSevenDays = Boolean(inventoryUpdatedAt && now - inventoryUpdatedAt >= 0 && now - inventoryUpdatedAt < 7 * 24 * 60 * 60 * 1000);
  const practiceBadge = !isMarket ? getGrowingPracticeCardBadge(stand.growing_practices ?? [], stand.organic_certifier) : null;

  return (
    <article className="stand-card">
      {stand.photo_url && <img className="stand-photo" src={stand.photo_url} alt={isMarket ? `${stand.name} farmers market` : `${stand.name} farm`} />}
      <div className="card-topline">
        <span className="status"><i /> Active listing</span>
        <div className="verification-badges">
          {isMarket && <span className="verified">🧺 Farmers Market</span>}
          {stand.is_verified && <span className="verified">✓ Listing verified</span>}
          {!isMarket && stand.is_verified && <span className="owner-verified">🌾 Owner verified</span>}
          {stand.owner_user_id && <span className="owner-managed">● Owner managed</span>}
        </div>
      </div>
      <h3>{stand.name}</h3>
      <p className="location">{[stand.city, stand.state].filter(Boolean).join(", ") || location || "Central New York"}{distanceMiles !== null && <strong className="distance"> · {distanceMiles < 10 ? distanceMiles.toFixed(1) : Math.round(distanceMiles)} miles away</strong>}</p>
      {isMarket ? (
        <div className="inventory-summary">
          <strong>Vendors at this market</strong>
          <span>{attendingVendors.length > 0 ? attendingVendors.slice(0, 3).map((vendor) => vendor.vendor_name).join(" · ") + (attendingVendors.length > 3 ? ` · +${attendingVendors.length - 3} more` : "") : "Vendor list coming soon"}</span>
        </div>
      ) : <>
        {practiceBadge && <span className="practice-card-badge">🌱 {practiceBadge}</span>}
        {stand.submission_type === "community" && <p className="community-attribution">Community submitted{stand.submitted_by_display_name ? ` by ${stand.submitted_by_display_name}` : ""} · Not yet owner-verified</p>}
        {matchingProducts.length > 0 && <div className="inventory-summary"><strong>Matches your search</strong><span>{matchingProducts.slice(0, 3).map((item) => item.status === "available" ? `${item.name} · Available` : item.status === "low" ? `${item.name} · Low` : `${item.name} · Sold out`).join(" · ")}{matchingProducts.length > 3 ? ` · +${matchingProducts.length - 3} more` : ""}</span></div>}
        {matchingProducts.length === 0 && listedProductMatch && searchLabel && <div className="inventory-summary"><strong>Matches your search</strong><span>{searchLabel}</span></div>}
        {matchingProducts.length === 0 && !listedProductMatch && updatedWithinSevenDays && availableToday.length > 0 && <div className="inventory-summary"><strong>Available today</strong><span>{availableToday.slice(0, 3).map((item) => item.status === "low" ? `${item.name} (low)` : item.name).join(" · ")}{availableToday.length > 3 ? ` · +${availableToday.length - 3} more` : ""}</span>{stand.farmer_inventory_updated_at && <span>Updated {new Date(stand.farmer_inventory_updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}</div>}
        {matchingProducts.length === 0 && !listedProductMatch && (!updatedWithinSevenDays || availableToday.length === 0) && stand.product_categories.length > 0 && <div className="category-group"><div className="category-chips">{stand.product_categories.slice(0, 4).map((category) => <span key={category}>{category}</span>)}</div></div>}
      </>}
      <div className="card-links">
        <Link href={`/farms/${stand.id}`} onClick={() => recordAnalyticsEvent("farm_detail_view", { farmId: stand.id })}>{isMarket ? "View market" : "View details"}</Link>
        <a href={directions} target="_blank" rel="noreferrer" onClick={() => recordAnalyticsEvent("directions_click", { farmId: stand.id })}>Directions ↗</a>
      </div>
    </article>
  );
}
