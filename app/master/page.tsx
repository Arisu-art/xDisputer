import MasterAccountTable from './MasterAccountTable';
import { listManagedAccounts } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

type MasterPanel = 'overview' | 'admins' | 'clients' | 'system';

type PageProps = {
  searchParams?: Promise<{
    panel?: string | string[];
  }>;
};

function normalizePanel(value: string | string[] | undefined): MasterPanel {
  const panel = Array.isArray(value) ? value[0] : value;
  if (panel === 'admins' || panel === 'clients' || panel === 'system') return panel;
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
  const adminProfiles = profiles.filter((item) => item.role === 'admin');
  const clientProfiles = profiles.filter((item) => item.role === 'client');
  const pausedUsers = profiles.filter((item) => item.account_status === 'paused' || item.account_status === 'disabled').length;

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
          <MasterSidebarLink panel="admins" activePanel={activePanel}>Manage admins</MasterSidebarLink>
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
            <h1>Control accounts and roles.</h1>
            <span>Promote, demote, pause, activate, or disable accounts from one owner console.</span>
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
                  <article><p>Admins</p><strong>{adminProfiles.length}</strong></article>
                  <article><p>Clients</p><strong>{clientProfiles.length}</strong></article>
                  <article><p>Paused/Disabled</p><strong>{pausedUsers}</strong></article>
                </section>

                <section className="admin-power-grid">
                  <article className="admin-monitor-card">
                    <div className="admin-monitor-card-header"><div><p>Function 01</p><h2>Admin control</h2></div></div>
                    <div className="admin-power-links"><a href="/master?panel=admins">Open admin management</a></div>
                  </article>
                  <article className="admin-monitor-card">
                    <div className="admin-monitor-card-header"><div><p>Function 02</p><h2>Client control</h2></div></div>
                    <div className="admin-power-links"><a href="/master?panel=clients">Open client management</a></div>
                  </article>
                </section>
              </>
            )}

            {activePanel === 'admins' && (
              <section className="admin-monitor-card">
                <div className="admin-monitor-card-header">
                  <div><p>Master controls</p><h2>Manage admin accounts</h2></div>
                  <span>{adminProfiles.length} admins</span>
                </div>
                <MasterAccountTable accounts={adminProfiles} currentUserId={user.id} emptyText="No admin accounts found yet. Promote a client to admin from the client panel." />
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
                    <span>Admin route: /admin</span>
                    <span>Client route: /workspace</span>
                    <span>Account state source: public.profiles.account_status</span>
                  </div>
                </article>
                <article className="admin-monitor-card">
                  <div className="admin-monitor-card-header"><div><p>Verification</p><h2>Debug links</h2></div></div>
                  <div className="admin-power-links">
                    <a href="/app">Open role router</a>
                    <a href="/api/account">Inspect current account JSON</a>
                    <a href="/admin">Test admin route guard</a>
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
