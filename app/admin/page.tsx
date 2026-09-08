import Link from "next/link";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminAnalytics } from "@/components/admin-analytics";
import { AdminOwnershipQueue } from "@/components/admin-ownership-queue";
import { AdminOwnerConnections } from "@/components/admin-owner-connections";

export const metadata = { title: "Admin | FarmFinder CNY", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <main className="admin-page">
    <nav className="nav shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><Link className="nav-link" href="/">← Public website</Link></nav>
    <div className="shell"><AdminDashboard /><AdminOwnerConnections /><AdminAnalytics /><AdminOwnershipQueue /></div>
  </main>;
}
