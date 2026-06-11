import Link from 'next/link';

export default async function SignupPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; message?: string; invite?: string }>;
}) {
  const params = await searchParams;
  const error = params?.error;
  const message = params?.message;
  const invite = params?.invite || '';

  return (
    <main className="saas-auth-page">
      <section className="saas-auth-panel">
        <div className="saas-auth-brand">
          <span className="saas-auth-logo">xD</span>
          <div>
            <p className="saas-auth-eyebrow">Create client account</p>
            <h1>{invite ? 'Join your manager' : 'Create your account'}</h1>
          </div>
        </div>

        <p className="saas-auth-copy">
          {invite
            ? 'You are creating an account from a manager invite link. Your manager must approve access before the workspace unlocks.'
            : 'Create your account first. A manager invite and approval are required before workspace access unlocks.'}
        </p>

        {error && <div className="saas-auth-alert error">{error}</div>}
        {message && <div className="saas-auth-alert success">{message}</div>}

        <form action="/auth/sign-up" method="post" className="saas-auth-form">
          <input type="hidden" name="invite" value={invite} />

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
          Already have an account? <Link href="/login?next=/account-pending">Sign in</Link>
        </p>
      </section>

      <aside className="saas-auth-hero">
        <p className="saas-auth-eyebrow">Approval-gated access</p>
        <h2>Account creation does not unlock workspace access until a manager approves the client.</h2>

        <div className="saas-auth-feature-grid">
          <div>
            <strong>Manager invite</strong>
            <span>Clients join through a manager invite link.</span>
          </div>
          <div>
            <strong>Pending approval</strong>
            <span>New users wait until a manager approves access.</span>
          </div>
          <div>
            <strong>No generation quota</strong>
            <span>Approved users can generate without output limits.</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
