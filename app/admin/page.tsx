import ConsoleNavLink from '../../components/ConsoleNavLink';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ensureManagerInviteCode } from '../../lib/saas/account-management';
import {
  getManagerClientSummary,
  listManagerClientDirectory,
  type AccountDirectoryListResult,
  type AccountDirectoryRow
} from '../../lib/saas/account-directory';
import { requireRole } from '../../lib/saas/session';

type ManagerPanel = 'monitoring' | 'intake' | 'review' | 'reports';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
    view?: string | string[];
  }>;
};

const emptyDirectoryResult: AccountDirectoryListResult = {
  accounts: [],
  total: 0,
  page: 1,
  pageSize: 5,
  errorMessage: null
};

function normalizePanel(value: string | string[] | undefined): ManagerPanel {
  const panel = Array.isArray(value) ? value[0] : value;
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

function statusText(value: string | null | undefined) {
  if (value === 'pending_manager_assignment') return 'Waiting for invite';
  if (value === 'pending_manager_approval') return 'Pending approval';
  if (value === 'active') return 'Active';
  if (value === 'suspended') return 'Suspended';
  if (value === 'disabled') return 'Disabled';
  return value || 'Pending';
}

function ManagerSidebarLink({ panel, activePanel, children }: { panel: ManagerPanel; activePanel: ManagerPanel; children: string }) {
  return <ConsoleNavLink className={activePanel === panel ? 'active' : ''} href={panel === 'monitoring' ? '/admin' : `/admin?panel=${panel}`}>{children}</ConsoleNavLink>;
}

function ClientMonitorList({ clients, emptyText }: { clients: AccountDirectoryRow[]; emptyText: string }) {
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
      <ConsoleNavLink className="dashboard-card-link" href={href}>View all</ConsoleNavLink>
    </div>
  );
}

export default async function AdminPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const rawPanel = stringParam(params.panel);
  const rawView = stringParam(params.view);

  if (rawPanel === 'access' || rawPanel === 'clients') {
    const target = rawView ? `/admin/access?view=${encodeURIComponent(rawView)}` : '/admin/access';
    redirect(target);
  }

  const activePanel = normalizePanel(params.panel);
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);
  const { user, profile, supabase } = await requireRole('manager');

  const [summaryResult, pendingResult, activeResult, blockedResult, inviteCode] = await Promise.all([
    getManagerClientSummary(supabase),
    activePanel === 'monitoring'
      ? listManagerClientDirectory(supabase, { view: 'pending', page: 1, pageSize: 5 })
      : Promise.resolve(emptyDirectoryResult),
    activePanel === 'monitoring'
      ? listManagerClientDirectory(supabase, { view: 'active', page: 1, pageSize: 5 })
      : Promise.resolve(emptyDirectoryResult),
    activePanel === 'review'
      ? listManagerClientDirectory(supabase, { view: 'blocked', page: 1, pageSize: 5 })
      : Promise.resolve(emptyDirectoryResult),
    activePanel === 'intake'
      ? ensureManagerInviteCode(supabase, user.id)
      : Promise.resolve('')
  ]);

  let inviteLink = '';

  if (activePanel === 'intake') {
    const requestHeaders = await headers();
    const host = requestHeaders.get('x-forwarded-host') || requestHeaders.get('host') || 'x-disputer.vercel.app';
    const protocol = requestHeaders.get('x-forwarded-proto') || 'https';
    inviteLink = `${protocol}://${host}/signup?invite=${encodeURIComponent(inviteCode)}`;
  }

  const summary = summaryResult.summary;
  const queryError = summaryResult.errorMessage || pendingResult.errorMessage || activeResult.errorMessage || blockedResult.errorMessage;
  const activeRate = summary.clients ? Math.round((summary.active / summary.clients) * 100) : 0;

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
          <ConsoleNavLink href="/admin/access">Access control</ConsoleNavLink>
          <ManagerSidebarLink panel="intake" activePanel={activePanel}>Client intake</ManagerSidebarLink>
          <ManagerSidebarLink panel="review" activePanel={activePanel}>Review queue</ManagerSidebarLink>
          <ConsoleNavLink href="/admin/reports">Reports</ConsoleNavLink>
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
            <span>Compact workspace RPC reads keep this dashboard fast while the full access table remains paginated.</span>
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
                  <article><p>Assigned</p><strong>{summary.clients}</strong></article>
                  <article><p>Pending</p><strong>{summary.pending}</strong></article>
                  <article><p>Active</p><strong>{summary.active}</strong></article>
                  <article><p>Active rate</p><strong>{activeRate}%</strong></article>
                </section>

                <section className="admin-power-grid">
                  <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                    <div className="admin-monitor-card-header">
                      <div><p>Monitoring</p><h2>Pending approval</h2></div>
                      <ConsoleNavLink className="dashboard-card-link" href="/admin/access?view=pending">Review</ConsoleNavLink>
                    </div>
                    <ClientMonitorList clients={pendingResult.accounts} emptyText="No clients are waiting for approval." />
                    <SnapshotFooter count={pendingResult.accounts.length} total={summary.pending} href="/admin/access?view=pending" />
                  </article>

                  <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                    <div className="admin-monitor-card-header">
                      <div><p>Monitoring</p><h2>Active clients</h2></div>
                      <ConsoleNavLink className="dashboard-card-link" href="/admin/access?view=active">View all</ConsoleNavLink>
                    </div>
                    <ClientMonitorList clients={activeResult.accounts} emptyText="No active clients yet." />
                    <SnapshotFooter count={activeResult.accounts.length} total={summary.active} href="/admin/access?view=active" />
                  </article>
                </section>
              </>
            )}

            {activePanel === 'intake' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card manager-intake-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Invite</p><h2>Manager invite link</h2></div>
                    <span>{inviteCode}</span>
                  </div>
                  <p>Share this link with clients who should connect to your workspace. They remain pending until you approve them.</p>
                  <code>{inviteLink}</code>
                </article>
              </section>
            )}

            {activePanel === 'review' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Review</p><h2>Blocked clients</h2></div>
                    <ConsoleNavLink className="dashboard-card-link" href="/admin/access?view=blocked">Open queue</ConsoleNavLink>
                  </div>
                  <ClientMonitorList clients={blockedResult.accounts} emptyText="No disabled or suspended clients." />
                  <SnapshotFooter count={blockedResult.accounts.length} total={summary.blocked} href="/admin/access?view=blocked" />
                </article>
              </section>
            )}

            {activePanel === 'reports' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card">
                  <div className="admin-monitor-card-header">
                    <div><p>Reports</p><h2>Manager workspace summary</h2></div>
                    <ConsoleNavLink className="dashboard-card-link" href="/admin/reports">Open reports</ConsoleNavLink>
                  </div>
                  <div className="admin-power-list">
                    <span>Assigned clients: {summary.clients}</span>
                    <span>Linked clients: {summary.linked}</span>
                    <span>Unassigned clients: {summary.unassigned}</span>
                    <span>Blocked accounts: {summary.blocked}</span>
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
