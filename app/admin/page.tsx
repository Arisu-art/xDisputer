import Link from 'next/link';
import { requireRole } from '../../lib/supabase/roles';
import { getStaticIntegrationHealth } from '../../lib/saas/integration-health';
import SaasPortalShell from '../../components/SaasPortalShell';
import { ObsidianPanel, ObsidianStatCard, ObsidianStatusBadge } from '../../components/ObsidianDashboardPrimitives';

export default async function AdminPage() {
  const { user, profile } = await requireRole('admin');
  const integrations = getStaticIntegrationHealth();
  const connectedCount = integrations.filter((item) => item.status === 'connected').length;

  return (
    <SaasPortalShell
      role="admin"
      email={profile?.email || user?.email}
      title="Admin command center"
      subtitle="Manage SaaS users, monitor client workspaces, and operate the document platform from one protected console."
    >
      <div className="obsidian-dashboard-grid">
        <ObsidianStatCard label="Profiles" value="Role-based" trend="Supabase" />
        <ObsidianStatCard label="Integrations" value={`${connectedCount}/${integrations.length}`} trend="Checked" />
        <ObsidianStatCard label="Routing" value="Protected" trend="Middleware" />

        <ObsidianPanel title="Platform operations" eyebrow="Admin control" className="obsidian-panel-large">
          <div className="obsidian-action-panel">
            <div>
              <h4>Operate the SaaS layer without touching the document engine.</h4>
              <p>Auth, profiles, role routing, and protected workspace access are handled before users reach packet generation.</p>
            </div>
            <Link href="/client/workspace" className="obsidian-primary-link">Open workspace</Link>
          </div>
        </ObsidianPanel>

        <ObsidianPanel title="Integration health" eyebrow="Connected platform">
          <div className="obsidian-list-stack">
            {integrations.map((item) => (
              <article key={item.id} className="obsidian-list-row">
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
                <ObsidianStatusBadge status={item.status} />
              </article>
            ))}
          </div>
        </ObsidianPanel>

        <ObsidianPanel title="SaaS build sequence" eyebrow="System map">
          <div className="obsidian-timeline">
            <div><span /> <p>Public landing page</p></div>
            <div><span /> <p>Supabase Auth and profiles</p></div>
            <div><span /> <p>Role-aware dashboards</p></div>
            <div><span /> <p>Database-backed cases and filings</p></div>
          </div>
        </ObsidianPanel>
      </div>
    </SaasPortalShell>
  );
}
