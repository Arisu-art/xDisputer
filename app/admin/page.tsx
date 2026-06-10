import Link from 'next/link';
import { requireRole } from '../../lib/supabase/roles';
import SaasPortalShell from '../../components/SaasPortalShell';

export default async function AdminPage() {
  const { user, profile } = await requireRole('admin');

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
          <p>Administrators are routed here by default. Use client view only when testing the client workflow experience.</p>
        </div>
        <Link href="/client">Open client view</Link>
      </section>
    </SaasPortalShell>
  );
}
