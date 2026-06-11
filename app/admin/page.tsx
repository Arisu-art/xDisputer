import { activateClientAccount, disableClientAccount, pauseClientAccount } from './actions';
import { listManagedAccounts } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function ClientActionButton({ profileId, action, label }: { profileId: string; action: (formData: FormData) => Promise<void>; label: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="profileId" value={profileId} />
      <button type="submit" className="admin-action-button">{label}</button>
    </form>
  );
}

export default async function AdminPage() {
  const { user, profile, supabase } = await requireRole('admin');
  const { accounts: profiles, errorMessage: queryError } = await listManagedAccounts(supabase, 'admin');

  const totalClients = profiles.length;
  const activeClients = profiles.filter((item) => (item.account_status || 'active') === 'active').length;
  const pausedClients = profiles.filter((item) => item.account_status === 'paused').length;
  const disabledClients = profiles.filter((item) => item.account_status === 'disabled').length;

  return (
    <main className="admin-monitor-page">
      <aside className="admin-monitor-sidebar">
        <div className="admin-monitor-brand">
          <span>xD</span>
          <div>
            <strong>xDisputer</strong>
            <small>Admin console</small>
          </div>
        </div>

        <nav aria-label="Admin navigation">
          <a className="active" href="/admin">Client control</a>
          <a href="#clients">Manage clients</a>
          <a href="#health">Health summary</a>
          <a href="#operations">Operations</a>
          <a href="/app">Role router</a>
        </nav>

        <div className="admin-monitor-account">
          <strong>{profile?.email || user.email || 'Admin account'}</strong>
          <small>Administrator</small>
          <form action="/auth/sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <section className="admin-monitor-main">
        <header className="admin-monitor-header">
          <div>
            <p>Administration</p>
            <h1>Client operations.</h1>
            <span>Manage client access, monitor client status, and route operational work from one admin console.</span>
          </div>
        </header>

        <section className="admin-monitor-stats" aria-label="Client statistics">
          <article><p>Total clients</p><strong>{totalClients}</strong></article>
          <article><p>Active</p><strong>{activeClients}</strong></article>
          <article><p>Paused</p><strong>{pausedClients}</strong></article>
          <article><p>Disabled</p><strong>{disabledClients}</strong></article>
        </section>

        <section className="admin-monitor-card" id="clients">
          <div className="admin-monitor-card-header">
            <div><p>Client access</p><h2>Manage client accounts</h2></div>
            <span>{totalClients} clients</span>
          </div>

          {queryError ? (
            <div className="admin-monitor-empty">Could not load client records: {queryError}</div>
          ) : (
            <div className="admin-monitor-table-wrap">
              <table className="admin-monitor-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Status</th>
                    <th>Created</th>
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
                          {(item.account_status === 'paused' || item.account_status === 'disabled') ? (
                            <ClientActionButton profileId={item.id} action={activateClientAccount} label="Activate" />
                          ) : (
                            <ClientActionButton profileId={item.id} action={pauseClientAccount} label="Pause" />
                          )}
                          <ClientActionButton profileId={item.id} action={disableClientAccount} label="Disable" />
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="admin-monitor-empty">No client records found yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-power-grid" id="health">
          <article className="admin-monitor-card">
            <div className="admin-monitor-card-header">
              <div><p>Power feature 01</p><h2>Client health summary</h2></div>
            </div>
            <div className="admin-power-list">
              <span>Active ratio: {totalClients ? Math.round((activeClients / totalClients) * 100) : 0}%</span>
              <span>Needs attention: {pausedClients + disabledClients}</span>
              <span>Latest records are sorted by creation date.</span>
            </div>
          </article>

          <article className="admin-monitor-card" id="operations">
            <div className="admin-monitor-card-header">
              <div><p>Power feature 02</p><h2>Operational shortcuts</h2></div>
            </div>
            <div className="admin-power-links">
              <a href="/app">Open role router</a>
              <a href="/workspace">Preview client workspace guard</a>
              <a href="/api/account">Inspect current account JSON</a>
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
