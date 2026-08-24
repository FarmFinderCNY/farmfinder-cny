import Link from "next/link";
import { FarmSubmissionForm } from "@/components/farm-submission-form";

export const metadata = {
  title: "List Your Farm | FarmFinder CNY",
  description: "Submit a Central New York farm stand for review.",
};

export default async function ListYourFarmPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const defaultSubmissionType = type === "community" ? "community" : "owner";
  return (
    <main>
      <nav className="nav shell" aria-label="Main navigation">
        <Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link>
        <div className="nav-actions"><Link className="nav-link" href="/farmer">Farmer sign in</Link><Link className="nav-link" href="/">← Farm stands</Link></div>
      </nav>
      <header className="submission-hero shell">
        <p className="eyebrow">Join the local directory</p>
        <h1>Share a<br /><em>local farm.</em></h1>
        <p>List your own farm or suggest a local stand your neighbors should know about. Every submission is reviewed before publication.</p>
      </header>
      <section className="form-shell shell">
        <aside>
          <p className="eyebrow">Before you begin</p>
          <h2>What happens next?</h2>
          <ol>
            <li><span>1</span><p><strong>You submit</strong>Your listing stays private while it’s pending.</p></li>
            <li><span>2</span><p><strong>We review</strong>We verify the information and map location.</p></li>
            <li><span>3</span><p><strong>CNY finds you</strong>Approved listings appear on the stand list and map.</p></li>
          </ol>
        </aside>
        <FarmSubmissionForm defaultSubmissionType={defaultSubmissionType} />
      </section>
      <footer className="footer shell">
        <Link className="brand" href="/"><span>FF</span> FarmFinder <b>CNY</b></Link>
        <p>Helping Central New York find food grown closer to home.</p>
      </footer>
    </main>
  );
}
