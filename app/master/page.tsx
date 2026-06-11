import { activateAccount, demoteToClient, disableAccount, pauseAccount, promoteToAdmin } from './actions';
import { listManagedAccounts } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function AccountActionButton({ profileId, action, label }: { profileId: string; action: (formData: FormData) => Promise<void>; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="profileId" value={profileId} />
      <button type="submit" className="admin-action-button">{label}</button>
    </form>
  );
}

export default async function MasterPage() {
  const { user, profile, supabase } = await requireRole('master');
  const { accounts: profiles, errorMessage: queryError } = await listManagedAccounts(supabase, 'master');

  const masterUsers = profiles.filter((item) => item.role === 'master').length;
  const adminUsers = profiles.filter((item) => item.role === 'admin').length;
  const clientUsers = profiles.filter((item) => item.role === 'client').length;
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
          <a className="active" href="/master">Account control</a>
          <a href="#admins">Manage admins</a>
          <a href="#clients">Monitor clients</a>
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

        <section className="admin-monitor-stats" aria-label="Role statistics">
          <article><p>Masters</p><strong>{masterUsers}</strong></article>
          <article><p>Admins</p><strong>{adminUsers}</strong></article>
          <article><p>Clients</p><strong>{clientUsers}</strong></article>
          <article><p>Paused/Disabled</p><strong>{pausedUsers}</strong></article>
        </section>

        <section className="admin-monitor-card" id="admins">
          <div className="admin-monitor-card-header">
            <div><p>Master controls</p><h2>Account hierarchy</h2></div>
            <span>{profiles.length} records</span>
          </div>

          {queryError ? (
            <div className="admin-monitor-empty">Could not load profile records: {queryError}</div>
          ) : (
            <div className="admin-monitor-table-wrap">
              <table className="admin-monitor-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length ? profiles.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.full_name || item.email || 'Unnamed user'}</strong><small>{item.email || item.id}</small></td>
                      <td><span className={`admin-role-badge ${item.role}`}>{item.role}</span></td>
                      <td><span className={`admin-status-badge ${item.account_status || 'active'}`}>{item.account_status || 'active'}</span></td>
                      <td>{formatDate(item.updated_at)}</td>
                      <td>
                        <div className="admin-actions-row">
                          {item.role === 'client' && <AccountActionButton profileId={item.id} action={promoteToAdmin} label="Make admin" />}
                          {item.role === 'admin' && <AccountActionButton profileId={item.id} action={demoteToClient} label="Demote" />}
                          {(item.account_status === 'paused' || item.account_status === 'disabled') ? (
                            <AccountActionButton profileId={item.id} action={activateAccount} label="Activate" />
                          ) : (
                            <AccountActionButton profileId={item.id} action={pauseAccount} label="Pause" />
                          )}
                          {item.id !== user.id && item.role !== 'master' && <AccountActionButton profileId={item.id} action={disableAccount} label="Disable" />}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="admin-monitor-empty">No profile records found yet.</td></tr>
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
