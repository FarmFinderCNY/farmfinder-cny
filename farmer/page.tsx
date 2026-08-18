import Link from "next/link";
import { FarmerPortal } from "@/components/farmer-portal";

export const metadata = { title: "Farmer Portal | FarmFinder CNY", robots: { index: false, follow: false } };

export default function FarmerPage() {
  return <main><nav className="nav shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><Link className="nav-link" href="/">← Public website</Link></nav><div className="shell"><FarmerPortal /></div></main>;
}
