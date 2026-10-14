import { Suspense } from "react";
import Link from "next/link";
import { CustomerDashboard } from "@/components/customer-dashboard";
import { getActiveFarmStands } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Farms | FarmFinder CNY", robots: { index: false, follow: false } };

export default async function MyFarmsPage() {
  const stands = await getActiveFarmStands();
  return <main>
    <nav className="nav shell" aria-label="Main navigation"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><div className="nav-actions"><Link className="nav-link" href="/#stands">Browse farms</Link><Link className="nav-link" href="/farmer">Farmer portal</Link></div></nav>
    <div className="shell customer-shell"><Suspense fallback={<p role="status">Loading My Farms…</p>}><CustomerDashboard stands={stands} /></Suspense></div>
    <footer className="footer shell"><Link href="/">Back to FarmFinder</Link><Link href="/privacy">Privacy Policy</Link></footer>
  </main>;
}
