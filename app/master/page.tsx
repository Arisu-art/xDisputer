import MasterAccountTable from './MasterAccountTable';
import { listManagedAccounts, type ManagedAccount } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

type MasterPanel = 'monitoring' | 'access' | 'reports';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
  }>;
};

function normalizePanel(value: string | string[] | undefined): MasterPanel {
  const panel = Array.isArray(value) ? value[0] : value;
  if (panel === 'access' || panel === 'reports') return panel;
  if (panel === 'managers' || panel === 'clients' || panel === 'system' || panel === 'overview') return 'monitoring';
  return 'monitoring';
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function MasterSidebarLink({ panel, activePanel, children }: { panel: MasterPanel; activePanel: MasterPanel; children: string }) {
  return <a className={activePanel === panel ? 'active' : ''} href={`/master?panel=${panel}`}>{children}</a>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function StatusList({ accounts }: { accounts: ManagedAccount[] }) {
  if (!accounts.length) return <div className="admin-monitor-empty">No accounts need attention right now.</div>;

  return (
    <div className="dashboard-snapshot-list master-monitor-list">
      {accounts.slice(0, 5).map((account) => (
        <article key={account.id} className="master-monitor-item">
          <div>
            <strong>{account.full_name || account.email || 'Unnamed account'}</strong>
            <span>{account.email || 'Account record'} • Updated {formatDate(account.updated_at)}</span>
          </div>
          <span className={`admin-status-badge ${account.account_status || 'active'}`}>{account.account_status || 'active'}</span>
        </article>
      ))}
    </div>
  );
}

function SnapshotFooter({ count, total, href }: { count: number; total: number; href: string }) {
  return (
    <div className="dashboard-snapshot-footer">
      <span>Showing 1-{Math.min(count, total)} of {total}</span>
      <a className="dashboard-card-link" href={href}>View all</a>
    </div>
  );
}

export default async function MasterPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const activePanel = normalizePanel(params.panel);
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);
  const { user, profile, supabase } = await requireRole('master');
  const { accounts: profiles, errorMessage: queryError } = await listManagedAccounts(supabase, 'master');

  const ownerProfiles = profiles.filter((item) => item.role === 'master');
  const managerProfiles = profiles.filter((item) => item.role === 'manager' || item.role === 'admin');
  const clientProfiles = profiles.filter((item) => item.role === 'client');
  const disabledAccounts = profiles.filter((item) => item.account_status === 'disabled');
  const unassignedClients = clientProfiles.filter((item) => !item.manager_id);
  const linkedClients = clientProfiles.filter((item) => item.manager_id);
  const attentionQueue = [...disabledAccounts, ...unassignedClients.filter((item) => item.account_status !== 'disabled')];
  const coverageRate = clientProfiles.length ? Math.round((linkedClients.length / clientProfiles.length) * 100) : 0;

  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Master console</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Master navigation">
          <MasterSidebarLink panel="monitoring" activePanel={activePanel}>Monitoring</MasterSidebarLink>
          <MasterSidebarLink panel="access" activePanel={activePanel}>Access control</MasterSidebarLink>
          <MasterSidebarLink panel="reports" activePanel={activePanel}>Reports</MasterSidebarLink>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Master account'}</strong>
          <small>Owner account</small>
          <form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero master-compact-hero">
          <div>
            <p>Master operations</p>
            <h1>Account command center.</h1>
            <span>Monitor platform accounts, control access, and review operational coverage.</span>
          </div>
        </header>

        {controlStatus && (
          <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}>
            <strong>{controlStatus === 'ok' ? 'Action completed' : 'Action failed'}</strong>
            <span>{controlStatus === 'ok' ? 'The console has refreshed with the latest account state.' : controlMessage || 'Unknown error.'}</span>
          </section>
        )}

        {queryError ? (
          <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load account records: {queryError}</div></section>
        ) : (
          <>
            {activePanel === 'monitoring' && (
              <>
                <section className="admin-monitor-stats master-monitoring-stats" aria-label="Monitoring metrics">
                  <article><p>Total users</p><strong>{profiles.length}</strong></article>
                  <article><p>Managers</p><strong>{managerProfiles.length}</strong></article>
                  <article><p>Coverage</p><strong>{coverageRate}%</strong></article>
                  <article><p>Attention</p><strong>{attentionQueue.length}</strong></article>
                </section>

                <section className="admin-power-grid">
                  <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                    <div className="admin-monitor-card-header">
                      <div><p>Monitoring</p><h2>Attention queue</h2></div>
                      <a className="dashboard-card-link" href="/master/accounts?filter=attention">View all</a>
                    </div>
                    <StatusList accounts={attentionQueue} />
                    <SnapshotFooter count={5} total={attentionQueue.length} href="/master/accounts?filter=attention" />
                  </article>
                  <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                    <div className="admin-monitor-card-header">
                      <div><p>Coverage</p><h2>Client-manager assignment</h2></div>
                      <a className="dashboard-card-link" href="/master/accounts?filter=clients">View all</a>
                    </div>
                    <div className="dashboard-snapshot-list">
                      <div className="admin-power-list">
                        <span>Linked clients: {linkedClients.length}</span>
                        <span>Unassigned clients: {unassignedClients.length}</span>
                        <span>Managers available: {managerProfiles.length}</span>
                        <span>Coverage rate: {coverageRate}%</span>
                      </div>
                    </div>
                    <SnapshotFooter count={4} total={4} href="/master/accounts?filter=clients" />
                  </article>
                </section>
              </>
            )}

            {activePanel === 'access' && (
              <section className="master-access-stack">
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header"><div><p>Access control</p><h2>Manager accounts</h2></div><span>{managerProfiles.length} managers</span></div>
                  <MasterAccountTable accounts={managerProfiles} currentUserId={user.id} emptyText="No manager accounts found yet. Promote a client into manager access from the client section below." />
                </article>
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header"><div><p>Access control</p><h2>Client accounts</h2></div><span>{clientProfiles.length} clients</span></div>
                  <MasterAccountTable accounts={clientProfiles} currentUserId={user.id} emptyText="No client accounts found yet." />
                </article>
              </section>
            )}

            {activePanel === 'reports' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header"><div><p>Report</p><h2>Account coverage</h2></div><span>{coverageRate}%</span></div>
                  <div className="admin-power-list"><span>Owners: {ownerProfiles.length}</span><span>Managers: {managerProfiles.length}</span><span>Clients: {clientProfiles.length}</span><span>Assigned clients: {linkedClients.length}</span><span>Unassigned clients: {unassignedClients.length}</span></div>
                </article>
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header"><div><p>Report</p><h2>Recommended actions</h2></div><span>{attentionQueue.length} tasks</span></div>
                  <div className="admin-power-list"><span>1. Assign unassigned clients to a manager using invite workflow.</span><span>2. Review disabled accounts before reactivation.</span><span>3. Keep manager access limited to trusted operators.</span><span>4. Use access control only for account-level changes.</span></div>
                </article>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
