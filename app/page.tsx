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
        <div className="nav-actions">
          <PwaRegister />
          <a className="nav-link" href="#stands">Browse stands</a>
          <Link className="nav-link nav-submit" href="/list-your-farm">List your farm</Link>
        </div>
      </nav>

      <header id="top" className="slideshow-hero">
        <div className="hero-slides" aria-hidden="true">
          <div className="hero-slide hero-slide-one" />
          <div className="hero-slide hero-slide-two" />
          <div className="hero-slide hero-slide-three" />
          <div className="hero-slide hero-slide-four" />
          <div className="hero-slide hero-slide-five">
            <div className="app-story-scene">
              <div className="app-story-label">See what&apos;s fresh before you go</div>
              <div className="app-story-phone"><div className="app-story-notch" /><div className="app-story-screen">
                <div className="app-story-brand">FarmFinder CNY</div><div className="app-story-search">Search farms or products</div>
                <div className="app-story-chips"><span>Sweet Corn</span><span>Tomatoes</span><span>Peppers</span></div>
                <div className="app-story-map"><i className="pin pin-one">●</i><i className="pin pin-two">●</i><i className="pin pin-three">●</i></div>
                <div className="app-story-farm"><strong>Nearby Farm Stand</strong><small>● Available today</small><div><span>🌽 Sweet Corn</span><b>In stock</b></div><div><span>🍅 Tomatoes</span><b>In stock</b></div><button type="button" tabIndex={-1}>Directions</button></div>
              </div></div>
              <div className="app-story-stand"><span>FRESH</span><strong>LOCAL</strong><em>PRODUCE</em><div>🌽 🍅 🫑</div></div>
            </div>
          </div>
        </div>
        <div className="hero-shade" />
        <div className="slideshow-content shell">
          <p className="eyebrow">More than a map</p>
          <h1>Fresh local food.<br /><em>Available today.</em></h1>
          <p className="lede">Discover nearby farm stands, see what products are currently available, and connect directly with the people growing your food.</p>
          <div className="keep-ny-callout"><span aria-hidden="true">♥</span><div><strong>Keep NY Alive</strong><p>Every local purchase helps keep New York farms, stands, and communities alive.</p></div></div>
          <div className="hero-actions"><a className="primary-button" href="#stands">Find fresh food <span>↓</span></a><Link className="farmer-hero-button" href="/farmer">Manage my farm &amp; products</Link><Link className="hero-list-link" href="/list-your-farm">Add or suggest a farm →</Link></div>
          <div className="hero-message-row"><span>Find nearby farms</span><i>•</i><span>Check live products</span><i>•</i><span>Support local growers</span></div>
        </div>
      </header>

      <div className="marquee" aria-hidden="true"><span>KEEP NY ALIVE</span><i>✦</i><span>BUY LOCAL</span><i>✦</i><span>SUPPORT LOCAL FARMS</span><i>✦</i><span>CNY PROUD</span></div>

      <section className="shell" style={{ paddingTop: "2.25rem" }}>
        <div className="notice" style={{ textAlign: "center", padding: "1.5rem" }}>
          <p className="eyebrow">📰 Upcoming Feature</p>
          <h2 style={{ margin: "0.35rem 0 0.65rem" }}>FarmFinder CNY is coming to <em>In Good Health</em>.</h2>
          <p>FarmFinder CNY is scheduled to be featured in an upcoming October 2026 edition of <em>In Good Health</em>.</p>
          <p style={{ marginTop: "0.65rem" }}><strong>Coming October 2026</strong> · Check back after publication for a link to the feature.</p>
        </div>
      </section>

      <section id="stands" className="stands-section shell">
        <div className="section-heading"><div><p className="eyebrow">Explore local farms</p><h2>Find what’s fresh near you.</h2></div><p>{stands.length} active{" "}{stands.length === 1 ? "stand" : "stands"}</p></div>
        {!configured && <div className="notice"><strong>Almost ready.</strong> Add the Supabase publishable key in Vercel to load live farm stands.</div>}
        {configured && stands.length === 0 ? <div className="empty-state"><span>🌱</span><h3>The first listings are taking root.</h3><p>Active farm stands will show here automatically.</p></div> : <StandDirectory stands={stands} />}
      </section>

      <footer className="footer shell"><a className="brand" href="#top"><span>FF</span> FarmFinder <b>CNY</b></a><p>Buy local. Support local farms. Help keep New York alive.{" "}<Link href="/contact">Contact Ronald</Link>{" · "}<Link href="/privacy">Privacy Policy</Link></p></footer>
    </main>
  );
}
