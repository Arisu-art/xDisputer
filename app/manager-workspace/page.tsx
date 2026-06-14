import { redirect } from 'next/navigation';
import ManagerConsoleShell from '../../components/ManagerConsoleShell';
import ManagerTemplateWorkspaceClient from '../../components/ManagerTemplateWorkspaceClient';
import { requireAuth } from '../../lib/saas/session';

export default async function ManagerWorkspacePage() {
  const session = await requireAuth();
  if (!session.isManager && !session.isMaster) redirect(session.dashboardPath);

  return <ManagerConsoleShell
    mode="workspace"
    email={session.user.email}
    accountLabel="Manager template authority"
    navItems={[
      { href: '/manager-workspace', label: 'Template library', active: true },
      { href: '/admin/access', label: 'Assigned clients' },
      { href: '/admin', label: 'Operations console' },
      { href: '/workspace', label: 'Client workspace view' }
    ]}
  >
    <ManagerTemplateWorkspaceClient />
  </ManagerConsoleShell>;
}
