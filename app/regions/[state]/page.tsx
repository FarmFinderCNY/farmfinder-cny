import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveFarmStands } from "@/lib/supabase";
import { getStateBySlug, normalizeState } from "@/lib/regions";
import { StandDirectory } from "@/components/stand-directory";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function StateRegionPage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const stateInfo = getStateBySlug(state);
  if (!stateInfo) notFound();
  const [stateCode, stateName] = stateInfo;
  const allStands = await getActiveFarmStands();
  const stands = allStands.filter((s) => normalizeState(s.state) === stateCode);
  const ownerManaged = stands.filter((s) =>
    Boolean(s.owner_user_id && s.owner_access_activated_at),
  ).length;
  const fresh = stands.filter((s) => {
    if (!s.farmer_inventory_updated_at) return false;
    const age = Date.now() - new Date(s.farmer_inventory_updated_at).getTime();
    return (
      age >= 0 &&
      age < 7 * 24 * 60 * 60 * 1000 &&
      (s.inventory ?? []).some(
        (i) => i.status === "available" || i.status === "low",
      )
    );
  }).length;
  const addFarmUrl = `/list-your-farm?state=${encodeURIComponent(state)}`;
  return (
    <main>
      <nav className="nav shell">
        <Link className="brand" href="/">
          <span>FF</span> FarmFinder <b>CNY</b>
        </Link>
        <div className="nav-actions">
          <Link className="nav-link" href="/regions">
            Change region
          </Link>
          <Link className="nav-link nav-submit" href={addFarmUrl}>
            Add a {stateName} farm
          </Link>
        </div>
      </nav>
      <header
        className="shell"
        style={{
          paddingTop: "3rem",
          paddingBottom: "2rem",
          textAlign: "center",
        }}
      >
        <p className="eyebrow">FarmFinder · {stateCode}</p>
        <h1>{stateName}</h1>
        <p className="lede" style={{ margin: "0 auto" }}>
          Find local farms, farm stands, and farmer-updated availability across{" "}
          {stateName}.
        </p>
      </header>
      <section className="shell" style={{ paddingBottom: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))",
            gap: "10px",
          }}
        >
          <div className="notice" style={{ margin: 0 }}>
            <strong>{stands.length}</strong>
            <p style={{ margin: "4px 0 0" }}>active listings</p>
          </div>
          <div className="notice" style={{ margin: 0 }}>
            <strong>{ownerManaged}</strong>
            <p style={{ margin: "4px 0 0" }}>owner managed</p>
          </div>
          <div className="notice" style={{ margin: 0 }}>
            <strong>{fresh}</strong>
            <p style={{ margin: "4px 0 0" }}>fresh updates this week</p>
          </div>
        </div>
      </section>
      <section className="stands-section shell" style={{ paddingTop: "1rem" }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">Explore {stateName}</p>
            <h2>What’s fresh near you?</h2>
          </div>
          <p>
            {stands.length} active {stands.length === 1 ? "stand" : "stands"}
          </p>
        </div>
        {stands.length > 0 ? (
          <>
            <StandDirectory stands={stands} />
            <div
              className="notice"
              style={{ marginTop: "2rem", textAlign: "center" }}
            >
              <strong>Know another farm in {stateName}?</strong>
              <p>
                Help make FarmFinder more useful by adding or suggesting it.
              </p>
              <Link className="text-button" href={addFarmUrl}>
                Add or suggest a farm →
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span>🌱</span>
            <h3>Be part of FarmFinder’s start in {stateName}.</h3>
            <p>
              Know a local farm or farm stand? Add it to help build the{" "}
              {stateName} map from the ground up.
            </p>
            <p style={{ marginTop: "1rem" }}>
              <Link className="primary-button" href={addFarmUrl}>
                Add the first farm →
              </Link>
            </p>
          </div>
        )}
      </section>
      <footer className="footer shell">
        <Link className="brand" href="/">
          <span>FF</span> FarmFinder <b>CNY</b>
        </Link>
        <p>Started in Central New York. Find farms wherever you are.</p>
      </footer>
    </main>
  );
}
