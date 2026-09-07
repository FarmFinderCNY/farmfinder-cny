import Link from "next/link";
import { HOME_REGION, US_STATES, stateSlug } from "@/lib/regions";

export default function RegionsPage() {
  return (
    <main className="shell" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      <Link href="/" className="brand"><span>FF</span> FarmFinder <b>CNY</b></Link>

      <section style={{ maxWidth: "760px", margin: "3rem auto 2rem", textAlign: "center" }}>
        <p className="eyebrow">FarmFinder is growing</p>
        <h1>Find local farms in your area.</h1>
        <p className="lede">FarmFinder started in Central New York. Choose a state to explore local farms or help add the first farm in your area.</p>
      </section>

      <section style={{ maxWidth: "900px", margin: "0 auto 2rem" }}>
        <Link href="/#stands" className="notice" style={{ display: "block", textDecoration: "none", padding: "1.25rem" }}>
          <p className="eyebrow">Home region</p>
          <h2 style={{ margin: "0.25rem 0" }}>{HOME_REGION.name}</h2>
          <p>Continue to the original FarmFinder CNY experience →</p>
        </Link>
      </section>

      <section style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div className="section-heading"><div><p className="eyebrow">Explore</p><h2>Choose your state</h2></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: ".75rem" }}>
          {US_STATES.map(([code, name]) => (
            <Link key={code} href={`/regions/${stateSlug(name)}`} className="notice" style={{ display: "block", textDecoration: "none", padding: "1rem" }}>
              <strong>{name}</strong><br /><small>{code}</small>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
