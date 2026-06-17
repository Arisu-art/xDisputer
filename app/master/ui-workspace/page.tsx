import ConsoleShell, { type ConsoleNavItem } from '../../../components/console/ConsoleShell';
import MasterHologramWorkspaceShell from '../../../components/master-ui-workspace/MasterHologramWorkspaceShell';
import MasterWorkspaceFrame from '../../../components/master-ui-workspace/MasterWorkspaceFrame';
import { requireRole } from '../../../lib/saas/session';

const navItems: ConsoleNavItem[] = [
  { href: '/master', label: 'Master Console' },
  { href: '/master/accounts', label: 'All accounts' },
  { href: '/master/workspaces', label: 'Workspaces' },
  { href: '/master/ui-workspace', label: 'UI Workspace', active: true },
  { href: '/master/reports', label: 'Reports' },
  { href: '/master/audit', label: 'Audit log' },
  { href: '/master/system', label: 'System health' }
];

export default async function MasterUiWorkspacePage() {
  const { user, profile } = await requireRole('master');
  const email = profile?.email || user.email || 'Master account';
  void ConsoleShell;
  void navItems;

  return <MasterWorkspaceFrame email={email}>
    <MasterHologramWorkspaceShell masterEmail={email} />
  </MasterWorkspaceFrame>;
}
