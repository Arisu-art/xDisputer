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

      <section className="saas-public-hero">
        <p className="saas-public-eyebrow">Document operations SaaS</p>
        <h1>Secure dispute packet workflows for clients.</h1>
        <p>
          xDisputer protects the packet workflow behind Supabase authentication, then routes signed-in users into the workspace.
        </p>

        <div className="saas-public-cta">
          <Link href="/signup">Create account</Link>
          <Link href="/login">Sign in</Link>
        </div>
      </section>

      <section className="saas-public-grid">
        <article>
          <span>01</span>
          <h2>Create account</h2>
          <p>Register with Supabase Auth before accessing protected packet workflows.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Sign in</h2>
          <p>Use a verified account session to enter the client workspace.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Work securely</h2>
          <p>Prepare source data, templates, outputs, and filing records from one protected workspace.</p>
        </article>
      </section>
    </main>
  );
}
