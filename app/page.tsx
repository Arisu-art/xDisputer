import Link from 'next/link';
import { getCurrentUserProfile } from '../lib/supabase/roles';

export default async function Page() {
  const { user, profile } = await getCurrentUserProfile();
  const dashboardHref = profile?.role === 'admin' ? '/admin' : '/client';

  return (
    <main className="saas-public-page">
      <nav className="saas-public-nav">
        <Link href="/" className="saas-public-brand">
          <span>xD</span>
          <strong>xDisputer</strong>
        </Link>

        <div className="saas-public-actions">
          {user ? (
            <>
              <Link href={dashboardHref}>Open dashboard</Link>
              <form action="/auth/sign-out" method="post">
                <button type="submit">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">Sign in</Link>
              <Link href="/signup" className="primary">Create account</Link>
            </>
          )}
        </div>
      </nav>

      <section className="saas-public-hero">
        <p className="saas-public-eyebrow">Document operations SaaS</p>
        <h1>Secure dispute packet workflows for admins and clients.</h1>
        <p>
          xDisputer connects Supabase authentication, role-based portals, client workspaces, filing operations,
          and document packet generation into one protected SaaS platform.
        </p>

        <div className="saas-public-cta">
          {user ? (
            <Link href={dashboardHref}>Open your dashboard</Link>
          ) : (
            <>
              <Link href="/signup">Create account</Link>
              <Link href="/login">Sign in</Link>
            </>
          )}
        </div>
      </section>

      <section className="saas-public-grid">
        <article>
          <span>01</span>
          <h2>Admin console</h2>
          <p>Manage SaaS access, users, cases, platform status, and operational controls.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Client portal</h2>
          <p>Give clients a protected dashboard before they enter the document workspace.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Document workspace</h2>
          <p>Launch the packet workflow only after authentication and role routing are resolved.</p>
        </article>
      </section>
    </main>
  );
}
