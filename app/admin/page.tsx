import Link from 'next/link';
import { requireRole } from '../../lib/supabase/roles';
import { getStaticIntegrationHealth } from '../../lib/saas/integration-health';
import SaasPortalShell from '../../components/SaasPortalShell';

export default async function AdminPage() {
  const { user, profile } = await requireRole('admin');
  const integrations = getStaticIntegrationHealth();

  return (
    <SaasPortalShell
      role="admin"
      email={profile?.email || user?.email}
      title="Admin command center"
      subtitle="Manage SaaS users, monitor client workspaces, and operate the document platform from one protected console."
    >
      <section className="saas-admin-grid">
        <article className="saas-admin-card primary">
          <p>Users</p>
          <h2>Account control</h2>
          <span>Client and administrator role management is backed by Supabase profiles.</span>
        </article>
        <article className="saas-admin-card">
          <p>Cases</p>
          <h2>Client operations</h2>
          <span>Review workspace activity and packet readiness as the database layer expands.</span>
        </article>
        <article className="saas-admin-card">
          <p>System</p>
          <h2>Platform health</h2>
          <span>Vercel, Supabase Auth, middleware, and protected routing are active.</span>
        </article>
      </section>

      <section className="saas-admin-panel">
        <div>
          <p className="saas-portal-eyebrow">Workspace access</p>
          <h2>Open client workflow</h2>
          <p>Admins stay in the console by default. The document engine lives under the client workspace route for controlled testing.</p>
        </div>
        <Link href="/client/workspace">Open workspace</Link>
      </section>

      <section className="saas-admin-panel stacked">
        <div>
          <p className="saas-portal-eyebrow">Connected platform</p>
          <h2>Integration health</h2>
          <p>These checks show whether the runtime has the required Supabase, Vercel, and GitHub wiring for a SaaS deployment.</p>
        </div>
        <div className="saas-integration-list">
          {integrations.map((item) => (
            <article key={item.id} className={`saas-integration-item ${item.status}`}>
              <span>{item.status}</span>
              <strong>{item.label}</strong>
              <p>{item.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </SaasPortalShell>
  );
}
