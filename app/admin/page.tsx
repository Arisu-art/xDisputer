import { ensureManagerInviteCode, listManagedAccounts, type ManagedAccount } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

type ManagerPanel = 'monitoring' | 'access' | 'intake' | 'review' | 'reports';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
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

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function ManagerSidebarLink({ panel, activePanel, children }: { panel: ManagerPanel; activePanel: ManagerPanel; children: string }) {
  return <a className={activePanel === panel ? 'active' : ''} href={`/admin?panel=${panel}`}>{children}</a>;
}

function ControlForm({ profileId, intent, label }: { profileId: string; intent: string; label: string }) {
  return (
    <form action="/api/control/profile" method="post">
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="intent" value={intent} />
      <button type="submit" className="admin-action-button">{label}</button>
    </form>
  );
}

function ClientControlTable({ clients }: { clients: ManagedAccount[] }) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table">
        <thead>
          <tr><th>Client</th><th>Status</th><th>Joined</th><th>Updated</th><th>Controls</th></tr>
        </thead>
        <tbody>
          {clients.length ? clients.map((item) => (
            <tr key={item.id}>
              <td><strong>{item.full_name || item.email || 'Unnamed client'}</strong><small>{item.email || 'Client account'}</small></td>
              <td><span className={`admin-status-badge ${item.account_status || 'active'}`}>{item.account_status || 'active'}</span></td>
              <td>{formatDate(item.created_at)}</td>
              <td>{formatDate(item.updated_at)}</td>
              <td><div className="admin-actions-row">{item.account_status === 'disabled' ? <ControlForm profileId={item.id} intent="activate" label="Activate" /> : <ControlForm profileId={item.id} intent="disable" label="Disable" />}</div></td>
            </tr>
          )) : <tr><td colSpan={5} className="admin-monitor-empty">No clients assigned yet. Share your invite code with a client.</td></tr>}
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
          <div><strong>{client.full_name || client.email || 'Unnamed client'}</strong><span>{client.email || 'Client account'} • Updated {formatDate(client.updated_at)}</span></div>
          <span className={`admin-status-badge ${client.account_status || 'active'}`}>{client.account_status || 'active'}</span>
        </article>
      ))}
    </div>
  );
}

function SnapshotFooter({ count, total, href }: { count: number; total: number; href: string }) {
  return <div className="dashboard-snapshot-footer"><span>Showing 1-{Math.min(count, total)} of {total}</span><a className="dashboard-card-link" href={href}>View all</a></div>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const activePanel = normalizePanel(params.panel);
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);
  const { user, profile, supabase } = await requireRole('manager');
  const inviteCode = await ensureManagerInviteCode(supabase, user.id);
  const { accounts: clients, errorMessage: queryError } = await listManagedAccounts(supabase, 'manager', user.id);

  const totalClients = clients.length;
  const activeClients = clients.filter((item) => (item.account_status || 'active') === 'active');
  const disabledClients = clients.filter((item) => item.account_status === 'disabled');
  const readyForReview = activeClients;
  const attentionQueue = disabledClients;
  const activeRate = totalClients ? Math.round((activeClients.length / totalClients) * 100) : 0;

  return (
    <main className="admin-monitor-page native-console manager-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>Manager console</small></div></div>
        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Manager navigation">
          <ManagerSidebarLink panel="monitoring" activePanel={activePanel}>Monitoring</ManagerSidebarLink>
          <ManagerSidebarLink panel="access" activePanel={activePanel}>Access control</ManagerSidebarLink>
          <ManagerSidebarLink panel="intake" activePanel={activePanel}>Client intake</ManagerSidebarLink>
          <ManagerSidebarLink panel="review" activePanel={activePanel}>Review queue</ManagerSidebarLink>
          <ManagerSidebarLink panel="reports" activePanel={activePanel}>Reports</ManagerSidebarLink>
        </nav>
        <div className="admin-monitor-account"><strong>{profile?.email || user.email || 'Manager account'}</strong><small>Manager account</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero manager-compact-hero"><div><p>Manager operations</p><h1>Client monitoring center.</h1><span>Track assigned clients, control access, run intake, and review readiness.</span></div></header>

        {controlStatus && <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}><strong>{controlStatus === 'ok' ? 'Action completed' : 'Action failed'}</strong><span>{controlStatus === 'ok' ? 'The manager console has refreshed with the latest client state.' : controlMessage || 'Unknown error.'}</span></section>}

        {queryError ? <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load assigned client records: {queryError}</div></section> : (
          <>
            {activePanel === 'monitoring' && <><section className="admin-monitor-stats" aria-label="Client monitoring metrics"><article><p>Assigned</p><strong>{totalClients}</strong></article><article><p>Active</p><strong>{activeClients.length}</strong></article><article><p>Attention</p><strong>{attentionQueue.length}</strong></article><article><p>Active rate</p><strong>{activeRate}%</strong></article></section><section className="admin-power-grid"><article className="admin-monitor-card native-operation-card dashboard-snapshot-card"><div className="admin-monitor-card-header"><div><p>Monitoring</p><h2>Attention queue</h2></div><a className="dashboard-card-link" href="/admin/clients?filter=attention">View all</a></div><ClientMonitorList clients={attentionQueue} emptyText="No assigned clients need access attention." /><SnapshotFooter count={5} total={attentionQueue.length} href="/admin/clients?filter=attention" /></article><article className="admin-monitor-card native-operation-card dashboard-snapshot-card"><div className="admin-monitor-card-header"><div><p>Monitoring</p><h2>Ready clients</h2></div><a className="dashboard-card-link" href="/admin/clients?filter=active">View all</a></div><ClientMonitorList clients={readyForReview} emptyText="No active clients are ready yet." /><SnapshotFooter count={5} total={readyForReview.length} href="/admin/clients?filter=active" /></article></section></>}
            {activePanel === 'access' && <section className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Access control</p><h2>Assigned client accounts</h2></div><a className="dashboard-card-link" href="/admin/clients">Full table</a></div><ClientControlTable clients={clients} /></section>}
            {activePanel === 'intake' && <section className="admin-power-grid"><article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Client intake</p><h2>Invite command</h2></div><span>Manager only</span></div><div className="invite-code-card"><strong>{inviteCode}</strong><span>Share this code with a client. The client joins from the manager access dock in their workspace.</span></div><form action="/api/control/invite" method="post" className="admin-inline-form"><button type="submit" className="admin-action-button primary">Rotate invite code</button></form></article><article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Client intake</p><h2>Onboarding process</h2></div></div><div className="admin-power-list"><span>1. Share invite code with client.</span><span>2. Client joins from workspace manager dock.</span><span>3. Confirm client appears in Access control.</span><span>4. Review account health before document support.</span></div></article></section>}
            {activePanel === 'review' && <section className="admin-power-grid"><article className="admin-monitor-card native-operation-card dashboard-snapshot-card"><div className="admin-monitor-card-header"><div><p>Review queue</p><h2>Ready for workflow review</h2></div><a className="dashboard-card-link" href="/admin/clients?filter=active">View all</a></div><ClientMonitorList clients={readyForReview} emptyText="No active clients are ready for review yet." /><SnapshotFooter count={5} total={readyForReview.length} href="/admin/clients?filter=active" /></article><article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Review process</p><h2>Manager checklist</h2></div></div><div className="admin-power-list"><span>Check access status before supporting a client.</span><span>Confirm the client is connected to your manager account.</span><span>Review source document readiness before generation.</span><span>Disable access only when workflow risk requires blocking.</span></div></article></section>}
            {activePanel === 'reports' && <section className="admin-power-grid"><article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Report</p><h2>Client access summary</h2></div><span>{activeRate}% active</span></div><div className="admin-power-list"><span>Total assigned clients: {totalClients}</span><span>Active clients: {activeClients.length}</span><span>Disabled clients: {disabledClients.length}</span><span>Ready for review: {readyForReview.length}</span></div></article><article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Report</p><h2>Recommended actions</h2></div><span>{attentionQueue.length} tasks</span></div><div className="admin-power-list"><span>Use Client intake when new clients need to join your manager group.</span><span>Use Access control for activate/disable decisions.</span><span>Use Review queue before supporting document generation.</span><span>Use Reports for a quick operational summary.</span></div></article></section>}
          </>
        )}
      </section>
    </main>
  );
}
