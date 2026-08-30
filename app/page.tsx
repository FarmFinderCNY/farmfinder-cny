import { PwaRegister } from "@/components/pwa-register";
import { StandDirectory } from "@/components/stand-directory";
import { getActiveFarmStands, hasSupabaseConfig } from "@/lib/supabase";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const configured = hasSupabaseConfig();
  const stands = await getActiveFarmStands();

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top"><span>FF</span> FarmFinder <b>CNY</b></a>
        <div className="nav-actions"><PwaRegister /><a className="nav-link" href="#stands">Find food</a><Link className="nav-link nav-submit" href="/farmer">For farmers</Link></div>
      </nav>

      <header id="top" className="slideshow-hero">
        <div className="hero-slides" aria-hidden="true"><div className="hero-slide hero-slide-one" /><div className="hero-slide hero-slide-two" /><div className="hero-slide hero-slide-three" /><div className="hero-slide hero-slide-four" /><div className="hero-slide hero-slide-five"><div className="app-story-scene"><div className="app-story-label">See what&apos;s fresh before you go</div><div className="app-story-phone"><div className="app-story-notch" /><div className="app-story-screen"><div className="app-story-brand">FarmFinder CNY</div><div className="app-story-search">Search farms or products</div><div className="app-story-chips"><span>Sweet Corn</span><span>Tomatoes</span><span>Peppers</span></div><div className="app-story-map"><i className="pin pin-one">●</i><i className="pin pin-two">●</i><i className="pin pin-three">●</i></div><div className="app-story-farm"><strong>Nearby Farm Stand</strong><small>● Available today</small><div><span>🌽 Sweet Corn</span><b>In stock</b></div><div><span>🍅 Tomatoes</span><b>In stock</b></div><button type="button" tabIndex={-1}>Directions</button></div></div></div><div className="app-story-stand"><span>FRESH</span><strong>LOCAL</strong><em>PRODUCE</em><div>🌽 🍅 🫑</div></div></div></div></div>
        <div className="hero-shade" />
        <div className="slideshow-content shell">
          <p className="eyebrow">FarmFinder CNY</p>
          <h1>Fresh local food.<br /><em>Available today.</em></h1>
          <p className="lede">Search nearby farms, see what&apos;s fresh, and buy directly from local growers.</p>
          <div className="keep-ny-callout"><span aria-hidden="true">♥</span><div><strong>Keep NY Farming</strong><p>Find it local. Buy it local. Support the people growing our food.</p></div></div>
          <div className="hero-actions"><a className="primary-button" href="#stands">Find fresh food <span>↓</span></a></div>
        </div>
      </header>

      <div className="marquee" aria-hidden="true"><span>KEEP NY FARMING</span><i>✦</i><span>FIND IT LOCAL</span><i>✦</i><span>BUY IT LOCAL</span><i>✦</i><span>SUPPORT LOCAL FARMS</span></div>

      <section id="stands" className="stands-section shell" style={{ paddingTop: "1.25rem" }}>
        <div className="section-heading"><div><p className="eyebrow">What are you looking for today?</p><h2>Find it nearby.</h2></div><p>{stands.length} active{" "}{stands.length === 1 ? "stand" : "stands"}</p></div>
        {!configured && <div className="notice"><strong>Almost ready.</strong> Add the Supabase publishable key in Vercel to load live farm stands.</div>}
        {configured && stands.length === 0 ? <div className="empty-state"><span>🌱</span><h3>The first listings are taking root.</h3><p>Active farm stands will show here automatically.</p></div> : <StandDirectory stands={stands} />}
      </section>

      <section className="shell" style={{ padding: "1.5rem 0 2.5rem" }}>
        <div className="notice" style={{ textAlign: "center", padding: "1.5rem" }}>
          <p className="eyebrow">FarmFinder connects farms and shoppers</p>
          <h2 style={{ margin: "0.35rem 0 0.65rem" }}>Farmers share what&apos;s fresh. You find it nearby.</h2>
          <p>Search for local food, choose a farm, and get directions. Farmers can keep their products current so shoppers know what&apos;s available before they go.</p>
          <p style={{ marginTop: "0.85rem", fontWeight: 800 }}>Find it local. Buy it local. Keep NY Farming.</p>
          <div style={{ marginTop: "1rem" }}><Link href="/farmer">Farmers: manage your listing →</Link>{" · "}<Link href="/list-your-farm">Add or suggest a farm →</Link></div>
        </div>
      </section>

      <section className="shell" style={{ paddingBottom: "2rem" }}><div className="notice" style={{ textAlign: "center", padding: "1rem 1.5rem" }}><p><strong>📰 Coming October 2026:</strong> FarmFinder CNY is scheduled to be featured in <em>In Good Health</em>.</p></div></section>

      <footer className="footer shell"><a className="brand" href="#top"><span>FF</span> FarmFinder <b>CNY</b></a><p><strong>Find it local. Buy it local. Keep NY Farming.</strong>{" "}<Link href="/contact">Contact Ronald</Link>{" · "}<Link href="/privacy">Privacy Policy</Link></p></footer>
    </main>
  );
}
