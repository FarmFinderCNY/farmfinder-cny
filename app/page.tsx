import { MapPlaceholder } from "@/components/map-placeholder";
import { StandCard } from "@/components/stand-card";
import { getActiveFarmStands, hasSupabaseConfig } from "@/lib/supabase";

export const revalidate = 300;

export default async function Home() {
  const configured = hasSupabaseConfig();
  const stands = await getActiveFarmStands();

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top"><span>FF</span> FarmFinder <b>CNY</b></a>
        <a className="nav-link" href="#stands">Browse stands</a>
      </nav>

      <header id="top" className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow">Grown nearby · Shared locally</p>
          <h1>Fresh food,<br /><em>close to home.</em></h1>
          <p className="lede">Find farm stands, roadside markets, and honest local food throughout Central New York.</p>
          <a className="primary-button" href="#stands">Find a farm stand <span>↓</span></a>
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
          <div><p className="eyebrow">The stand list</p><h2>Local finds, all in one place.</h2></div>
          <p>{stands.length} active {stands.length === 1 ? "stand" : "stands"}</p>
        </div>

        {!configured && (
          <div className="notice"><strong>Almost ready.</strong> Add the Supabase publishable key in Vercel to load live farm stands.</div>
        )}

        {configured && stands.length === 0 ? (
          <div className="empty-state"><span>🌱</span><h3>The first listings are taking root.</h3><p>Active farm stands will show here automatically.</p></div>
        ) : (
          <div className="stand-grid">{stands.map((stand) => <StandCard key={stand.id} stand={stand} />)}</div>
        )}
      </section>

      <div className="shell"><MapPlaceholder stands={stands} /></div>

      <footer className="footer shell">
        <a className="brand" href="#top"><span>FF</span> FarmFinder <b>CNY</b></a>
        <p>Helping Central New York find food grown closer to home.</p>
      </footer>
    </main>
  );
}
