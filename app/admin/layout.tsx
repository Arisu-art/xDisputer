import '../control-performance-shell.css';
import ControlConsoleShell from '../../components/control/ControlConsoleShell';
import { requireRole } from '../../lib/saas/session';

const managerNavItems = [
  { href: '/admin', label: 'Monitoring' },
  { href: '/admin/access', label: 'Access control' },
  { href: '/admin?panel=intake', label: 'Client intake' },
  { href: '/admin?panel=review', label: 'Review queue' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/audit', label: 'Audit log' }
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireRole('manager');

  return <ControlConsoleShell
    scope="manager"
    brandLabel="xDisputer"
    brandSubtitle="Manager console"
    accountEmail={profile?.email || user.email || 'Manager account'}
    accountLabel="Manager account"
    navItems={managerNavItems}
  >
    {children}
  </ControlConsoleShell>;
}
