import { requireRole } from '../../lib/supabase/roles';

export default async function AdminPage() {
  const { user, profile } = await requireRole('admin');

  return (
    <main className="app-shell">
      <section className="main-area">
        <header className="header">
          <div>
            <p className="eyebrow">Administrator</p>
            <h1>Admin Console</h1>
            <p className="workspace-operation-status success">
              Signed in as {profile?.email || user?.email}. You can manage SaaS operations here.
            </p>
          </div>
        </header>

        <section className="dashboard-grid">
          <article className="dashboard-card">
            <h2>Users</h2>
            <p>Manage client accounts, roles, and workspace access.</p>
          </article>
          <article className="dashboard-card">
            <h2>Cases</h2>
            <p>Review client case activity and document packet progress.</p>
          </article>
          <article className="dashboard-card">
            <h2>System</h2>
            <p>Monitor Supabase, Vercel deployment, and framework health.</p>
          </article>
        </section>
      </section>
    </main>
  );
}
