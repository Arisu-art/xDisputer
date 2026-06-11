import MasterAccountTable from './MasterAccountTable';
import { listManagedAccounts } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

type MasterPanel = 'overview' | 'managers' | 'clients' | 'system';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
  }>;
};

function normalizePanel(value: string | string[] | undefined): MasterPanel {
  const panel = Array.isArray(value) ? value[0] : value;
  if (panel === 'admins' || panel === 'managers') return 'managers';
  if (panel === 'clients' || panel === 'system') return panel;
  return 'overview';
}

function MasterSidebarLink({ panel, activePanel, children }: { panel: MasterPanel; activePanel: MasterPanel; children: string }) {
  return <a className={activePanel === panel ? 'active' : ''} href={`/master?panel=${panel}`}>{children}</a>;
}

export default async function MasterPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const activePanel = normalizePanel(params.panel);
  const { user, profile, supabase } = await requireRole('master');
  const { accounts: profiles, errorMessage: queryError } = await listManagedAccounts(supabase, 'master');

  const masterProfiles = profiles.filter((item) => item.role === 'master');
  const managerProfiles = profiles.filter((item) => item.role === 'manager' || item.role === 'admin');
  const clientProfiles = profiles.filter((item) => item.role === 'client');
  const disabledUsers = profiles.filter((item) => item.account_status === 'disabled').length;

  return (
    <main className="admin-monitor-page">
      <aside className="admin-monitor-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div>
            <strong>xDisputer</strong>
            <small>Master console</small>
          </div>
        </div>

        <nav aria-label="Master navigation">
          <MasterSidebarLink panel="overview" activePanel={activePanel}>Overview</MasterSidebarLink>
          <MasterSidebarLink panel="managers" activePanel={activePanel}>Manage managers</MasterSidebarLink>
          <MasterSidebarLink panel="clients" activePanel={activePanel}>Manage clients</MasterSidebarLink>
          <MasterSidebarLink panel="system" activePanel={activePanel}>System checks</MasterSidebarLink>
          <a href="/app">Role router</a>
          <a href="/api/account">Account JSON</a>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Master account'}</strong>
          <small>Master owner</small>
          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <section className="admin-monitor-main">
        <header className="admin-monitor-header">
          <div>
            <p>Master administration</p>
            <h1>Control managers and clients.</h1>
            <span>Create manager access, disable accounts, and clear client-manager relationships from one owner console.</span>
          </div>
        </header>

        {queryError ? (
          <section className="admin-monitor-card">
            <div className="admin-monitor-empty">Could not load profile records: {queryError}</div>
          </section>
        ) : (
          <>
            {activePanel === 'overview' && (
              <>
                <section className="admin-monitor-stats" aria-label="Role statistics">
                  <article><p>Masters</p><strong>{masterProfiles.length}</strong></article>
                  <article><p>Managers</p><strong>{managerProfiles.length}</strong></article>
                  <article><p>Clients</p><strong>{clientProfiles.length}</strong></article>
                  <article><p>Disabled</p><strong>{disabledUsers}</strong></article>
                </section>

                <section className="admin-power-grid">
                  <article className="admin-monitor-card">
                    <div className="admin-monitor-card-header"><div><p>Function 01</p><h2>Manager control</h2></div></div>
                    <div className="admin-power-links"><a href="/master?panel=managers">Open manager management</a></div>
                  </article>
                  <article className="admin-monitor-card">
                    <div className="admin-monitor-card-header"><div><p>Function 02</p><h2>Client control</h2></div></div>
                    <div className="admin-power-links"><a href="/master?panel=clients">Open client management</a></div>
                  </article>
                </section>
              </>
            )}

            {activePanel === 'managers' && (
              <section className="admin-monitor-card">
                <div className="admin-monitor-card-header">
                  <div><p>Master controls</p><h2>Manage manager accounts</h2></div>
                  <span>{managerProfiles.length} managers</span>
                </div>
                <MasterAccountTable accounts={managerProfiles} currentUserId={user.id} emptyText="No manager accounts found yet. Promote a client to manager from the client panel." />
              </section>
            )}

            {activePanel === 'clients' && (
              <section className="admin-monitor-card">
                <div className="admin-monitor-card-header">
                  <div><p>Client controls</p><h2>Manage client accounts</h2></div>
                  <span>{clientProfiles.length} clients</span>
                </div>
                <MasterAccountTable accounts={clientProfiles} currentUserId={user.id} emptyText="No client accounts found yet." />
              </section>
            )}

            {activePanel === 'system' && (
              <section className="admin-power-grid">
                <article className="admin-monitor-card">
                  <div className="admin-monitor-card-header"><div><p>System check</p><h2>Access contract</h2></div></div>
                  <div className="admin-power-list">
                    <span>Master route: /master</span>
                    <span>Manager route: /admin</span>
                    <span>Client route: /workspace</span>
                    <span>Manager relationship source: public.profiles.manager_id</span>
                    <span>Invite code source: public.profiles.manager_invite_code</span>
                  </div>
                </article>
                <article className="admin-monitor-card">
                  <div className="admin-monitor-card-header"><div><p>Verification</p><h2>Debug links</h2></div></div>
                  <div className="admin-power-links">
                    <a href="/app">Open role router</a>
                    <a href="/api/account">Inspect current account JSON</a>
                    <a href="/admin">Test manager route guard</a>
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
