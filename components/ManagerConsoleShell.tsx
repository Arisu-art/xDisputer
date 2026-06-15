import type { ReactNode } from 'react';
import ConsoleShell from './console/ConsoleShell';
import type { ConsoleHeaderProps } from './console/ConsoleHeader';
import type { ConsoleNavItem, ConsoleShellMode, ConsoleShellRole } from './console/ConsoleShell';
import { MANAGER_SWITCH_CONTRACT_VERSION } from '../lib/manager-runtime-source-sync';

type Props = {
  role?: ConsoleShellRole;
  mode: ConsoleShellMode;
  email?: string | null;
  accountName?: string | null;
  accountLabel: string;
  navItems: ConsoleNavItem[];
  className?: string;
  header?: ConsoleHeaderProps;
  children: ReactNode;
};

function targetFor(mode: ConsoleShellMode, role: ConsoleShellRole) {
  if (mode === 'workspace') return role === 'master' ? '/master' : '/admin';
  return '/manager-workspace';
}

function labelFor(mode: ConsoleShellMode, role: ConsoleShellRole) {
  if (mode === 'workspace') return role === 'master' ? 'Master console' : 'Operations console';
  return 'Manager workspace';
}

export default function ManagerConsoleShell({ role = 'manager', mode, email, accountName, accountLabel, navItems, className, header, children }: Props) {
  const workspaceMode = mode === 'workspace';
  return <ConsoleShell
    role={role}
    mode={mode}
    email={email}
    accountName={accountName}
    accountLabel={accountLabel}
    brandSubtitle={workspaceMode ? 'Manager workspace' : role === 'master' ? 'Master console' : 'Manager console'}
    sidebarSectionTitle={workspaceMode ? 'Workspace' : 'Operations'}
    navItems={navItems}
    switchTarget={targetFor(mode, role)}
    switchTargetLabel={labelFor(mode, role)}
    className={className}
    navAriaLabel={workspaceMode ? 'Template workspace navigation' : 'Manager operations navigation'}
    navContract={MANAGER_SWITCH_CONTRACT_VERSION}
    activeNavUsesConsoleLink
    header={header}
  >
    {children}
  </ConsoleShell>;
}
