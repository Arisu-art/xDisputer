import MasterAccountTable from './MasterAccountTable';
import { listManagedAccounts, type ManagedAccount } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

type MasterPanel = 'monitoring' | 'access' | 'managers' | 'clients' | 'reports';
type MasterAccessWorkflowView = 'overview' | 'managers' | 'clients' | 'pending';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
    view?: string | string[];
  }>;
};

function normalizePanel(value: string | string[] | undefined): MasterPanel {
  const panel = Array.isArray(value) ? value[0] : value;
  if (panel === 'access' || panel === 'managers' || panel === 'clients' || panel === 'reports') return panel;
  return 'monitoring';
}

function normalizeMasterAccessWorkflowView(value: string | string[] | undefined): MasterAccessWorkflowView {
  const view = Array.isArray(value) ? value[0] : value;
  if (view === 'managers' || view === 'clients' || view === 'pending') return view;
  return 'overview';
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function MasterSidebarLink({ panel, activePanel, children }: { panel: MasterPanel; activePanel: MasterPanel; children: string }) {
  return <a className={activePanel === panel ? 'active' : ''} href={`/master?panel=${panel}`}>{children}</a>;
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
          <span className={`admin-status-badge ${account.account_status || 'pending'}`}>{account.account_status || 'pending'}</span>
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
  const activeAccessView = normalizeMasterAccessWorkflowView(params.view);
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);

  const { user, profile, supabase } = await requireRole('master');
  const { accounts: profiles, errorMessage: queryError } = await listManagedAccounts(supabase, 'master');

  const ownerProfiles = profiles.filter((item) => item.role === 'master');
  const managerProfiles = profiles.filter((item) => item.role === 'manager' || item.role === 'admin');
  const clientProfiles = profiles.filter((item) => item.role === 'client');
  const pendingClients = clientProfiles.filter((item) => item.account_status === 'pending_manager_assignment' || item.account_status === 'pending_manager_approval');
  const disabledAccounts = profiles.filter((item) => item.account_status === 'disabled' || item.account_status === 'suspended');
  const unassignedClients = clientProfiles.filter((item) => !item.manager_id);
  const linkedClients = clientProfiles.filter((item) => item.manager_id);
  const attentionQueue = [...pendingClients, ...disabledAccounts];
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
          <MasterSidebarLink panel="access" activePanel={activePanel}>All accounts</MasterSidebarLink>
          <MasterSidebarLink panel="managers" activePanel={activePanel}>Managers</MasterSidebarLink>
          <MasterSidebarLink panel="clients" activePanel={activePanel}>Clients</MasterSidebarLink>
          <a className={activePanel === "reports" ? "active" : ""} href="/master/reports">Reports</a>
          <a href="/master/audit">Audit log</a>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Master account'}</strong>
          <small>Owner account</small>
          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero master-compact-hero">
          <div>
            <p>Master operations</p>
            <h1>Manager command center.</h1>
            <span>Promote managers, control account status, and monitor client-manager coverage. No quota system is active.</span>
          </div>
        </header>

        {controlStatus && (
          <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}>
            <strong>{controlStatus === 'ok' ? 'Action completed' : 'Action failed'}</strong>
            <span>{controlStatus === 'ok' ? 'The console has refreshed with the latest account state.' : controlMessage || 'Unknown error.'}</span>
          </section>
        )}

        {queryError ? (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">Could not load account records: {queryError}</div>
          </section>
        ) : (
          <>
            {activePanel === 'monitoring' && (
              <>
                <section className="admin-monitor-stats master-monitoring-stats" aria-label="Monitoring metrics">
                  <article><p>Total users</p><strong>{profiles.length}</strong></article>
                  <article><p>Managers</p><strong>{managerProfiles.length}</strong></article>
                  <article><p>Pending clients</p><strong>{pendingClients.length}</strong></article>
                  <article><p>Attention</p><strong>{attentionQueue.length}</strong></article>
                </section>

                <section className="admin-power-grid">
                  <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                    <div className="admin-monitor-card-header">
                      <div><p>Monitoring</p><h2>Attention queue</h2></div>
                      <a className="dashboard-card-link" href="/master?panel=clients">View clients</a>
                    </div>
                    <StatusList accounts={attentionQueue} />
                    <SnapshotFooter count={5} total={attentionQueue.length} href="/master?panel=clients" />
                  </article>

                  <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                    <div className="admin-monitor-card-header">
                      <div><p>Coverage</p><h2>Client-manager assignment</h2></div>
                      <a className="dashboard-card-link" href="/master?panel=clients">View clients</a>
                    </div>
                    <div className="dashboard-snapshot-list">
                      <div className="admin-power-list">
                        <span>Linked clients: {linkedClients.length}</span>
                        <span>Unassigned clients: {unassignedClients.length}</span>
                        <span>Managers available: {managerProfiles.length}</span>
                        <span>Coverage rate: {coverageRate}%</span>
                      </div>
                    </div>
                    <SnapshotFooter count={4} total={4} href="/master?panel=clients" />
                  </article>
                </section>
              </>
            )}
            {activePanel === 'access' && (
              <>
                {activeAccessView === 'overview' && (
                  <section className="progressive-dataset-grid access-workflow-grid">
                    <a className="progressive-dataset-card access-workflow-card" href="/master?panel=access&view=managers">
                      <p>Manager control</p>
                      <h2>Manager accounts</h2>
                      <span>{managerProfiles.length} manager account(s)</span>
                      <strong>Promote, demote, suspend, disable, reactivate, and rotate invite codes.</strong>
                    </a>

                    <a className="progressive-dataset-card access-workflow-card" href="/master?panel=access&view=clients">
                      <p>Client control</p>
                      <h2>Client accounts</h2>
                      <span>{clientProfiles.length} client account(s)</span>
                      <strong>Review client ownership, manager assignment, and account access state.</strong>
                    </a>

                    <a className="progressive-dataset-card access-workflow-card" href="/master?panel=access&view=pending">
                      <p>Pending</p>
                      <h2>Pending / unassigned</h2>
                      <span>{pendingClients.length} pending</span>
                      <strong>Find users who still need manager assignment or approval.</strong>
                    </a>

                    <a className="progressive-dataset-card access-workflow-card" href="/master/reports">
                      <p>Reports</p>
                      <h2>Generation reports</h2>
                      <span>{coverageRate}% coverage</span>
                      <strong>Open read-only platform activity reports and CSV export.</strong>
                    </a>

                    <a className="progressive-dataset-card access-workflow-card" href="/master/audit">
                      <p>Audit</p>
                      <h2>Access history</h2>
                      <span>{attentionQueue.length} attention item(s)</span>
                      <strong>Review promotion, approval, rejection, and invite activity.</strong>
                    </a>
                  </section>
                )}

                {activeAccessView === 'managers' && (
                  <section className="master-access-stack">
                    <div className="access-workflow-toolbar">
                      <a className="access-workflow-back" href="/master?panel=access">← Access control</a>
                      <span>{managerProfiles.length} manager account(s)</span>
                    </div>

                    <article className="admin-monitor-card native-operation-card">
                      <div className="admin-monitor-card-header">
                        <div><p>Manager control</p><h2>Manager accounts</h2></div>
                        <span>{managerProfiles.length} managers</span>
                      </div>
                      <MasterAccountTable accounts={managerProfiles} currentUserId={user.id} emptyText="No manager accounts found yet." />
                    </article>
                  </section>
                )}

                {activeAccessView === 'clients' && (
                  <section className="master-access-stack">
                    <div className="access-workflow-toolbar">
                      <a className="access-workflow-back" href="/master?panel=access">← Access control</a>
                      <span>{clientProfiles.length} client account(s)</span>
                    </div>

                    <article className="admin-monitor-card native-operation-card">
                      <div className="admin-monitor-card-header">
                        <div><p>Client control</p><h2>Client accounts</h2></div>
                        <span>{clientProfiles.length} clients</span>
                      </div>
                      <MasterAccountTable accounts={clientProfiles} currentUserId={user.id} emptyText="No client accounts found yet." />
                    </article>
                  </section>
                )}

                {activeAccessView === 'pending' && (
                  <section className="master-access-stack">
                    <div className="access-workflow-toolbar">
                      <a className="access-workflow-back" href="/master?panel=access">← Access control</a>
                      <span>{pendingClients.length} pending / unassigned</span>
                    </div>

                    <article className="admin-monitor-card native-operation-card">
                      <div className="admin-monitor-card-header">
                        <div><p>Client control</p><h2>Pending / unassigned clients</h2></div>
                        <span>{pendingClients.length} pending</span>
                      </div>
                      <MasterAccountTable accounts={pendingClients} currentUserId={user.id} emptyText="No pending clients." />
                    </article>
                  </section>
                )}
              </>
            )}

            {activePanel === 'managers' && (
              <section className="master-access-stack">
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Manager control</p><h2>Active manager accounts</h2></div>
                    <span>{managerProfiles.length} managers</span>
                  </div>
                  <MasterAccountTable accounts={managerProfiles} currentUserId={user.id} emptyText="No manager accounts found yet." />
                </article>
              </section>
            )}

            {activePanel === 'clients' && (
              <section className="master-access-stack">
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Client control</p><h2>Pending / unassigned clients</h2></div>
                    <span>{pendingClients.length} pending</span>
                  </div>
                  <MasterAccountTable accounts={pendingClients} currentUserId={user.id} emptyText="No pending clients." />
                </article>

                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Client control</p><h2>All client accounts</h2></div>
                    <span>{clientProfiles.length} clients</span>
                  </div>
                  <MasterAccountTable accounts={clientProfiles} currentUserId={user.id} emptyText="No client accounts found yet." />
                </article>
              </section>
            )}

            {activePanel === 'reports' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Report</p><h2>Account coverage</h2></div>
                    <span>{coverageRate}%</span>
                  </div>
                  <div className="admin-power-list">
                    <span>Owners: {ownerProfiles.length}</span>
                    <span>Managers: {managerProfiles.length}</span>
                    <span>Clients: {clientProfiles.length}</span>
                    <span>Assigned clients: {linkedClients.length}</span>
                    <span>Unassigned clients: {unassignedClients.length}</span>
                    <span>No quota system: active</span>
                  </div>
                </article>

                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Report</p><h2>Recommended actions</h2></div>
                    <span>{attentionQueue.length} tasks</span>
                  </div>
                  <div className="admin-power-list">
                    <span>Promote trusted operators to manager.</span>
                    <span>Managers invite and approve their own clients.</span>
                    <span>Disable accounts only when access should be blocked.</span>
                    <span>Approved clients can generate without quota limits.</span>
                  </div>
                </article>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
