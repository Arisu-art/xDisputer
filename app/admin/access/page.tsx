import ConsoleNavLink from '../../../components/ConsoleNavLink';
import {
  directoryQueryString,
  getManagerClientSummary,
  listManagerClientDirectory,
  normalizeDirectoryParams,
  type DirectoryView
} from '../../../lib/saas/account-directory';
import type { ManagedAccount } from '../../../lib/saas/account-management';
import { listEntitlementLimits, type EntitlementLimitMap, type EntitlementLimitRow } from '../../../lib/saas/entitlement-limits';
import { requireRole } from '../../../lib/saas/session';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

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
  return 'Workspace client directory';
}

function formatLimit(value: number | null | undefined) {
  return typeof value === 'number' ? String(value) : 'Default';
}

function usageLabel(entitlement?: EntitlementLimitRow) {
  return `${entitlement?.output_used_this_month || 0}/${formatLimit(entitlement?.effective_output_limit)} outputs`;
}

function ControlForm({ profileId, intent, label, primary = false }: { profileId: string; intent: string; label: string; primary?: boolean }) {
  return <form action="/api/control/profile" method="post"><input type="hidden" name="profileId" value={profileId} /><input type="hidden" name="intent" value={intent} /><button type="submit" className={`admin-action-button ${primary ? 'primary' : ''}`}>{label}</button></form>;
}

function ClientControls({ account }: { account: ManagedAccount }) {
  return <div className="admin-actions-row flyout-actions">
    {account.account_status === 'pending_manager_approval' && <><ControlForm profileId={account.id} intent="approve" label="Approve" primary /><ControlForm profileId={account.id} intent="reject" label="Reject" /></>}
    {account.account_status === 'active' && <ControlForm profileId={account.id} intent="disable" label="Disable" />}
    {(account.account_status === 'disabled' || account.account_status === 'suspended') && <ControlForm profileId={account.id} intent="activate" label="Reactivate" primary />}
  </div>;
}

function ClientFlyout({ account, entitlement }: { account: ManagedAccount; entitlement?: EntitlementLimitRow }) {
  return <details className="table-flyout manager-client-flyout">
    <summary><span>{usageLabel(entitlement)}</span><small>Details</small></summary>
    <div className="table-flyout-card">
      <header><div><p>Client account</p><h3>{account.full_name || account.email || 'Client'}</h3></div></header>
      <section><strong>Output usage</strong><div className="manager-limit-usage"><strong>{usageLabel(entitlement)}</strong><small>Master-set entitlement</small></div></section>
      <section><strong>Account actions</strong><ClientControls account={account} /></section>
    </div>
  </details>;
}

function DirectoryFilter({ view, query }: { view: string; query: string }) {
  return <form action="/admin/access" method="get" className="directory-filter-form"><input type="hidden" name="view" value={view} /><label><span>Search</span><input name="q" type="search" placeholder="Client email, name, status, or manager" defaultValue={query} /></label><button className="admin-action-button primary" type="submit">Search</button><ConsoleNavLink className="admin-action-button" href={`/admin/access${directoryQueryString({ view })}`}>Reset</ConsoleNavLink></form>;
}

function Pager({ view, query, page, pageSize, total }: { view: string; query: string; page: number; pageSize: number; total: number }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const previous = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  return <div className="directory-pager"><span>Page {page} of {totalPages} • {total} result(s)</span><div><ConsoleNavLink className={`admin-action-button ${page <= 1 ? 'disabled' : ''}`} href={`/admin/access${directoryQueryString({ view, q: query, page: previous, pageSize })}`}>Previous</ConsoleNavLink><ConsoleNavLink className={`admin-action-button ${page >= totalPages ? 'disabled' : ''}`} href={`/admin/access${directoryQueryString({ view, q: query, page: next, pageSize })}`}>Next</ConsoleNavLink></div></div>;
}

function ClientTable({ accounts, entitlements }: { accounts: ManagedAccount[]; entitlements: EntitlementLimitMap }) {
  return <div className="admin-monitor-table-wrap"><table className="admin-monitor-table professional-data-table entitlement-table flyout-data-table"><thead><tr><th>Client</th><th>Status</th><th>Usage</th><th>Joined</th><th>Updated</th></tr></thead><tbody>{accounts.length ? accounts.map((item) => <tr key={item.id}><td data-label="Client"><strong>{item.full_name || item.email || 'Unnamed client'}</strong><small>{item.email || 'Client account'}</small></td><td data-label="Status"><span className={`admin-status-badge ${item.account_status || 'pending'}`}>{statusText(item.account_status)}</span></td><td data-label="Usage"><ClientFlyout account={item} entitlement={entitlements[item.id]} /></td><td data-label="Joined">{formatDate(item.created_at)}</td><td data-label="Updated">{formatDate(item.updated_at)}</td></tr>) : <tr><td colSpan={5} className="admin-monitor-empty">No workspace clients match this dataset.</td></tr>}</tbody></table></div>;
}

export default async function AdminAccessPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const directoryParams = normalizeDirectoryParams(params);
  const selectedView = ['pending', 'active', 'blocked', 'all'].includes(directoryParams.view) ? directoryParams.view as DirectoryView : 'overview';
  const { user, profile, supabase } = await requireRole('manager');

  const [{ summary, errorMessage: summaryError }, directory] = await Promise.all([
    getManagerClientSummary(supabase),
    selectedView === 'overview' ? Promise.resolve({ accounts: [], total: 0, page: 1, pageSize: directoryParams.pageSize, errorMessage: null }) : listManagerClientDirectory(supabase, { view: selectedView, query: directoryParams.query, page: directoryParams.page, pageSize: directoryParams.pageSize })
  ]);

  const entitlementResult = selectedView === 'overview' ? await listEntitlementLimits(supabase, [user.id]) : await listEntitlementLimits(supabase, [user.id, ...directory.accounts.map((account) => account.id)]);
  const managerEntitlement = entitlementResult.entitlements[user.id];

  return <main className="admin-monitor-page native-console manager-ops-console"><aside className="admin-monitor-sidebar native-console-sidebar"><div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>Manager console</small></div></div><div className="admin-sidebar-section-title">Operations</div><nav aria-label="Manager navigation"><ConsoleNavLink href="/admin">Monitoring</ConsoleNavLink><ConsoleNavLink className="active" href="/admin/access">Access control</ConsoleNavLink><ConsoleNavLink href="/admin?panel=intake">Client intake</ConsoleNavLink><ConsoleNavLink href="/admin?panel=review">Review queue</ConsoleNavLink><ConsoleNavLink href="/admin/reports">Reports</ConsoleNavLink><ConsoleNavLink href="/admin/audit">Audit log</ConsoleNavLink></nav><div className="admin-monitor-account"><strong>{profile?.email || user.email || 'Manager account'}</strong><small>Manager account</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div></aside><section className="admin-monitor-main native-console-main"><header className="admin-monitor-header native-command-hero manager-compact-hero"><div><p>Access control</p><h1>Workspace-scoped client workflow.</h1><span>Client limits are controlled by the master account. Managers can see capacity and output usage but cannot edit agreement limits.</span></div></header>{(summaryError || directory.errorMessage || entitlementResult.errorMessage) && <section className="admin-monitor-card"><div className="admin-monitor-empty">{summaryError || directory.errorMessage || entitlementResult.errorMessage}</div></section>}<section className="minimal-report-summary manager-entitlement-summary" aria-label="Manager entitlement summary"><article><span>Client seats</span><strong>{managerEntitlement?.current_clients || summary.active}/{formatLimit(managerEntitlement?.max_clients)}</strong><small>Master agreement</small></article><article><span>Default outputs</span><strong>{formatLimit(managerEntitlement?.default_client_output_limit)}</strong><small>Per client monthly</small></article><article><span>Active clients</span><strong>{summary.active}</strong><small>Approved accounts</small></article><article><span>Pending</span><strong>{summary.pending}</strong><small>Waiting approval</small></article></section>{selectedView === 'overview' ? <section className="progressive-dataset-grid access-workflow-grid"><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/admin/access?view=pending"><p>Access control</p><h2>Pending approval</h2><span>{summary.pending} pending</span><strong>Review users waiting for manager approval.</strong></ConsoleNavLink><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/admin/access?view=active"><p>Client usage</p><h2>Active clients</h2><span>{summary.active} active</span><strong>Review output usage under the master-set limit.</strong></ConsoleNavLink><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/admin/access?view=blocked"><p>Access control</p><h2>Disabled / suspended</h2><span>{summary.blocked} blocked</span><strong>Review blocked client accounts.</strong></ConsoleNavLink><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/admin/audit"><p>Audit</p><h2>Access history</h2><span>Events</span><strong>Review approval and account-control history.</strong></ConsoleNavLink></section> : <section className="admin-dataset-stack"><div className="access-workflow-toolbar"><ConsoleNavLink className="access-workflow-back" href="/admin/access">← Access control</ConsoleNavLink><span>{directory.total} result(s)</span></div><section className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Workspace dataset</p><h2>{viewTitle(selectedView)}</h2></div><span>{directory.total} total</span></div><DirectoryFilter view={selectedView} query={directoryParams.query} /><ClientTable accounts={directory.accounts} entitlements={entitlementResult.entitlements} /><Pager view={selectedView} query={directoryParams.query} page={directory.page} pageSize={directory.pageSize} total={directory.total} /></section></section>}</section></main>;
}
