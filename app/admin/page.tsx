import { requireRole } from '../../lib/supabase/roles';

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default async function AdminPage() {
  const { user, profile, supabase } = await requireRole('admin');

  const { data: profiles = [] } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at,updated_at')
    .order('created_at', { ascending: false });

  const totalUsers = profiles.length;
  const adminUsers = profiles.filter((item) => item.role === 'admin').length;
  const clientUsers = profiles.filter((item) => item.role === 'client').length;

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
          <a className="active" href="/admin">Users</a>
          <a href="/client/workspace">Workspace</a>
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
            <h1>User monitoring</h1>
            <span>Monitor registered profiles, roles, and recent account activity.</span>
          </div>
        </header>

        <section className="admin-monitor-stats" aria-label="User statistics">
          <article>
            <p>Total users</p>
            <strong>{totalUsers}</strong>
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
              <p>Supabase profiles</p>
              <h2>Users</h2>
            </div>
            <span>{totalUsers} records</span>
          </div>

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
        </section>
      </section>
    </main>
  );
}
