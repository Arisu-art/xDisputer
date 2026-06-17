import ConsoleShell, { type ConsoleNavItem } from '../../../components/console/ConsoleShell';
import MasterHologramWorkspaceShell from '../../../components/master-ui-workspace/MasterHologramWorkspaceShell';
import { requireRole } from '../../../lib/saas/session';

const navItems: ConsoleNavItem[] = [
  { href: '/master', label: 'Monitoring' },
  { href: '/master/accounts', label: 'All accounts' },
  { href: '/master/workspaces', label: 'Workspaces' },
  { href: '/master/ui-workspace', label: 'UI workspace', active: true },
  { href: '/master/reports', label: 'Reports' },
  { href: '/master/audit', label: 'Audit log' },
  { href: '/master/system', label: 'System health' }
];

export default async function MasterUiWorkspacePage() {
  const { user, profile } = await requireRole('master');
  const email = profile?.email || user.email || 'Master account';
  const currentMode = 'workspace' as const;

  return <ConsoleShell role="master" mode={currentMode} email={email} accountLabel="Master account" brandSubtitle="UI workspace" sidebarSectionTitle="Workspace" navItems={navItems} switchTarget="/master" switchTargetLabel="Master console" navAriaLabel="Master UI workspace navigation" activeNavUsesConsoleLink>
    <MasterHologramWorkspaceShell masterEmail={email} />
  </ConsoleShell>;
}
