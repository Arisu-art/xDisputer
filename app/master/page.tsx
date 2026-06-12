import ConsoleNavLink from '../../components/ConsoleNavLink';
import { redirect } from 'next/navigation';
import {
  getMasterAccountSummary,
  listMasterAttentionQueue,
  type AccountDirectoryRow
} from '../../lib/saas/account-directory';
import { requireRole } from '../../lib/saas/session';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
    view?: string | string[];
  }>;
};

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function StatusList({ accounts }: { accounts: AccountDirectoryRow[] }) {
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
  const rawPanel = stringParam(params.panel);
  const rawView = stringParam(params.view);

  if (rawPanel === 'access' || rawPanel === 'managers' || rawPanel === 'clients') {
    const view = rawPanel === 'managers' ? 'managers' : rawPanel === 'clients' ? 'clients' : rawView;
    const target = view ? `/master/accounts?view=${encodeURIComponent(view)}` : '/master/accounts';
    redirect(target);
  }

  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);
  const { user, profile, supabase } = await requireRole('master');

  const [summaryResult, attentionResult] = await Promise.all([
    getMasterAccountSummary(supabase),
    listMasterAttentionQueue(supabase, 5)
  ]);

  const summary = summaryResult.summary;
  const queryError = summaryResult.errorMessage || attentionResult.errorMessage;
  const attention = attentionResult.accounts;
  const attentionTotal = attentionResult.total || summary.pending + summary.blocked;
  const coverageRate = summary.clients ? Math.round((summary.linked / summary.clients) * 100) : 0;

  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Master console</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Master navigation">
          <a className="active" href="/master">Monitoring</a>
          <ConsoleNavLink href="/master/accounts">All accounts</ConsoleNavLink>
          <ConsoleNavLink href="/master/accounts?view=managers">Managers</ConsoleNavLink>
          <ConsoleNavLink href="/master/accounts?view=clients">Clients</ConsoleNavLink>
          <ConsoleNavLink href="/master/reports">Reports</ConsoleNavLink>
          <ConsoleNavLink href="/master/audit">Audit log</ConsoleNavLink>
          <ConsoleNavLink href="/master/system">System health</ConsoleNavLink>
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
            <span>Compact workspace RPC reads keep this dashboard fast while account directories stay paginated.</span>
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
            <section className="admin-monitor-stats master-monitoring-stats" aria-label="Monitoring metrics">
              <article><p>Total users</p><strong>{summary.total}</strong></article>
              <article><p>Managers</p><strong>{summary.managers}</strong></article>
              <article><p>Pending clients</p><strong>{summary.pending}</strong></article>
              <article><p>Attention</p><strong>{attentionTotal}</strong></article>
            </section>

            <section className="admin-power-grid">
              <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                <div className="admin-monitor-card-header">
                  <div><p>Monitoring</p><h2>Attention queue</h2></div>
                  <a className="dashboard-card-link" href="/master/accounts?view=pending">View pending</a>
                </div>
                <StatusList accounts={attention} />
                <SnapshotFooter count={attention.length} total={attentionTotal} href="/master/accounts?view=pending" />
              </article>

              <article className="admin-monitor-card native-operation-card dashboard-snapshot-card">
                <div className="admin-monitor-card-header">
                  <div><p>Coverage</p><h2>Client-manager assignment</h2></div>
                  <a className="dashboard-card-link" href="/master/accounts?view=clients">View clients</a>
                </div>
                <div className="dashboard-snapshot-list">
                  <div className="admin-power-list">
                    <span>Linked clients: {summary.linked}</span>
                    <span>Unassigned clients: {summary.unassigned}</span>
                    <span>Managers available: {summary.managers}</span>
                    <span>Coverage rate: {coverageRate}%</span>
                  </div>
                </div>
                <SnapshotFooter count={4} total={4} href="/master/accounts?view=clients" />
              </article>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
