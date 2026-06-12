import ConsoleNavLink from '../../../components/ConsoleNavLink';
import {
  directoryQueryString,
  getMasterAccountSummary,
  listMasterAccountDirectory,
  normalizeDirectoryParams,
  type DirectoryView
} from '../../../lib/saas/account-directory';
import MasterAccountTable from '../MasterAccountTable';
import { requireRole } from '../../../lib/saas/session';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function viewTitle(view: string) {
  if (view === 'managers') return 'Workspace manager accounts';
  if (view === 'clients') return 'Workspace client accounts';
  if (view === 'pending') return 'Pending / unassigned workspace clients';
  if (view === 'blocked') return 'Disabled / suspended workspace accounts';
  return 'Workspace account directory';
}

function DirectoryFilter({ view, query }: { view: string; query: string }) {
  return (
    <form action="/master/accounts" method="get" className="directory-filter-form">
      <input type="hidden" name="view" value={view} />
      <label>
        <span>Search</span>
        <input name="q" type="search" placeholder="Email, name, role, status, manager, or invite code" defaultValue={query} />
      </label>
      <button className="admin-action-button primary" type="submit">Search</button>
      <ConsoleNavLink className="admin-action-button" href={`/master/accounts${directoryQueryString({ view })}`}>Reset</ConsoleNavLink>
    </form>
  );
}

function Pager({ view, query, page, pageSize, total }: { view: string; query: string; page: number; pageSize: number; total: number }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const previous = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  return (
    <div className="directory-pager">
      <span>Page {page} of {totalPages} • {total} result(s)</span>
      <div>
        <ConsoleNavLink className={`admin-action-button ${page <= 1 ? 'disabled' : ''}`} href={`/master/accounts${directoryQueryString({ view, q: query, page: previous, pageSize })}`}>Previous</ConsoleNavLink>
        <ConsoleNavLink className={`admin-action-button ${page >= totalPages ? 'disabled' : ''}`} href={`/master/accounts${directoryQueryString({ view, q: query, page: next, pageSize })}`}>Next</ConsoleNavLink>
      </div>
    </div>
  );
}

export default async function MasterAccountsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const directoryParams = normalizeDirectoryParams(params);
  const selectedView = ['managers', 'clients', 'pending', 'blocked', 'all'].includes(directoryParams.view)
    ? directoryParams.view as DirectoryView
    : 'overview';

  const { user, profile, supabase } = await requireRole('master');

  const [{ summary, errorMessage: summaryError }, directory] = await Promise.all([
    getMasterAccountSummary(supabase),
    selectedView === 'overview'
      ? Promise.resolve({ accounts: [], total: 0, page: 1, pageSize: directoryParams.pageSize, errorMessage: null })
      : listMasterAccountDirectory(supabase, {
          view: selectedView,
          query: directoryParams.query,
          page: directoryParams.page,
          pageSize: directoryParams.pageSize
        })
  ]);

  const coverageRate = summary.clients ? Math.round((summary.linked / summary.clients) * 100) : 0;

  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Workspace accounts</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Master navigation">
          <ConsoleNavLink href="/master">Monitoring</ConsoleNavLink>
          <ConsoleNavLink className="active" href="/master/accounts">All accounts</ConsoleNavLink>
          <ConsoleNavLink href="/master/workspaces">Workspaces</ConsoleNavLink>
          <ConsoleNavLink href="/master/reports">Reports</ConsoleNavLink>
          <ConsoleNavLink href="/master/audit">Audit log</ConsoleNavLink>
          <ConsoleNavLink href="/master/system">System health</ConsoleNavLink>
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
            <p>Master account directory</p>
            <h1>Workspace-scoped account workflow.</h1>
            <span>Reads from the Phase 11 workspace policy RPC and assignment ledger while keeping existing controls compatible.</span>
          </div>
        </header>

        {(summaryError || directory.errorMessage) && (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">{summaryError || directory.errorMessage}</div>
          </section>
        )}

        {selectedView === 'overview' ? (
          <section className="progressive-dataset-grid access-workflow-grid">
            <ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/accounts?view=managers">
              <p>Manager control</p>
              <h2>Workspace managers</h2>
              <span>{summary.managers} manager(s)</span>
              <strong>Promote, demote, disable, reactivate, and rotate invite codes.</strong>
            </ConsoleNavLink>
            <ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/accounts?view=clients">
              <p>Client control</p>
              <h2>Workspace clients</h2>
              <span>{summary.clients} client(s)</span>
              <strong>Review client account state and manager assignment ledger.</strong>
            </ConsoleNavLink>
            <ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/accounts?view=pending">
              <p>Pending</p>
              <h2>Pending / unassigned</h2>
              <span>{summary.pending} pending</span>
              <strong>Find users who need manager assignment or approval.</strong>
            </ConsoleNavLink>
            <ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/accounts?view=blocked">
              <p>Blocked</p>
              <h2>Disabled / suspended</h2>
              <span>{summary.blocked} blocked</span>
              <strong>Review accounts that cannot use the platform.</strong>
            </ConsoleNavLink>
            <ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/workspaces">
              <p>Workspace</p>
              <h2>Tenant directory</h2>
              <span>{coverageRate}% coverage</span>
              <strong>Open workspace membership and assignment visibility.</strong>
            </ConsoleNavLink>
          </section>
        ) : (
          <section className="master-access-stack">
            <div className="access-workflow-toolbar">
              <ConsoleNavLink className="access-workflow-back" href="/master/accounts">← Account directory</ConsoleNavLink>
              <span>{directory.total} result(s)</span>
            </div>

            <article className="admin-monitor-card native-operation-card">
              <div className="admin-monitor-card-header">
                <div><p>Workspace dataset</p><h2>{viewTitle(selectedView)}</h2></div>
                <span>{directory.total} total</span>
              </div>

              <DirectoryFilter view={selectedView} query={directoryParams.query} />
              <MasterAccountTable accounts={directory.accounts} currentUserId={user.id} emptyText="No accounts match this workspace dataset." />
              <Pager view={selectedView} query={directoryParams.query} page={directory.page} pageSize={directory.pageSize} total={directory.total} />
            </article>
          </section>
        )}
      </section>
    </main>
  );
}
