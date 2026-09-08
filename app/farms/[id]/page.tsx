/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveFarmStand } from "@/lib/supabase";
import NotifyMeForm from "@/app/components/NotifyMeForm";
import UberDeliveryQuote from "@/app/components/UberDeliveryQuote";
import { getGrowingPracticeLabel } from "@/lib/growing-practices";
import { FarmEngagementTracker } from "@/components/farm-engagement-tracker";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params; const stand = await getActiveFarmStand(id);
  return stand ? { title: `${stand.name} | FarmFinder CNY`, description: stand.description ?? `Visit ${stand.name} in Central New York.` } : {};
}

export default async function FarmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const stand = await getActiveFarmStand(id); if (!stand) notFound();
  const isMarket = stand.listing_type === "farmers_market";
  const vendors = (stand.market_vendors ?? []).filter((vendor) => vendor.is_attending);
  const address = [stand.address, stand.city, stand.state, stand.zip_code].filter(Boolean).join(", ");
  const directions = stand.latitude !== null && stand.longitude !== null ? `https://www.google.com/maps/dir/?api=1&destination=${stand.latitude},${stand.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const website = stand.website && (stand.website.startsWith("http") ? stand.website : `https://${stand.website}`);
  const availableToday = (stand.inventory ?? []).filter((item) => item.status === "available" || item.status === "low");
  const farmerUpdatedAt = stand.farmer_inventory_updated_at ? new Date(stand.farmer_inventory_updated_at).getTime() : null;
  const now = Date.now(); const updatedWithinSevenDays = Boolean(farmerUpdatedAt && now - farmerUpdatedAt >= 0 && now - farmerUpdatedAt < 7 * 24 * 60 * 60 * 1000);

  return <main>
    <FarmEngagementTracker farmId={stand.id} />
    <nav className="nav shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><Link className="nav-link" href="/">← All listings</Link></nav>
    <article className="farm-detail shell"><div className="farm-detail-copy">
      <div className="card-topline"><span className="status"><i /> Active listing</span><div className="verification-badges">{isMarket && <span className="verified">🧺 Farmers Market</span>}{stand.is_verified && <span className="verified">✓ Listing verified</span>}{!isMarket && stand.is_verified && <span className="owner-verified">🌾 Owner verified</span>}{stand.owner_user_id && <span className="owner-managed">● Owner managed</span>}</div></div>
      <h1>{stand.name}</h1><p className="farm-address">{address}</p>{stand.description && <p className="farm-description">{stand.description}</p>}

      {isMarket ? <section className="live-inventory" aria-labelledby="market-vendors-heading">
        <div className="live-inventory-heading"><div><p className="eyebrow">Market directory</p><strong id="market-vendors-heading">Vendors at this market</strong></div><span className="inventory-updated">{vendors.length} {vendors.length === 1 ? "vendor" : "vendors"}</span></div>
        {vendors.length > 0 ? <div className="live-inventory-items">{vendors.map((vendor) => <div className="live-inventory-item" key={vendor.id}><div className="inventory-product-main"><strong>{vendor.vendor_name}</strong>{vendor.note && <span>{vendor.note}</span>}</div>{vendor.linked_farm_id && <Link className="text-button" href={`/farms/${vendor.linked_farm_id}`}>View farm →</Link>}</div>)}</div> : <div className="availability-note"><strong>Vendor list coming soon</strong><span>This market has not published its vendor list yet. Check back before the next market day.</span></div>}
      </section> : <>
        {(stand.growing_practices?.length ?? 0) > 0 && <section className="growing-practices"><div className="growing-practices-heading"><div><p className="eyebrow">Reported by the farm</p><h2>Growing practices</h2></div><span>🌱</span></div><div className="practice-chips">{stand.growing_practices?.map((practice) => <span key={practice}>{getGrowingPracticeLabel(practice)}</span>)}</div>{stand.growing_practices_note && <p className="practice-note">{stand.growing_practices_note}</p>}</section>}
        {stand.farmer_inventory_updated_at && !updatedWithinSevenDays && stand.product_categories.length > 0 && <div className="category-group"><p className="category-label">Usually offers</p><div className="category-chips">{stand.product_categories.map((category) => <span key={category}>{category}</span>)}</div></div>}
        {updatedWithinSevenDays && availableToday.length > 0 && <section className="live-inventory"><div className="live-inventory-heading"><div><p className="eyebrow">Live inventory</p><strong>Available today</strong></div></div><div className="live-inventory-items">{availableToday.map((item) => <div className="live-inventory-item" key={item.id}><div className="inventory-product-main"><strong>{item.name}</strong>{item.status === "low" && <span className="inventory-low">Low stock</span>}</div><div className="inventory-product-meta">{item.quantity && <span>{item.quantity}</span>}{item.price && <span>{item.price}</span>}</div></div>)}</div></section>}
        {(!updatedWithinSevenDays || availableToday.length === 0) && <div className="availability-note"><strong>Live availability</strong><span>{!stand.farmer_inventory_updated_at ? "Live availability hasn’t been confirmed by the farm yet. Contact the farm before making a special trip." : !updatedWithinSevenDays ? "The farm’s last inventory update is more than seven days old. Contact the farm before making a special trip." : "No products are currently marked available. Contact the farm before making a special trip."}</span></div>}
      </>}

      <dl className="farm-facts">{stand.hours && <><dt>{isMarket ? "Market hours" : "Hours"}</dt><dd>{stand.hours}</dd></>}{stand.payment_methods && <><dt>Payment</dt><dd>{stand.payment_methods}</dd></>}{stand.phone && <><dt>Phone</dt><dd><a href={`tel:${stand.phone}`}>{stand.phone}</a></dd></>}</dl>
      <div className="detail-actions"><a className="primary-button" href={directions} data-farm-event="directions_click" target="_blank" rel="noreferrer">Get directions <span>↗</span></a>{website && <a className="text-button" href={website} data-farm-event="website_click" target="_blank" rel="noreferrer">Visit website ↗</a>}{!stand.owner_user_id && !stand.is_verified && <Link className="text-button" href={`/farms/${stand.id}/claim`}>🌾 Manage this {isMarket ? "market" : "farm"}? Connect account</Link>}{!isMarket && <NotifyMeForm farmId={stand.id} />}{!isMarket && stand.address && stand.city && stand.state && stand.zip_code && <UberDeliveryQuote pickup={{ street: stand.address, city: stand.city, state: stand.state, zip: stand.zip_code }} />}</div>
    </div>{stand.photo_url ? <div className="farm-detail-visual has-photo"><img src={stand.photo_url} alt={isMarket ? `${stand.name} farmers market` : `${stand.name} farm`} /></div> : <div className="farm-detail-visual"><span>{isMarket ? "Local vendors. One community market." : "Grown in Central New York"}</span></div>}</article>
    <footer className="footer shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><p>Helping Central New York find food grown closer to home.</p></footer>
  </main>;
}
