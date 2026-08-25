import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | FarmFinder CNY",
  description: "How FarmFinder CNY collects and uses personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="shell">
      <section style={{ maxWidth: "760px", padding: "60px 0" }}>
        <p className="eyebrow">FarmFinder CNY</p>
        <h1>Privacy Policy</h1>
        <p>Effective August 25, 2026</p>

        <h2>Information we collect</h2>
        <p>
          FarmFinder CNY may collect information you voluntarily provide,
          including your email address, requested product alerts, farm
          submissions, ownership claims, and contact information.
        </p>

        <h2>How we use information</h2>
        <p>
          We use this information to operate FarmFinder CNY, process farm
          listings and ownership claims, send requested product-availability
          alerts, prevent misuse, and improve the service.
        </p>

        <h2>Notify Me alerts</h2>
        <p>
          When you create an alert, we store your email address, the requested
          product, and the selected farm. We use this information only to
          provide and manage the alert you requested.
        </p>

        <h2>Sharing of information</h2>
        <p>
          FarmFinder CNY does not sell personal information. Information may
          be processed by service providers that help operate the website,
          database, hosting, and email delivery.
        </p>

        <h2>Data retention</h2>
        <p>
          We retain information only as long as reasonably necessary to
          operate the service, provide requested alerts, review submissions,
          comply with legal obligations, and prevent abuse.
        </p>

        <h2>Your choices</h2>
        <p>
          You may unsubscribe from product alerts using the unsubscribe option
          included with an alert email. You may also request correction or
          deletion of personal information you submitted.
        </p>

        <h2>Security</h2>
        <p>
          We use reasonable safeguards and access controls to protect personal
          information. No online system can guarantee absolute security.
        </p>

        <h2>Children’s privacy</h2>
        <p>
          FarmFinder CNY is not intended to collect personal information from
          children under 13.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          We may update this policy as FarmFinder CNY develops. The effective
          date above will be updated when material changes are made.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy questions or requests may be submitted through FarmFinder
          CNY’s published contact information.
        </p>

        <div style={{ marginTop: "32px" }}>
          <Link className="primary-button" href="/">
            Back to FarmFinder CNY
          </Link>
        </div>
      </section>
    </main>
  );
}
