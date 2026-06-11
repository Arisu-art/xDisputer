import ConsoleNavLink from '../../components/ConsoleNavLink';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ensureManagerInviteCode, listManagedAccounts, type ManagedAccount } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

type ManagerPanel = 'monitoring' | 'access' | 'intake' | 'review' | 'reports';
type AccessWorkflowView = 'overview' | 'pending' | 'active' | 'blocked';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
    view?: string | string[];
  }>;
};

function normalizePanel(value: string | string[] | undefined): ManagerPanel {
  const panel = Array.isArray(value) ? value[0] : value;
  if (panel === 'access' || panel === 'clients') return 'access';
  if (panel === 'intake' || panel === 'invite' || panel === 'handoff') return 'intake';
  if (panel === 'review') return 'review';
  if (panel === 'reports' || panel === 'health') return 'reports';
  return 'monitoring';
}

function normalizeAccessWorkflowView(value: string | string[] | undefined): AccessWorkflowView {
  const view = Array.isArray(value) ? value[0] : value;
  if (view === 'pending' || view === 'active' || view === 'blocked') return view;
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

function statusText(value: string | null | undefined) {
  if (value === 'pending_manager_assignment') return 'Waiting for invite';
  if (value === 'pending_manager_approval') return 'Pending approval';
  if (value === 'active') return 'Active';
  if (value === 'suspended') return 'Suspended';
  if (value === 'disabled') return 'Disabled';
  return value || 'Pending';
}

function ManagerSidebarLink({ panel, activePanel, children }: { panel: ManagerPanel; activePanel: ManagerPanel; children: string }) {
  return <a className={activePanel === panel ? 'active' : ''} href={panel === 'access' ? '/admin/access' : `/admin?panel=${panel}`}>{children}</a>;
}

function ControlForm({ profileId, intent, label, primary = false }: { profileId: string; intent: string; label: string; primary?: boolean }) {
  return (
    <form action="/api/control/profile" method="post">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="intent" value={intent} />
      <button type="submit" className={`admin-action-button ${primary ? 'primary' : ''}`}>{label}</button>
    </form>
  );
}

function ClientRows({ clients, emptyText }: { clients: ManagedAccount[]; emptyText: string }) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Updated</th>
            <th>Controls</th>
          </tr>
        </thead>
        <tbody>
          {clients.length ? clients.map((item) => (
            <tr key={item.id}>
              <td data-label="Client">
                <strong>{item.full_name || item.email || 'Unnamed client'}</strong>
                <small>{item.email || 'Client account'}</small>
              </td>
              <td data-label="Status">
                <span className={`admin-status-badge ${item.account_status || 'pending'}`}>
                  {statusText(item.account_status)}
                </span>
              </td>
              <td data-label="Joined">{formatDate(item.created_at)}</td>
              <td data-label="Updated">{formatDate(item.updated_at)}</td>
              <td data-label="Controls">
                <div className="admin-actions-row">
                  {item.account_status === 'pending_manager_approval' && (
                    <>
                      <ControlForm profileId={item.id} intent="approve" label="Approve" primary />
                      <ControlForm profileId={item.id} intent="reject" label="Reject" />
                    </>
                  )}

                  {item.account_status === 'active' && (
                    <ControlForm profileId={item.id} intent="disable" label="Disable" />
                  )}

                  {(item.account_status === 'disabled' || item.account_status === 'suspended') && (
                    <ControlForm profileId={item.id} intent="activate" label="Reactivate" primary />
                  )}

                  {item.account_status === 'pending_manager_assignment' && (
                    <ControlForm profileId={item.id} intent="clear_manager" label="Clear" />
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="admin-monitor-empty">{emptyText}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ClientMonitorList({ clients, emptyText }: { clients: ManagedAccount[]; emptyText: string }) {
  if (!clients.length) return <div className="admin-monitor-empty">{emptyText}</div>;

  return (
    <div className="dashboard-snapshot-list manager-monitor-list">
      {clients.slice(0, 5).map((client) => (
        <article key={client.id} className="manager-monitor-item">
          <div>
            <strong>{client.full_name || client.email || 'Unnamed client'}</strong>
            <span>{client.email || 'Client account'} • Updated {formatDate(client.updated_at)}</span>
          </div>
          <span className={`admin-status-badge ${client.account_status || 'pending'}`}>
            {statusText(client.account_status)}
          </span>
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

export default async function AdminPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const rawPanel = Array.isArray(params.panel) ? params.panel[0] : params.panel;
  const rawView = Array.isArray(params.view) ? params.view[0] : params.view;

  if (rawPanel === 'access' || rawPanel === 'clients') {
    const target = rawView ? `/admin/access?view=${encodeURIComponent(rawView)}` : '/admin/access';
    redirect(target);
  }

  const activePanel = normalizePanel(params.panel);
  const activeAccessView = normalizeAccessWorkflowView(params.view);
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);

  const requestHeaders = await headers();
  const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'x-disputer.vercel.app';
  const protocol = requestHeaders.get('x-forwarded-proto') || 'https';
  const origin = `${protocol}://${host}`;

  const { user, profile, supabase } = await requireRole('manager');
  const inviteCode = await ensureManagerInviteCode(supabase, user.id);
  const inviteLink = `${origin}/signup?invite=${encodeURIComponent(inviteCode)}`;

  const { accounts: clients, errorMessage: queryError } = await listManagedAccounts(supabase, 'manager', user.id);

  const totalClients = clients.length;
  const pendingClients = clients.filter((item) => item.account_status === 'pending_manager_approval');
  const activeClients = clients.filter((item) => item.account_status === 'active');
  const disabledClients = clients.filter((item) => item.account_status === 'disabled' || item.account_status === 'suspended');
  const attentionQueue = [...pendingClients, ...disabledClients];
  const activeRate = totalClients ? Math.round((activeClients.length / totalClients) * 100) : 0;

  return (
    <main className="admin-monitor-page native-console manager-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Manager console</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Manager navigation">
          <ManagerSidebarLink panel="monitoring" activePanel={activePanel}>Monitoring</ManagerSidebarLink>
          <ManagerSidebarLink panel="access" activePanel={activePanel}>Access control</ManagerSidebarLink>
          <ManagerSidebarLink panel="intake" activePanel={activePanel}>Client intake</ManagerSidebarLink>
          <ManagerSidebarLink panel="review" activePanel={activePanel}>Review queue</ManagerSidebarLink>
          <a className={activePanel === "reports" ? "active" : ""} href="/admin/reports">Reports</a>
          <ConsoleNavLink href="/admin/audit">Audit log</ConsoleNavLink>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Manager account'}</strong>
          <small>Manager account</small>
          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero manager-compact-hero">
          <div>
            <p>Manager operations</p>
            <h1>Client access center.</h1>
            <span>Invite clients, approve access, and monitor account status. No generation quota is applied.</span>
          </div>
        </header>

        {controlStatus && (
          <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}>
            <strong>{controlStatus === 'ok' ? 'Action completed' : 'Action failed'}</strong>
            <span>{controlStatus === 'ok' ? 'The manager console has refreshed with the latest client state.' : controlMessage || 'Unknown error.'}</span>
          </section>
        )}

        {queryError ? (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">Could not load assigned client records: {queryError}</div>
          </section>
        ) : (
          <>
            {activePanel === 'monitoring' && (
              <>
                <section className="admin-monitor-stats" aria-label="Client monitoring metrics">
                  <article><p>Assigned</p><strong>{totalClients}</strong></article>
                  <article><p>Pending</p><strong>{pendingClients.length}</strong></article>
                  <article><p>Active</p><strong>{activeClients.length}</strong></article>
                  <article><p>Active rate</p><strong>{activeRate}%</strong></article>
                </section>

                <section className="admin-power-grid">
                  <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                    <div className="admin-monitor-card-header">
                      <div><p>Monitoring</p><h2>Pending approval</h2></div>
                      <a className="dashboard-card-link" href="/admin/access">Review</a>
                    </div>
                    <ClientMonitorList clients={pendingClients} emptyText="No clients are waiting for approval." />
                    <SnapshotFooter count={5} total={pendingClients.length} href="/admin/access" />
                  </article>

                  <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                    <div className="admin-monitor-card-header">
                      <div><p>Monitoring</p><h2>Active clients</h2></div>
                      <a className="dashboard-card-link" href="/admin/access">View all</a>
                    </div>
                    <ClientMonitorList clients={activeClients} emptyText="No active clients yet." />
                    <SnapshotFooter count={5} total={activeClients.length} href="/admin/access" />
                  </article>
                </section>
              </>
            )}
            {activePanel === 'access' && (
              <>
                {activeAccessView === 'overview' && (
                  <section className="progressive-dataset-grid access-workflow-grid">
                    <a className="progressive-dataset-card access-workflow-card" href="/admin?panel=access&view=pending">
                      <p>Access control</p>
                      <h2>Pending approval</h2>
                      <span>{pendingClients.length} pending</span>
                      <strong>Review users waiting for manager approval.</strong>
                    </a>

                    <a className="progressive-dataset-card access-workflow-card" href="/admin?panel=access&view=active">
                      <p>Access control</p>
                      <h2>Active clients</h2>
                      <span>{activeClients.length} active</span>
                      <strong>Manage approved clients that can use the workspace.</strong>
                    </a>

                    <a className="progressive-dataset-card access-workflow-card" href="/admin?panel=access&view=blocked">
                      <p>Access control</p>
                      <h2>Disabled / suspended</h2>
                      <span>{disabledClients.length} blocked</span>
                      <strong>Review clients whose workspace access is currently blocked.</strong>
                    </a>

                    <a className="progressive-dataset-card access-workflow-card" href="/admin/audit">
                      <p>Audit</p>
                      <h2>Access history</h2>
                      <span>Review events</span>
                      <strong>Check approvals, rejections, account controls, and invite activity.</strong>
                    </a>
                  </section>
                )}

                {activeAccessView === 'pending' && (
                  <section className="admin-dataset-stack">
                    <div className="access-workflow-toolbar">
                      <a className="access-workflow-back" href="/admin/access">← Access control</a>
                      <span>{pendingClients.length} pending approval</span>
                    </div>

                    <article className="admin-monitor-card native-operation-card">
                      <div className="admin-monitor-card-header">
                        <div><p>Access control</p><h2>Pending approval</h2></div>
                        <span>{pendingClients.length} pending</span>
                      </div>
                      <ClientRows clients={pendingClients} emptyText="No clients are waiting for approval." />
                    </article>
                  </section>
                )}

                {activeAccessView === 'active' && (
                  <section className="admin-dataset-stack">
                    <div className="access-workflow-toolbar">
                      <a className="access-workflow-back" href="/admin/access">← Access control</a>
                      <span>{activeClients.length} active clients</span>
                    </div>

                    <article className="admin-monitor-card native-operation-card">
                      <div className="admin-monitor-card-header">
                        <div><p>Access control</p><h2>Active clients</h2></div>
                        <span>{activeClients.length} active</span>
                      </div>
                      <ClientRows clients={activeClients} emptyText="No active clients assigned yet." />
                    </article>
                  </section>
                )}

                {activeAccessView === 'blocked' && (
                  <section className="admin-dataset-stack">
                    <div className="access-workflow-toolbar">
                      <a className="access-workflow-back" href="/admin/access">← Access control</a>
                      <span>{disabledClients.length} disabled / suspended</span>
                    </div>

                    <article className="admin-monitor-card native-operation-card">
                      <div className="admin-monitor-card-header">
                        <div><p>Access control</p><h2>Disabled / suspended</h2></div>
                        <span>{disabledClients.length} blocked</span>
                      </div>
                      <ClientRows clients={disabledClients} emptyText="No disabled or suspended clients." />
                    </article>
                  </section>
                )}
              </>
            )}

            {activePanel === 'intake' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Client intake</p><h2>Manager invite link</h2></div>
                    <span>Manager only</span>
                  </div>

                  <div className="invite-code-card">
                    <strong>{inviteCode}</strong>
                    <span>Invite code for direct-signup pending users.</span>
                  </div>

                  <div className="invite-code-card">
                    <strong>{inviteLink}</strong>
                    <span>Send this signup link to clients. They will still wait for your approval before workspace access unlocks.</span>
                  </div>

                  <form action="/api/control/invite" method="post" className="admin-inline-form">
                    <button type="submit" className="admin-action-button primary">Rotate invite code</button>
                  </form>
                </article>

                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Client intake</p><h2>Onboarding process</h2></div>
                  </div>
                  <div className="admin-power-list">
                    <span>1. Copy the manager invite link.</span>
                    <span>2. Send it to the client or staff user.</span>
                    <span>3. User signs up and becomes pending manager approval.</span>
                    <span>4. Open Access control and approve the user.</span>
                    <span>5. Approved users can generate without quota limits.</span>
                  </div>
                </article>
              </section>
            )}

            {activePanel === 'review' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Review queue</p><h2>Needs attention</h2></div>
                    <a className="dashboard-card-link" href="/admin/access">Open access</a>
                  </div>
                  <ClientMonitorList clients={attentionQueue} emptyText="No assigned clients need access attention." />
                  <SnapshotFooter count={5} total={attentionQueue.length} href="/admin/access" />
                </article>

                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Review process</p><h2>Manager checklist</h2></div>
                  </div>
                  <div className="admin-power-list">
                    <span>Approve only users you recognize.</span>
                    <span>Reject users who should not belong to your manager account.</span>
                    <span>Disable users when access should be blocked.</span>
                    <span>No quota is enforced on generation output.</span>
                  </div>
                </article>
              </section>
            )}

            {activePanel === 'reports' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Report</p><h2>Client access summary</h2></div>
                    <span>{activeRate}% active</span>
                  </div>
                  <div className="admin-power-list">
                    <span>Total assigned clients: {totalClients}</span>
                    <span>Pending approval: {pendingClients.length}</span>
                    <span>Active clients: {activeClients.length}</span>
                    <span>Disabled or suspended: {disabledClients.length}</span>
                  </div>
                </article>

                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Report</p><h2>Recommended actions</h2></div>
                    <span>{attentionQueue.length} tasks</span>
                  </div>
                  <div className="admin-power-list">
                    <span>Use Client intake to send manager invite links.</span>
                    <span>Use Access control to approve or reject users.</span>
                    <span>Use Review queue to handle pending and disabled users.</span>
                    <span>Approved users can generate without quota limits.</span>
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
