import {
  directoryQueryString,
  getManagerClientSummary,
  listManagerClientDirectory,
  normalizeDirectoryParams,
  type DirectoryView
} from '../../../lib/saas/account-directory';
import type { ManagedAccount } from '../../../lib/saas/account-management';
import { requireRole } from '../../../lib/saas/session';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function statusText(value: string | null | undefined) {
  if (value === 'pending_manager_assignment') return 'Waiting';
  if (value === 'pending_manager_approval') return 'Pending';
  if (value === 'active') return 'Active';
  if (value === 'suspended') return 'Suspended';
  if (value === 'disabled') return 'Disabled';
  return value || 'Pending';
}

function viewTitle(view: string) {
  if (view === 'pending') return 'Pending approval';
  if (view === 'active') return 'Active clients';
  if (view === 'blocked') return 'Disabled / suspended';
  return 'Client directory';
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

function ClientControls({ account }: { account: ManagedAccount }) {
  return (
    <div className="admin-actions-row compact-actions">
      {account.account_status === 'pending_manager_approval' && (
        <>
          <ControlForm profileId={account.id} intent="approve" label="Approve" primary />
          <ControlForm profileId={account.id} intent="reject" label="Reject" />
        </>
      )}

      {account.account_status === 'active' && (
        <ControlForm profileId={account.id} intent="disable" label="Disable" />
      )}

      {(account.account_status === 'disabled' || account.account_status === 'suspended') && (
        <ControlForm profileId={account.id} intent="activate" label="Reactivate" primary />
      )}
    </div>
  );
}

function DirectoryFilter({ view, query }: { view: string; query: string }) {
  return (
    <form action="/admin/access" method="get" className="directory-filter-form">
      <input type="hidden" name="view" value={view} />
      <label>
        <span>Search</span>
        <input name="q" type="search" placeholder="Client email, name, or status" defaultValue={query} />
      </label>
      <button className="admin-action-button primary" type="submit">Search</button>
      <a className="admin-action-button" href={`/admin/access${directoryQueryString({ view })}`}>Reset</a>
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
        <a className={`admin-action-button ${page <= 1 ? 'disabled' : ''}`} href={`/admin/access${directoryQueryString({ view, q: query, page: previous, pageSize })}`}>Previous</a>
        <a className={`admin-action-button ${page >= totalPages ? 'disabled' : ''}`} href={`/admin/access${directoryQueryString({ view, q: query, page: next, pageSize })}`}>Next</a>
      </div>
    </div>
  );
}

function ClientTable({ accounts }: { accounts: ManagedAccount[] }) {
  return (
    <div className="admin-monitor-table-wrap">
      <table className="admin-monitor-table professional-data-table">
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
          {accounts.length ? accounts.map((item) => (
            <tr key={item.id}>
              <td data-label="Client">
                <strong>{item.full_name || item.email || 'Unnamed client'}</strong>
                <small>{item.email || 'Client account'}</small>
              </td>
              <td data-label="Status">
                <span className={`admin-status-badge ${item.account_status || 'pending'}`}>{statusText(item.account_status)}</span>
              </td>
              <td data-label="Joined">{formatDate(item.created_at)}</td>
              <td data-label="Updated">{formatDate(item.updated_at)}</td>
              <td data-label="Controls"><ClientControls account={item} /></td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="admin-monitor-empty">No clients match this dataset.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminAccessPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const directoryParams = normalizeDirectoryParams(params);
  const selectedView = ['pending', 'active', 'blocked', 'all'].includes(directoryParams.view)
    ? directoryParams.view as DirectoryView
    : 'overview';

  const { user, profile, supabase } = await requireRole('manager');

  const [{ summary, errorMessage: summaryError }, directory] = await Promise.all([
    getManagerClientSummary(supabase),
    selectedView === 'overview'
      ? Promise.resolve({ accounts: [], total: 0, page: 1, pageSize: directoryParams.pageSize, errorMessage: null })
      : listManagerClientDirectory(supabase, {
          view: selectedView,
          query: directoryParams.query,
          page: directoryParams.page,
          pageSize: directoryParams.pageSize
        })
  ]);

  return (
    <main className="admin-monitor-page native-console manager-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Manager console</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Manager navigation">
          <a href="/admin">Monitoring</a>
          <a className="active" href="/admin/access">Access control</a>
          <a href="/admin?panel=intake">Client intake</a>
          <a href="/admin?panel=review">Review queue</a>
          <a href="/admin/reports">Reports</a>
          <a href="/admin/audit">Audit log</a>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Manager account'}</strong>
          <small>Manager account</small>
          <form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero manager-compact-hero">
          <div>
            <p>Access control</p>
            <h1>Client access workflow.</h1>
            <span>Choose one dataset, search server-side, and manage clients without loading every account at once.</span>
          </div>
        </header>

        {(summaryError || directory.errorMessage) && (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">{summaryError || directory.errorMessage}</div>
          </section>
        )}

        {selectedView === 'overview' ? (
          <section className="progressive-dataset-grid access-workflow-grid">
            <a className="progressive-dataset-card access-workflow-card" href="/admin/access?view=pending">
              <p>Access control</p>
              <h2>Pending approval</h2>
              <span>{summary.pending} pending</span>
              <strong>Review users waiting for manager approval.</strong>
            </a>
            <a className="progressive-dataset-card access-workflow-card" href="/admin/access?view=active">
              <p>Access control</p>
              <h2>Active clients</h2>
              <span>{summary.active} active</span>
              <strong>Manage approved clients with workspace access.</strong>
            </a>
            <a className="progressive-dataset-card access-workflow-card" href="/admin/access?view=blocked">
              <p>Access control</p>
              <h2>Disabled / suspended</h2>
              <span>{summary.blocked} blocked</span>
              <strong>Review blocked client accounts.</strong>
            </a>
            <a className="progressive-dataset-card access-workflow-card" href="/admin/audit">
              <p>Audit</p>
              <h2>Access history</h2>
              <span>Events</span>
              <strong>Review approval and account-control history.</strong>
            </a>
          </section>
        ) : (
          <section className="admin-dataset-stack">
            <div className="access-workflow-toolbar">
              <a className="access-workflow-back" href="/admin/access">← Access control</a>
              <span>{directory.total} result(s)</span>
            </div>

            <section className="admin-monitor-card native-operation-card">
              <div className="admin-monitor-card-header">
                <div><p>Access dataset</p><h2>{viewTitle(selectedView)}</h2></div>
                <span>{directory.total} total</span>
              </div>

              <DirectoryFilter view={selectedView} query={directoryParams.query} />
              <ClientTable accounts={directory.accounts} />
              <Pager view={selectedView} query={directoryParams.query} page={directory.page} pageSize={directory.pageSize} total={directory.total} />
            </section>
          </section>
        )}
      </section>
    </main>
  );
}
