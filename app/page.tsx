import Link from 'next/link';

export default function Page() {
  return (
    <main className="saas-public-page">
      <nav className="saas-public-nav">
        <Link href="/" className="saas-public-brand">
          <span>xD</span>
          <strong>xDisputer</strong>
        </Link>

        <div className="saas-public-actions">
          <Link href="/login">Sign in</Link>
          <Link href="/signup" className="primary">Create account</Link>
        </div>
      </nav>

      <section className="saas-public-shell-card">
        <div className="saas-public-hero compact">
          <p className="saas-public-eyebrow">Document operations SaaS</p>
          <h1>Secure packet workflow.</h1>
          <p>
            Sign in to manage templates, source data, outputs, and filing records from one protected xDisputer workspace.
          </p>

          <div className="saas-public-cta">
            <Link href="/login">Sign in</Link>
            <Link href="/signup">Create account</Link>
          </div>
        </div>

        <div className="saas-public-panel-grid">
          <article>
            <span>01</span>
            <h2>Authenticate</h2>
            <p>Access starts with a protected Supabase account.</p>
          </article>
          <article>
            <span>02</span>
            <h2>Workspace</h2>
            <p>Continue directly into the native packet workflow.</p>
          </article>
          <article>
            <span>03</span>
            <h2>Deliver</h2>
            <p>Review outputs and track filing progress cleanly.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
