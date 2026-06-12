import '../control-performance-shell.css';
import ControlConsoleShell from '../../components/control/ControlConsoleShell';
import { requireRole } from '../../lib/saas/session';

const masterNavItems = [
  { href: '/master', label: 'Monitoring' },
  { href: '/master/accounts', label: 'Accounts' },
  { href: '/master/reports', label: 'Reports' },
  { href: '/master/audit', label: 'Audit' },
  { href: '/master/system', label: 'System' }
];

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole('master');

  return <ControlConsoleShell
    scope="master"
    brandLabel="xDisputer"
    brandSubtitle="Master console"
    accountEmail={profile?.email || user.email || 'Master account'}
    accountLabel="Owner account"
    navItems={masterNavItems}
  >
    {children}
  </ControlConsoleShell>;
}
