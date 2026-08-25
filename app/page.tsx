import { StandDirectory } from "@/components/stand-directory";
import { getActiveFarmStands, hasSupabaseConfig } from "@/lib/supabase";
import Link from "next/link";

export const revalidate = 300;

export default async function Home() {
  const configured = hasSupabaseConfig();
  const stands = await getActiveFarmStands();

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top"><span>FF</span> FarmFinder <b>CNY</b></a>
        <div className="nav-actions"><a className="nav-link" href="#stands">Browse stands</a><Link className="nav-link nav-submit" href="/list-your-farm">List your farm</Link></div>
      </nav>

      <header id="top" className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">Grown nearby · Shared locally</p>
          <h1>Fresh food,<br /><em>close to home.</em></h1>
          <p className="lede">Find farm stands, roadside markets, and honest local food throughout Central New York.</p>
          <div className="hero-actions"><a className="primary-button" href="#stands">Find a farm stand <span>↓</span></a><Link className="text-button" href="/list-your-farm">I’m a farmer — list my stand →</Link><Link className="text-button community-button" href="/list-your-farm?type=community">Suggest a local farm →</Link></div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" />
          <div className="field field-back" />
          <div className="field field-front" />
          <div className="barn"><span /></div>
          <div className="crop-lines" />
          <p>CENTRAL<br />NEW YORK</p>
        </div>
      </header>

      <div className="marquee" aria-hidden="true">
        <span>FARM FRESH</span><i>✦</i><span>LOCALLY GROWN</span><i>✦</i><span>COMMUNITY ROOTED</span><i>✦</i><span>CNY PROUD</span>
      </div>
      <section id="stands" className="stands-section shell">
        <div className="section-heading">
          <div><p className="eyebrow">Explore local farms</p><h2>Find what’s fresh near you.</h2></div>
          <p>{stands.length} active {stands.length === 1 ? "stand" : "stands"}</p>
        </div>

        {!configured && (
          <div className="notice"><strong>Almost ready.</strong> Add the Supabase publishable key in Vercel to load live farm stands.</div>
        )}

        {configured && stands.length === 0 ? (
          <div className="empty-state"><span>🌱</span><h3>The first listings are taking root.</h3><p>Active farm stands will show here automatically.</p></div>
        ) : (
          <StandDirectory stands={stands} />
        )}
      </section>

     

      <footer className="footer shell">
        <a className="brand" href="#top"><span>FF</span> FarmFinder <b>CNY</b></a>
       <p>
  Helping Central New York find food grown closer to home.{" "}
  <Link href="/privacy">Privacy Policy</Link>
</p>
      </footer>
    </main>
  );
}
