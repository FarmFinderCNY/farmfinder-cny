import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveFarmStand } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function qrUrl(target: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${encodeURIComponent(target)}`;
}

export default async function FarmSignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stand = await getActiveFarmStand(id);
  if (!stand || (!stand.is_verified && !stand.owner_user_id)) notFound();
  const target = `https://www.farmfindercny.com/farms/${stand.id}?utm_source=farm_sign&utm_medium=qr&utm_campaign=farmfinder_sign`;

  return <main className="farm-sign-page">
    <div className="farm-sign-toolbar"><Link href={`/farms/${stand.id}`}>← Back to listing</Link><button type="button" onClick={undefined} className="print-hint">Print from your browser menu</button></div>
    <section className="farm-sign">
      <div className="farm-sign-brand"><span>FF</span><strong>FarmFinder CNY</strong></div>
      <p className="eyebrow">WE’RE ON FARMFINDER</p>
      <h1>{stand.name}</h1>
      <p className="farm-sign-lead">See what’s fresh before your next visit.</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img className="farm-sign-qr" src={qrUrl(target)} alt={`QR code for ${stand.name} on FarmFinder`} />
      <strong className="farm-sign-scan">SCAN TO VIEW & FOLLOW THIS FARM</strong>
      <p>Check current availability, get directions, and follow this farm for fresh updates.</p>
      <div className="farm-sign-url">farmfindercny.com</div>
      <small>{stand.owner_user_id ? "● Owner managed on FarmFinder" : "✓ Verified FarmFinder listing"}</small>
    </section>
  </main>;
}
