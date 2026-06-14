import { redirect } from 'next/navigation';
import ManagerWorkspaceSwitch from '../../components/ManagerWorkspaceSwitch';
import ManagerTemplateWorkspaceClient from '../../components/ManagerTemplateWorkspaceClient';
import { requireAuth } from '../../lib/saas/session';

export default async function ManagerWorkspacePage() {
  const session = await requireAuth();
  if (!session.isManager && !session.isMaster) redirect(session.dashboardPath);

  return <main className="admin-monitor-page native-console manager-template-workspace">
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>Manager workspace</small></div></div>
      <div className="admin-sidebar-section-title">Workspace</div>
      <nav aria-label="Manager workspace navigation">
        <a className="active" href="/manager-workspace">Template library</a>
        <a href="/admin/access">Assigned clients</a>
        <a href="/admin">Operations console</a>
        <a href="/workspace">Client workspace view</a>
      </nav>
      <ManagerWorkspaceSwitch target="/admin" reverse />
      <div className="admin-monitor-account"><strong>{session.profile?.email || session.user.email || 'Manager account'}</strong><small>Manager template authority</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
    </aside>
    <section className="admin-monitor-main native-console-main">
      <ManagerTemplateWorkspaceClient />
    </section>
  </main>;
}
