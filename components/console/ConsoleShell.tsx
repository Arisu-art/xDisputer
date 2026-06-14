import type { ReactNode } from 'react';
import ConsoleNavLink from '../ConsoleNavLink';
import ManagerAccountMenu from '../ManagerAccountMenu';

type ConsoleNavItem = {
  href: string;
  label: string;
  active?: boolean;
  kind?: 'link' | 'workspace-switch';
};

type ConsoleShellRole = 'manager' | 'master';
type ConsoleShellMode = 'operations' | 'workspace';

type Props = {
  role: ConsoleShellRole;
  mode: ConsoleShellMode;
  email?: string | null;
  accountLabel: string;
  brandTitle?: string;
  brandSubtitle: string;
  sidebarSectionTitle: string;
  navItems: ConsoleNavItem[];
  switchTarget: string;
  switchTargetLabel: string;
  className?: string;
  navAriaLabel: string;
  navContract?: string;
  activeNavUsesConsoleLink?: boolean;
  children: ReactNode;
};

function shellModeClass(role: ConsoleShellRole, mode: ConsoleShellMode) {
  if (role === 'manager' && mode === 'workspace') return 'manager-template-workspace';
  if (role === 'manager') return 'manager-ops-console';
  return 'master-ops-console';
}

export default function ConsoleShell({
  role,
  mode,
  email,
  accountLabel,
  brandTitle = 'xDisputer',
  brandSubtitle,
  sidebarSectionTitle,
  navItems,
  switchTarget,
  switchTargetLabel,
  className = '',
  navAriaLabel,
  navContract,
  activeNavUsesConsoleLink = false,
  children
}: Props) {
  const visibleNavItems = navItems.filter((item) => item.kind !== 'workspace-switch');
  const shellClassName = ['admin-monitor-page native-console', shellModeClass(role, mode), className].filter(Boolean).join(' ');

  return <main className={shellClassName} data-console-shell="true" data-console-role={role} data-console-mode={mode} data-master-console-shell={role === 'master' ? 'true' : undefined} data-manager-console-mode={role === 'manager' ? mode : undefined}>
    <aside className="admin-monitor-sidebar native-console-sidebar" data-console-sidebar="true">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>{brandTitle}</strong><small>{brandSubtitle}</small></div></div>
      <div className="admin-sidebar-section-title">{sidebarSectionTitle}</div>
      <nav aria-label={navAriaLabel} data-console-sidebar-nav="true" data-manager-shell-nav={role === 'manager' ? 'true' : undefined} data-master-shell-nav={role === 'master' ? 'true' : undefined} data-manager-switch-contract={navContract}>
        {visibleNavItems.map((item) => activeNavUsesConsoleLink
          ? <ConsoleNavLink key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</ConsoleNavLink>
          : <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
      </nav>
    </aside>
    <section className="admin-monitor-main native-console-main" data-console-main="true" data-console-header-grid="true">
      <ManagerAccountMenu email={email} accountLabel={accountLabel} mode={mode} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />
      {children}
    </section>
  </main>;
}

export type { ConsoleNavItem, ConsoleShellMode, ConsoleShellRole };
