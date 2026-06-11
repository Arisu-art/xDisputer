import { activateClientAccount, disableClientAccount, rotateInviteCode } from './actions';
import { ensureManagerInviteCode, listManagedAccounts } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function HiddenProfileId({ profileId }: { profileId: string }) {
  return <input type="hidden" name="profileId" value={profileId} />;
}

export default async function AdminPage() {
  const { user, profile, supabase } = await requireRole('manager');
  const inviteCode = await ensureManagerInviteCode(supabase, user.id);
  const { accounts: profiles, errorMessage: queryError } = await listManagedAccounts(supabase, 'manager', user.id);

  const totalClients = profiles.length;
  const activeClients = profiles.filter((item) => (item.account_status || 'active') === 'active').length;
  const disabledClients = profiles.filter((item) => item.account_status === 'disabled').length;
  const unassignedClients = profiles.filter((item) => !item.manager_id).length;

  return (
    <main className="admin-monitor-page">
      <aside className="admin-monitor-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div>
            <strong>xDisputer</strong>
            <small>Manager console</small>
          </div>
        </div>

        <nav aria-label="Manager navigation">
          <a className="active" href="/admin">Client control</a>
          <a href="#invite">Invite code</a>
          <a href="#clients">My clients</a>
          <a href="#health">Health summary</a>
          <a href="/app">Role router</a>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Manager account'}</strong>
          <small>Manager</small>
          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <section className="admin-monitor-main">
        <header className="admin-monitor-header">
          <div>
            <p>Manager operations</p>
            <h1>Monitor assigned clients.</h1>
            <span>Share your invite code so clients can join your manager account.</span>
          </div>
        </header>

        <section className="admin-monitor-stats" aria-label="Client statistics">
          <article><p>My clients</p><strong>{totalClients}</strong></article>
          <article><p>Active</p><strong>{activeClients}</strong></article>
          <article><p>Disabled</p><strong>{disabledClients}</strong></article>
          <article><p>Unassigned</p><strong>{unassignedClients}</strong></article>
        </section>

        <section className="admin-power-grid" id="invite">
          <article className="admin-monitor-card">
            <div className="admin-monitor-card-header">
              <div><p>Top function 01</p><h2>Invite clients</h2></div>
            </div>
            <div className="admin-power-list">
              <span>Invite code: {inviteCode}</span>
              <span>Clients use this code inside their workspace to join your manager account.</span>
            </div>
            <form action={rotateInviteCode} className="admin-inline-form">
              <button type="submit" className="admin-action-button">Rotate invite code</button>
            </form>
          </article>

          <article className="admin-monitor-card" id="health">
            <div className="admin-monitor-card-header">
              <div><p>Top function 02</p><h2>Client health</h2></div>
            </div>
            <div className="admin-power-list">
              <span>Active clients: {activeClients}</span>
              <span>Disabled clients: {disabledClients}</span>
              <span>Action rule: disabled clients cannot access protected workspace.</span>
            </div>
          </article>
        </section>

        <section className="admin-monitor-card" id="clients">
          <div className="admin-monitor-card-header">
            <div><p>Top function 03</p><h2>My client accounts</h2></div>
            <span>{totalClients} clients</span>
          </div>

          {queryError ? (
            <div className="admin-monitor-empty">Could not load assigned client records: {queryError}</div>
          ) : (
            <div className="admin-monitor-table-wrap">
              <table className="admin-monitor-table">
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
                  {profiles.length ? profiles.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.full_name || item.email || 'Unnamed client'}</strong><small>{item.email || item.id}</small></td>
                      <td><span className={`admin-status-badge ${item.account_status || 'active'}`}>{item.account_status || 'active'}</span></td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td>
                        <div className="admin-actions-row">
                          {item.account_status === 'disabled' ? (
                            <form action={activateClientAccount}>
                              <HiddenProfileId profileId={item.id} />
                              <button type="submit" className="admin-action-button">Activate</button>
                            </form>
                          ) : (
                            <form action={disableClientAccount}>
                              <HiddenProfileId profileId={item.id} />
                              <button type="submit" className="admin-action-button">Disable</button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="admin-monitor-empty">No clients assigned yet. Share your invite code with a client.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
