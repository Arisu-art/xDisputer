import Link from 'next/link';

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next || '/dashboard';
  const error = params?.error;
  const message = params?.message;

  return (
    <main className="saas-auth-page">
      <section className="saas-auth-panel">
        <div className="saas-auth-brand">
          <span className="saas-auth-logo">xD</span>
          <div>
            <p className="saas-auth-eyebrow">xDisputer SaaS</p>
            <h1>Welcome back</h1>
          </div>
        </div>

        <p className="saas-auth-copy">
          Sign in to access your protected document operations workspace.
        </p>

        {error && <div className="saas-auth-alert error">{error}</div>}
        {message && <div className="saas-auth-alert success">{message}</div>}

        <form action="/auth/sign-in" method="post" className="saas-auth-form">
          <input type="hidden" name="next" value={next} />

          <label>
            <span>Email address</span>
            <input name="email" type="email" required placeholder="you@example.com" />
          </label>

          <label>
            <span>Password</span>
            <input name="password" type="password" required placeholder="Enter your password" />
          </label>

          <button type="submit">Sign in</button>
        </form>

        <p className="saas-auth-switch">
          New to xDisputer? <Link href="/signup">Create an account</Link>
        </p>
      </section>

      <aside className="saas-auth-hero">
        <p className="saas-auth-eyebrow">Document operations platform</p>
        <h2>Run dispute packets, client cases, and filing workflows from one secure SaaS workspace.</h2>

        <div className="saas-auth-feature-grid">
          <div>
            <strong>Admin console</strong>
            <span>Manage users, roles, cases, and operations.</span>
          </div>
          <div>
            <strong>Client workspace</strong>
            <span>Protected access for document packet workflows.</span>
          </div>
          <div>
            <strong>Supabase auth</strong>
            <span>Account creation, sessions, and role-backed access.</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
