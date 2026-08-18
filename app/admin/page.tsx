import Link from "next/link";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata = { title: "Admin | FarmFinder CNY", robots: { index: false, follow: false } };

export default function AdminPage() {
  return <main className="admin-page">
    <nav className="nav shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><Link className="nav-link" href="/">← Public website</Link></nav>
    <div className="shell"><AdminDashboard /></div>
  </main>;
}
