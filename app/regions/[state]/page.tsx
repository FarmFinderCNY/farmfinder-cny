import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveFarmStands } from "@/lib/supabase";
import { getStateBySlug, normalizeState } from "@/lib/regions";
import { StandDirectory } from "@/components/stand-directory";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StateRegionPage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  const stateInfo = getStateBySlug(state);
  if (!stateInfo) notFound();
  const [stateCode, stateName] = stateInfo;
  const allStands = await getActiveFarmStands();
  const stands = allStands.filter((stand) => normalizeState(stand.state) === stateCode);
  const addFarmUrl = `/list-your-farm?state=${encodeURIComponent(state)}`;

  return <main>
    <nav className="nav shell" aria-label="Main navigation"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><div className="nav-actions"><Link className="nav-link" href="/regions">Change region</Link><Link className="nav-link nav-submit" href={addFarmUrl}>Add or suggest a farm</Link></div></nav>
    <header className="shell" style={{ paddingTop: "3rem", paddingBottom: "2rem", textAlign: "center" }}><p className="eyebrow">FarmFinder across America</p><h1>{stateName}</h1><p className="lede">Discover local farms and farm stands in {stateName}.</p></header>
    <section className="stands-section shell" style={{ paddingTop: "1rem" }}><div className="section-heading"><div><p className="eyebrow">Explore local farms</p><h2>Find what’s fresh in {stateName}.</h2></div><p>{stands.length} active {stands.length === 1 ? "stand" : "stands"}</p></div>
      {stands.length > 0 ? <StandDirectory stands={stands} /> : <div className="empty-state"><span>🌱</span><h3>Help FarmFinder grow in {stateName}.</h3><p>There aren’t any active listings here yet. Know a local farm or farm stand? Help put it on the map.</p><p style={{ marginTop: "1rem" }}><Link className="primary-button" href={addFarmUrl}>Add or suggest a farm →</Link></p></div>}
    </section>
    <footer className="footer shell"><Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link><p>Started in Central New York. Growing farm by farm.</p></footer>
  </main>;
}
