/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveFarmStand } from "@/lib/supabase";

export const revalidate = 300;

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

  return <main>
    <nav className="nav shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><Link className="nav-link" href="/">← All farm stands</Link></nav>
    <article className="farm-detail shell">
      <div className="farm-detail-copy">
        <div className="card-topline"><span className="status"><i /> Active listing</span>{stand.is_verified && <span className="verified">✓ Verified</span>}</div>
        <h1>{stand.name}</h1><p className="farm-address">{address}</p>
        {stand.description && <p className="farm-description">{stand.description}</p>}
        {stand.product_categories.length > 0 && <div className="category-chips">{stand.product_categories.map((category) => <span key={category}>{category}</span>)}</div>}
        <dl className="farm-facts">
          {stand.hours && <><dt>Hours</dt><dd>{stand.hours}</dd></>}
          {stand.payment_methods && <><dt>Payment</dt><dd>{stand.payment_methods}</dd></>}
          {stand.phone && <><dt>Phone</dt><dd><a href={`tel:${stand.phone}`}>{stand.phone}</a></dd></>}
        </dl>
        <div className="detail-actions"><a className="primary-button" href={directions} target="_blank" rel="noreferrer">Get directions <span>↗</span></a>{website && <a className="text-button" href={website} target="_blank" rel="noreferrer">Visit website ↗</a>}</div>
      </div>
      {stand.photo_url
        ? <div className="farm-detail-visual has-photo"><img src={stand.photo_url} alt={`${stand.name} farm`} /></div>
        : <div className="farm-detail-visual"><span>Grown in Central New York</span></div>}
    </article>
    <footer className="footer shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><p>Helping Central New York find food grown closer to home.</p></footer>
  </main>;
}
