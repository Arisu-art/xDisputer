import MasterAccountTable from './MasterAccountTable';
import { listManagedAccounts } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

type MasterPanel = 'overview' | 'managers' | 'clients' | 'system';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
    control?: string | string[];
    message?: string | string[];
  }>;
};

function normalizePanel(value: string | string[] | undefined): MasterPanel {
  const panel = Array.isArray(value) ? value[0] : value;
  if (panel === 'admins' || panel === 'managers') return 'managers';
  if (panel === 'clients' || panel === 'system') return panel;
  return 'overview';
}

function stringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function MasterSidebarLink({ panel, activePanel, children }: { panel: MasterPanel; activePanel: MasterPanel; children: string }) {
  return <a className={activePanel === panel ? 'active' : ''} href={`/master?panel=${panel}`}>{children}</a>;
}

export default async function MasterPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const activePanel = normalizePanel(params.panel);
  const controlStatus = stringParam(params.control);
  const controlMessage = stringParam(params.message);
  const { user, profile, supabase } = await requireRole('master');
  const { accounts: profiles, errorMessage: queryError } = await listManagedAccounts(supabase, 'master');

  const masterProfiles = profiles.filter((item) => item.role === 'master');
  const managerProfiles = profiles.filter((item) => item.role === 'manager' || item.role === 'admin');
  const clientProfiles = profiles.filter((item) => item.role === 'client');
  const disabledUsers = profiles.filter((item) => item.account_status === 'disabled').length;
  const unassignedClients = clientProfiles.filter((item) => !item.manager_id).length;

  return (
    <main className="admin-monitor-page native-console">
      <aside className="admin-monitor-sidebar native-console-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div><strong>xDisputer</strong><small>Master console</small></div>
        </div>

        <div className="admin-sidebar-section-title">Owner workflow</div>
        <nav aria-label="Master navigation">
          <MasterSidebarLink panel="overview" activePanel={activePanel}>Dashboard</MasterSidebarLink>
          <MasterSidebarLink panel="managers" activePanel={activePanel}>Manager control</MasterSidebarLink>
          <MasterSidebarLink panel="clients" activePanel={activePanel}>Client control</MasterSidebarLink>
          <MasterSidebarLink panel="system" activePanel={activePanel}>Governance</MasterSidebarLink>
          <a href="/app">Role router</a>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Master account'}</strong>
          <small>Owner account</small>
          <form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form>
        </div>
      </aside>

      <section className="admin-monitor-main native-console-main">
        <header className="admin-monitor-header native-command-hero">
          <div>
            <p>Master administration</p>
            <h1>Control managers and clients.</h1>
            <span>Promote managers, supervise client access, and maintain the account hierarchy without exposing backend records.</span>
          </div>
        </header>

        {controlStatus && (
          <section className={`admin-monitor-card admin-feedback-card ${controlStatus === 'ok' ? 'success' : 'error'}`}>
            <strong>{controlStatus === 'ok' ? 'Action completed' : 'Action failed'}</strong>
            <span>{controlStatus === 'ok' ? 'The console has refreshed with the latest account state.' : controlMessage || 'Unknown error.'}</span>
          </section>
        )}

        {queryError ? (
          <section className="admin-monitor-card"><div className="admin-monitor-empty">Could not load account records: {queryError}</div></section>
        ) : (
          <>
            {activePanel === 'overview' && (
              <>
                <section className="admin-monitor-stats" aria-label="Role statistics">
                  <article><p>Owners</p><strong>{masterProfiles.length}</strong></article>
                  <article><p>Managers</p><strong>{managerProfiles.length}</strong></article>
                  <article><p>Clients</p><strong>{clientProfiles.length}</strong></article>
                  <article><p>Unassigned</p><strong>{unassignedClients}</strong></article>
                </section>

                <section className="admin-power-grid">
                  <article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Command 01</p><h2>Manager control</h2></div></div><div className="admin-power-list"><span>Create or remove manager access from client accounts.</span><span>Managers can supervise only their assigned clients.</span></div><div className="admin-power-links"><a href="/master?panel=managers">Open manager control</a></div></article>
                  <article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Command 02</p><h2>Client access</h2></div></div><div className="admin-power-list"><span>Disable, activate, or clear manager assignment for client accounts.</span><span>{disabledUsers} accounts are currently disabled.</span></div><div className="admin-power-links"><a href="/master?panel=clients">Open client control</a></div></article>
                </section>
              </>
            )}

            {activePanel === 'managers' && (
              <section className="admin-monitor-card native-operation-card">
                <div className="admin-monitor-card-header"><div><p>Master controls</p><h2>Manager accounts</h2></div><span>{managerProfiles.length} managers</span></div>
                <MasterAccountTable accounts={managerProfiles} currentUserId={user.id} emptyText="No manager accounts found yet. Promote a client to manager from the client control panel." />
              </section>
            )}

            {activePanel === 'clients' && (
              <section className="admin-monitor-card native-operation-card">
                <div className="admin-monitor-card-header"><div><p>Client controls</p><h2>Client accounts</h2></div><span>{clientProfiles.length} clients</span></div>
                <MasterAccountTable accounts={clientProfiles} currentUserId={user.id} emptyText="No client accounts found yet." />
              </section>
            )}

            {activePanel === 'system' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Governance</p><h2>Access contract</h2></div></div><div className="admin-power-list"><span>Master supervises account hierarchy.</span><span>Manager supervises assigned clients.</span><span>Client uses the document workspace and may join a manager.</span></div></article>
                <article className="admin-monitor-card native-operation-card"><div className="admin-monitor-card-header"><div><p>Workflow</p><h2>Recommended process</h2></div></div><div className="admin-power-list"><span>1. Promote a trusted account into manager.</span><span>2. Manager shares invite code with client.</span><span>3. Client joins from workspace dock.</span><span>4. Manager monitors client readiness.</span></div></article>
              </section>
            )}
          </>
        )}
      </section>
    </main>
  );
}
