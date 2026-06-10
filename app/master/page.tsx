import { requireRole } from '../../lib/saas/session';
import type { UserProfile } from '../../lib/supabase/roles';

type ProfileRow = Pick<UserProfile, 'id' | 'email' | 'full_name' | 'role' | 'created_at' | 'updated_at'>;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

export default async function MasterPage() {
  const { user, profile, supabase } = await requireRole('master');

  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at,updated_at')
    .order('created_at', { ascending: false });

  const profiles: ProfileRow[] = Array.isArray(data) ? data : [];
  const masterUsers = profiles.filter((item) => item.role === 'master').length;
  const adminUsers = profiles.filter((item) => item.role === 'admin').length;
  const clientUsers = profiles.filter((item) => item.role === 'client').length;
  const queryError = error?.message || null;

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
          <a className="active" href="/master">Master control</a>
          <a href="/admin">Admin monitor</a>
          <a href="/app">Role router</a>
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
            <span>Master can supervise admin accounts, client users, and platform access hierarchy.</span>
          </div>
        </header>

        <section className="admin-monitor-stats" aria-label="Role statistics">
          <article>
            <p>Masters</p>
            <strong>{masterUsers}</strong>
          </article>
          <article>
            <p>Admins</p>
            <strong>{adminUsers}</strong>
          </article>
          <article>
            <p>Clients</p>
            <strong>{clientUsers}</strong>
          </article>
        </section>

        <section className="admin-monitor-card">
          <div className="admin-monitor-card-header">
            <div>
              <p>Platform profiles</p>
              <h2>Account hierarchy</h2>
            </div>
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
                    <th>Created</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length ? profiles.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.full_name || item.email || 'Unnamed user'}</strong>
                        <small>{item.email || item.id}</small>
                      </td>
                      <td><span className={`admin-role-badge ${item.role}`}>{item.role}</span></td>
                      <td>{formatDate(item.created_at)}</td>
                      <td>{formatDate(item.updated_at)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="admin-monitor-empty">No profile records found yet.</td>
                    </tr>
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
