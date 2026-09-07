import Link from "next/link";
import { HOME_REGION, US_STATES, stateSlug } from "@/lib/regions";

const groups = [
  { name: "Northeast", states: ["CT","ME","MA","NH","RI","VT","NJ","NY","PA"] },
  { name: "South", states: ["DE","FL","GA","MD","NC","SC","VA","WV","AL","KY","MS","TN","AR","LA","OK","TX"] },
  { name: "Midwest", states: ["IL","IN","MI","OH","WI","IA","KS","MN","MO","NE","ND","SD"] },
  { name: "West", states: ["AK","AZ","CA","CO","HI","ID","MT","NV","NM","OR","UT","WA","WY"] },
];

export default function RegionsPage() {
  return (
    <main className="shell" style={{ paddingTop: "1.25rem", paddingBottom: "4rem" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
        <Link href="/" className="brand"><span>FF</span> FarmFinder <b>CNY</b></Link>
        <Link href="/" className="nav-link">Back home</Link>
      </nav>

      <section style={{ maxWidth: "760px", margin: "2.5rem auto 1.5rem", textAlign: "center" }}>
        <p className="eyebrow">🌎 FarmFinder is growing</p>
        <h1 style={{ marginBottom: ".75rem" }}>Where are you looking?</h1>
        <p className="lede" style={{ margin: "0 auto" }}>FarmFinder started in Central New York. Choose your state to discover local farms — or help put the first farm in your area on the map.</p>
      </section>

      <section style={{ maxWidth: "900px", margin: "0 auto 2rem" }}>
        <Link href="/#stands" className="notice" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", textDecoration: "none", padding: "1.15rem 1.25rem", borderWidth: "2px" }}>
          <div><p className="eyebrow">🌱 Where it started</p><h2 style={{ margin: ".2rem 0" }}>{HOME_REGION.name}</h2><p>FarmFinder CNY home region</p></div>
          <strong aria-hidden="true" style={{ fontSize: "1.5rem" }}>→</strong>
        </Link>
      </section>

      <section style={{ maxWidth: "900px", margin: "0 auto" }}>
        {groups.map((group) => (
          <div key={group.name} style={{ marginBottom: "2rem" }}>
            <div className="section-heading" style={{ marginBottom: ".75rem" }}><div><p className="eyebrow">United States</p><h2>{group.name}</h2></div></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: ".7rem" }}>
              {US_STATES.filter(([code]) => group.states.includes(code)).map(([code, name]) => (
                <Link key={code} href={`/regions/${stateSlug(name)}`} className="notice" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".75rem", minHeight: "64px", textDecoration: "none", padding: ".9rem 1rem" }}>
                  <span><strong style={{ display: "block" }}>{name}</strong><small>{code}</small></span><span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section style={{ maxWidth: "760px", margin: "2.5rem auto 0", textAlign: "center" }}>
        <p><strong>Don’t see farms in your area yet?</strong></p>
        <p style={{ marginTop: ".35rem" }}>Every FarmFinder area can grow from its very first listing.</p>
        <p style={{ marginTop: "1rem" }}><Link className="primary-button" href="/list-your-farm">Add or suggest a farm →</Link></p>
      </section>
    </main>
  );
}
