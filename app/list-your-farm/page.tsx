import Link from "next/link";
import { FarmSubmissionForm } from "@/components/farm-submission-form";
import { getStateBySlug } from "@/lib/regions";

export const metadata = {
  title: "Add a Farm | FarmFinder CNY",
  description: "Submit a local farm or farm stand for FarmFinder review.",
};

export default async function ListYourFarmPage({ searchParams }: { searchParams: Promise<{ type?: string; state?: string }> }) {
  const { type, state } = await searchParams;
  const defaultSubmissionType = type === "community" ? "community" : "owner";
  const stateInfo = state ? getStateBySlug(state) : undefined;
  const defaultState = stateInfo?.[0] ?? "NY";
  const areaName = stateInfo?.[1] ?? "Central New York";

  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link>
        <div className="nav-actions"><Link className="nav-link" href="/regions">Explore regions</Link><Link className="nav-link" href="/farmer">Farmer sign in</Link><Link className="nav-link" href="/">← Farm stands</Link></div>
      </nav>
      <header className="submission-hero shell">
        <p className="eyebrow">Help the map grow</p>
        <h1>Share a<br /><em>local farm.</em></h1>
        <p>List your own farm or suggest a local stand your community should know about. Every submission is reviewed before publication.</p>
        {stateInfo && <p style={{ marginTop: ".75rem" }}><strong>Adding a farm in {areaName}</strong></p>}
      </header>
      <section className="form-shell shell">
        <aside>
          <p className="eyebrow">Before you begin</p>
          <h2>What happens next?</h2>
          <ol>
            <li><span>1</span><p><strong>You submit</strong>Your listing stays private while it’s pending.</p></li>
            <li><span>2</span><p><strong>We review</strong>We verify the information and map location.</p></li>
            <li><span>3</span><p><strong>Your community finds you</strong>Approved listings appear in the appropriate state and on the FarmFinder map.</p></li>
          </ol>
        </aside>
        <FarmSubmissionForm defaultSubmissionType={defaultSubmissionType} defaultState={defaultState} areaName={areaName} />
      </section>
      <footer className="footer shell">
        <Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link>
        <p>Started in Central New York. Growing farm by farm.</p>
      </footer>
    </main>
  );
}
