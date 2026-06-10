import Link from 'next/link';

export default async function SignupPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;

  return (
    <main className="saas-auth-page">
      <section className="saas-auth-panel">
        <div className="saas-auth-brand">
          <span className="saas-auth-logo">xD</span>
          <div>
            <p className="saas-auth-eyebrow">Create client account</p>
            <h1>Start your workspace</h1>
          </div>
        </div>

        <p className="saas-auth-copy">
          Client accounts are created with protected workspace access by default.
        </p>

        {error && <div className="saas-auth-alert error">{error}</div>}
        {message && <div className="saas-auth-alert success">{message}</div>}

        <form action="/auth/sign-up" method="post" className="saas-auth-form">
          <label>
            <span>Full name</span>
            <input name="fullName" type="text" required placeholder="Client full name" />
          </label>

          <label>
            <span>Email address</span>
            <input name="email" type="email" required placeholder="you@example.com" />
          </label>

          <label>
            <span>Password</span>
            <input name="password" type="password" required minLength={8} placeholder="Minimum 8 characters" />
          </label>

          <button type="submit">Create account</button>
        </form>

        <p className="saas-auth-switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>

      <aside className="saas-auth-hero">
        <p className="saas-auth-eyebrow">Secure by design</p>
        <h2>Every user gets an authenticated role, protected route, and profile record in Supabase.</h2>

        <div className="saas-auth-feature-grid">
          <div>
            <strong>Client role</strong>
            <span>Default role for new signups.</span>
          </div>
          <div>
            <strong>Admin role</strong>
            <span>Promote trusted accounts through Supabase SQL.</span>
          </div>
          <div>
            <strong>Vercel-ready</strong>
            <span>Uses environment variables, not hardcoded secrets.</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
