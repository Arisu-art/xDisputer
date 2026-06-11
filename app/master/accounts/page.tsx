import MasterAccountTable from '../MasterAccountTable';
import { listManagedAccounts, type ManagedAccount } from '../../../lib/saas/account-management';
import { requireRole } from '../../../lib/saas/session';

type PageProps = {
  searchParams?: Promise<{
    filter?: string | string[];
    page?: string | string[];
  }>;
};

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function applyFilter(accounts: ManagedAccount[], filter: string | undefined) {
  if (filter === 'managers') return accounts.filter((item) => item.role === 'manager' || item.role === 'admin');
  if (filter === 'clients') return accounts.filter((item) => item.role === 'client');
  if (filter === 'attention') return accounts.filter((item) => item.account_status === 'disabled' || (item.role === 'client' && !item.manager_id));
  return accounts;
}

export default async function MasterAccountsPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filter = stringParam(params.filter);
  const currentPage = Math.max(1, Number(stringParam(params.page) || '1') || 1);
  const pageSize = 20;
  const { user, profile, supabase } = await requireRole('master');
  const { accounts, errorMessage } = await listManagedAccounts(supabase, 'master');
  const filtered = applyFilter(accounts, filter);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const start = (safePage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  const basePath = `/master/accounts${filter ? `?filter=${filter}&` : '?'}`;

  return (
    <main className="admin-monitor-page native-console full-table-page">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>Master accounts</small></div></div>
        <div className="admin-sidebar-section-title">Account table</div>
        <nav aria-label="Master account table navigation"><a href="/master?panel=monitoring">Monitoring</a><a className="active" href="/master/accounts">All accounts</a><a href="/master/accounts?filter=managers">Managers</a><a href="/master/accounts?filter=clients">Clients</a><a href="/master/accounts?filter=attention">Needs attention</a></nav>
        <div className="admin-monitor-account"><strong>{profile?.email || user.email || 'Master account'}</strong><small>Owner account</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero master-compact-hero"><div><p>Master table</p><h1>Account records.</h1><span>Full table view for large account sets, separated from dashboard snapshots.</span></div></header>
        <section className="admin-monitor-card native-operation-card">
          <div className="full-table-toolbar"><div><p className="eyebrow">Account records</p><h2>{filter === 'attention' ? 'Needs attention' : filter === 'managers' ? 'Managers' : filter === 'clients' ? 'Clients' : 'All accounts'}</h2></div><a href="/master?panel=monitoring">Back to monitoring</a></div>
          {errorMessage ? <div className="admin-monitor-empty">Could not load accounts: {errorMessage}</div> : <MasterAccountTable accounts={visible} currentUserId={user.id} emptyText="No matching accounts." />}
          <div className="table-pagination"><a href={`${basePath}page=${Math.max(1, safePage - 1)}`}>‹ Prev</a><span>Page {safePage} of {pageCount}</span><span>Showing {filtered.length ? start + 1 : 0}-{Math.min(start + pageSize, filtered.length)} of {filtered.length}</span><a href={`${basePath}page=${Math.min(pageCount, safePage + 1)}`}>Next ›</a></div>
        </section>
      </section>
    </main>
  );
}
