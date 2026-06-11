import { getAccessEntitlement } from '../../lib/saas/access-entitlement';
import { requireAuth } from '../../lib/saas/session';

export default async function AccountPendingPage() {
  const session = await requireAuth();
  const entitlement = await getAccessEntitlement();

  return (
    <main className="saas-auth-page">
      <section className="saas-auth-panel">
        <div className="saas-auth-brand">
          <span className="saas-auth-logo">xD</span>
          <div>
            <p className="saas-auth-eyebrow">Account access</p>
            <h1>{entitlement.allowed ? 'Workspace ready' : entitlement.title}</h1>
          </div>
        </div>

        <p className="saas-auth-copy">{entitlement.detail}</p>

        <div className="saas-auth-alert success">
          Signed in as {session.profile?.email || session.user.email || 'authenticated user'}.
        </div>

        {entitlement.managerEmail && (
          <div className="saas-auth-alert success">
            Manager: {entitlement.managerEmail}
          </div>
        )}

        <div className="saas-auth-form">
          {entitlement.allowed ? (
            <a className="admin-action-button primary" href={session.dashboardPath}>Continue</a>
          ) : (
            <a className="admin-action-button primary" href="/login">Switch account</a>
          )}

          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </section>

      <aside className="saas-auth-hero">
        <p className="saas-auth-eyebrow">Manager approval required</p>
        <h2>xDisputer workspace access is enabled only after your manager approves your account.</h2>

        <div className="saas-auth-feature-grid">
          <div>
            <strong>No quota limits</strong>
            <span>Approved clients can generate without output limits.</span>
          </div>
          <div>
            <strong>Manager approval</strong>
            <span>Your manager controls whether your account can use the workspace.</span>
          </div>
          <div>
            <strong>Client-owned templates</strong>
            <span>Your templates remain attached to your signed-in account.</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
