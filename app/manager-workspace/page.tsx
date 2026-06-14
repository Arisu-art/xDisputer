import { redirect } from 'next/navigation';
import ManagerConsoleShell from '../../components/ManagerConsoleShell';
import ManagerTemplateWorkspaceClient from '../../components/ManagerTemplateWorkspaceClient';
import { requireAuth } from '../../lib/saas/session';

export default async function ManagerWorkspacePage() {
  const session = await requireAuth();
  if (!session.isManager && !session.isMaster) redirect(session.dashboardPath);

  const switchTarget = session.isMaster ? '/master' : '/admin';

  return <ManagerConsoleShell
    mode="workspace"
    email={session.user.email}
    accountLabel="Manager template authority"
    navItems={[
      { href: '/manager-workspace#template-library', label: 'Template library', active: true },
      { href: '/manager-workspace#template-workflow', label: 'Packet setup' },
      { href: '/manager-workspace#template-upload', label: 'Upload defaults' },
      { href: '/manager-workspace#template-health', label: 'Template health' },
      { href: switchTarget, label: 'Switch mode', kind: 'workspace-switch' as const }
    ]}
  >
    <ManagerTemplateWorkspaceClient />
  </ManagerConsoleShell>;
}
