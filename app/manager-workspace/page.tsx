import { redirect } from 'next/navigation';
import ManagerConsoleShell from '../../components/ManagerConsoleShell';
import ManagerTemplateWorkspaceClient from '../../components/ManagerTemplateWorkspaceClient';
import { requireAuth } from '../../lib/saas/session';
import { navItemsForDomain } from '../../lib/console/contracts/navigation-manifest';

export default async function ManagerWorkspacePage() {
  const session = await requireAuth();
  if (!session.isManager && !session.isMaster) redirect(session.dashboardPath);

  return <ManagerConsoleShell
    role={session.isMaster ? 'master' : 'manager'}
    mode="workspace"
    email={session.user.email}
    accountName={session.profile?.full_name || session.user.user_metadata?.full_name as string | null | undefined}
    accountLabel={session.isMaster ? 'Master template authority' : 'Manager template authority'}
    navItems={navItemsForDomain('manager-authoring', '/manager-workspace')}
    header={{ eyebrow: 'Manager workspace', title: 'Template Library', description: 'Authoring plane for manager-owned templates, mappings, validation, releases, and automation.' }}
  >
    <ManagerTemplateWorkspaceClient />
  </ManagerConsoleShell>;
}
