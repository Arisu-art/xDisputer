import ConsoleNavLink from '../../../components/ConsoleNavLink';
import ConsoleShell from '../../../components/console/ConsoleShell';
import {
  directoryQueryString,
  getMasterAccountSummary,
  listMasterAccountDirectory,
  normalizeDirectoryParams,
  type DirectoryView
} from '../../../lib/saas/account-directory';
import { listEntitlementLimits } from '../../../lib/saas/entitlement-limits';
import MasterAccountTable from '../MasterAccountTableV2';
import { requireRole } from '../../../lib/saas/session';

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function viewTitle(view: string) {
  if (view === 'managers') return 'Workspace manager accounts';
  if (view === 'clients') return 'Workspace client accounts';
  if (view === 'pending') return 'Pending / unassigned workspace clients';
  if (view === 'blocked') return 'Disabled / suspended workspace accounts';
  return 'Workspace account directory';
}

function viewDescription(view: string) {
  if (view === 'managers') return 'Set manager client-seat limits and default daily output limits from one minimal control surface.';
  if (view === 'clients') return 'Set per-client daily output caps and review client usage without duplicated account headers.';
  if (view === 'pending') return 'Find users who need manager assignment or approval and keep access control focused.';
  if (view === 'blocked') return 'Review accounts that cannot use the platform and take only the needed account action.';
  return 'Edit manager client-seat limits and daily client output limits from the master account. Enforcement happens in Supabase and the generation API.';
}

function DirectoryFilter({ view, query }: { view: string; query: string }) {
  return <form action="/master/accounts" method="get" className="directory-filter-form" data-layout-zone="dataset-toolbar"><input type="hidden" name="view" value={view} /><label><span>Search</span><input name="q" type="search" placeholder="Email, name, role, status, manager, or invite code" defaultValue={query} /></label><button className="admin-action-button primary" type="submit">Search</button><ConsoleNavLink className="admin-action-button" href={`/master/accounts${directoryQueryString({ view })}`}>Reset</ConsoleNavLink></form>;
}

function Pager({ view, query, page, pageSize, total }: { view: string; query: string; page: number; pageSize: number; total: number }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const previous = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  return <div className="directory-pager" data-layout-zone="dataset-pagination"><span>Page {page} of {totalPages}</span><div><ConsoleNavLink className={`admin-action-button ${page <= 1 ? 'disabled' : ''}`} href={`/master/accounts${directoryQueryString({ view, q: query, page: previous, pageSize })}`}>Previous</ConsoleNavLink><ConsoleNavLink className={`admin-action-button ${page >= totalPages ? 'disabled' : ''}`} href={`/master/accounts${directoryQueryString({ view, q: query, page: next, pageSize })}`}>Next</ConsoleNavLink></div></div>;
}

const masterAccountNavItems = [
  { href: '/master', label: 'Monitoring' },
  { href: '/master/accounts', label: 'All accounts', active: true },
  { href: '/master/workspaces', label: 'Workspaces' },
  { href: '/master/reports', label: 'Reports' },
  { href: '/master/audit', label: 'Audit log' },
  { href: '/master/system', label: 'System health' }
];

export default async function MasterAccountsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const directoryParams = normalizeDirectoryParams(params);
  const selectedView = ['managers', 'clients', 'pending', 'blocked', 'all'].includes(directoryParams.view) ? directoryParams.view as DirectoryView : 'overview';
  const { user, profile, supabase } = await requireRole('master');

  const [{ summary, errorMessage: summaryError }, directory] = await Promise.all([
    getMasterAccountSummary(supabase),
    selectedView === 'overview' ? Promise.resolve({ accounts: [], total: 0, page: 1, pageSize: directoryParams.pageSize, errorMessage: null }) : listMasterAccountDirectory(supabase, { view: selectedView, query: directoryParams.query, page: directoryParams.page, pageSize: directoryParams.pageSize })
  ]);

  const entitlementResult = selectedView === 'overview' ? { entitlements: {}, errorMessage: null } : await listEntitlementLimits(supabase, directory.accounts.map((account) => account.id));
  const coverageRate = summary.clients ? Math.round((summary.linked / summary.clients) * 100) : 0;
  const headerTitle = selectedView === 'overview' ? 'Workspace-scoped account workflow.' : `${viewTitle(selectedView)}.`;
  const headerDescription = viewDescription(selectedView);
  const email = profile?.email || user.email || 'Master account';

  return <ConsoleShell role="master" mode="operations" email={email} accountLabel="Master account" brandSubtitle="Workspace accounts" sidebarSectionTitle="Operations" navItems={masterAccountNavItems} switchTarget="/admin" switchTargetLabel="Manager console" navAriaLabel="Master navigation" activeNavUsesConsoleLink>
    <header className="admin-monitor-header native-command-hero master-compact-hero directory-hero-with-action" data-layout-contract="command-header"><div data-layout-zone="copy"><p>Master account directory</p><h1>{headerTitle}</h1><span>{headerDescription}</span></div>{selectedView !== 'overview' && <ConsoleNavLink className="directory-header-action" href="/master/accounts">Account directory</ConsoleNavLink>}</header>
    {(summaryError || directory.errorMessage || entitlementResult.errorMessage) && <section className="admin-monitor-card"><div className="admin-monitor-empty">{summaryError || directory.errorMessage || entitlementResult.errorMessage}</div></section>}
    {selectedView === 'overview' ? <section className="progressive-dataset-grid access-workflow-grid"><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/accounts?view=managers"><p>Manager limits</p><h2>Workspace managers</h2><span>{summary.managers} manager(s)</span><strong>Set client-seat limits and default daily output limits.</strong></ConsoleNavLink><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/accounts?view=clients"><p>Client limits</p><h2>Workspace clients</h2><span>{summary.clients} client(s)</span><strong>Set per-client daily output caps and review usage.</strong></ConsoleNavLink><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/accounts?view=pending"><p>Pending</p><h2>Pending / unassigned</h2><span>{summary.pending} pending</span><strong>Find users who need manager assignment or approval.</strong></ConsoleNavLink><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/accounts?view=blocked"><p>Blocked</p><h2>Disabled / suspended</h2><span>{summary.blocked} blocked</span><strong>Review accounts that cannot use the platform.</strong></ConsoleNavLink><ConsoleNavLink className="progressive-dataset-card access-workflow-card" href="/master/workspaces"><p>Workspace</p><h2>Tenant directory</h2><span>{coverageRate}% coverage</span><strong>Open workspace membership and assignment visibility.</strong></ConsoleNavLink></section> : <section className="master-access-stack single-header-dataset"><article className="admin-monitor-card native-operation-card" data-layout-contract="dataset-card"><DirectoryFilter view={selectedView} query={directoryParams.query} /><MasterAccountTable accounts={directory.accounts} currentUserId={user.id} emptyText="No accounts match this workspace dataset." entitlements={entitlementResult.entitlements} /><Pager view={selectedView} query={directoryParams.query} page={directory.page} pageSize={directory.pageSize} total={directory.total} /></article></section>}
  </ConsoleShell>;
}
