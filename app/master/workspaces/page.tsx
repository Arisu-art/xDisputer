import ConsoleNavLink from '../../../components/ConsoleNavLink';
import { requireRole } from '../../../lib/saas/session';
import {
  listWorkspaceAccountDirectory,
  normalizeWorkspaceDirectoryParams,
  workspaceDirectoryQueryString
} from '../../../lib/saas/workspace-access';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function statusClass(value: string | null | undefined) {
  if (value === 'disabled' || value === 'suspended' || value === 'blocked') return 'disabled';
  if (value === 'pending') return 'pending_manager_approval';
  return 'active';
}

function viewLabel(view: string) {
  if (view === 'masters') return 'Workspace masters';
  if (view === 'managers') return 'Workspace managers';
  if (view === 'clients') return 'Workspace clients';
  if (view === 'pending') return 'Pending members';
  if (view === 'blocked') return 'Blocked members';
  return 'All workspace members';
}

export default async function MasterWorkspacesPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = normalizeWorkspaceDirectoryParams(params);
  const { user, profile, supabase } = await requireRole('master');
  const { rows, totalCount, page, pageCount, errorMessage } = await listWorkspaceAccountDirectory(supabase, filters);

  const base = '/master/workspaces';
  const previousHref = page > 1
    ? `${base}${workspaceDirectoryQueryString({ ...filters, page: page - 1 })}`
    : null;
  const nextHref = page < pageCount
    ? `${base}${workspaceDirectoryQueryString({ ...filters, page: page + 1 })}`
    : null;

  return (
    <main className="admin-monitor-page native-console master-ops-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Workspace access</small></div>
        </div>

        <div className="admin-sidebar-section-title">Operations</div>
        <nav aria-label="Master workspace navigation">
          <ConsoleNavLink href="/master">Monitoring</ConsoleNavLink>
          <ConsoleNavLink href="/master/accounts">All accounts</ConsoleNavLink>
          <ConsoleNavLink className="active" href="/master/workspaces">Workspaces</ConsoleNavLink>
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
            <p>Workspace access</p>
            <h1>Tenant-scoped account control.</h1>
            <span>Inspect account visibility through the Phase 11 workspace membership and assignment framework.</span>
          </div>
        </header>

        <section className="admin-monitor-card native-operation-card report-filter-card">
          <div className="admin-monitor-card-header">
            <div><p>Workspace filter</p><h2>{viewLabel(filters.view)}</h2></div>
            <span>{totalCount} member(s)</span>
          </div>

          <form action="/master/workspaces" method="get" className="directory-filter-form">
            <label>
              <span>View</span>
              <select name="view" defaultValue={filters.view}>
                <option value="all">All</option>
                <option value="masters">Masters</option>
                <option value="managers">Managers</option>
                <option value="clients">Clients</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
              </select>
            </label>

            <label>
              <span>Search</span>
              <input name="query" type="search" placeholder="Email, name, id, manager" defaultValue={filters.query} />
            </label>

            <div className="report-filter-actions">
              <button type="submit" className="admin-action-button primary">Apply</button>
              <ConsoleNavLink className="admin-action-button" href="/master/workspaces">Reset</ConsoleNavLink>
            </div>
          </form>
        </section>

        {errorMessage ? (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">Could not load workspace directory: {errorMessage}</div>
          </section>
        ) : (
          <section className="admin-monitor-card native-operation-card">
            <div className="admin-monitor-card-header">
              <div><p>Workspace members</p><h2>{viewLabel(filters.view)}</h2></div>
              <span>Page {page} of {pageCount}</span>
            </div>

            <div className="admin-monitor-table-wrap">
              <table className="admin-monitor-table professional-data-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Workspace role</th>
                    <th>Membership</th>
                    <th>Primary manager</th>
                    <th>Assignment</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((row) => (
                    <tr key={row.profile_id}>
                      <td data-label="Account">
                        <strong>{row.email || row.full_name || 'Unknown account'}</strong>
                        <small>{row.profile_id}</small>
                      </td>
                      <td data-label="Workspace role">
                        <span className={`admin-role-badge ${row.workspace_role}`}>{row.workspace_role}</span>
                        <small>{row.member_scope}</small>
                      </td>
                      <td data-label="Membership">
                        <span className={`admin-status-badge ${statusClass(row.membership_status)}`}>{row.membership_status}</span>
                        <small>{row.account_status || '—'}</small>
                      </td>
                      <td data-label="Primary manager">{row.primary_manager_email || row.primary_manager_id || '—'}</td>
                      <td data-label="Assignment">{row.assignment_status || '—'}</td>
                      <td data-label="Created">{formatDate(row.created_at)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="admin-monitor-empty">No workspace members match the current filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="directory-pager">
              {previousHref ? <ConsoleNavLink className="admin-action-button" href={previousHref}>Previous</ConsoleNavLink> : <span />}
              <span>Showing {rows.length} of {totalCount}</span>
              {nextHref ? <ConsoleNavLink className="admin-action-button" href={nextHref}>Next</ConsoleNavLink> : <span />}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
