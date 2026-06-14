import type { ReactNode } from 'react';
import ConsoleShell from './console/ConsoleShell';
import { MANAGER_SWITCH_CONTRACT_VERSION } from '../lib/manager-runtime-source-sync';

type NavItem = { href: string; label: string; active?: boolean; kind?: 'link' | 'workspace-switch' };

type Props = {
  mode: 'operations' | 'workspace';
  email?: string | null;
  accountLabel: string;
  navItems: NavItem[];
  children: ReactNode;
};

function switchHref(mode: Props['mode']) {
  return mode === 'workspace' ? '/admin' : '/manager-workspace';
}

function switchLabel(mode: Props['mode']) {
  return mode === 'workspace' ? 'Operations console' : 'Manager workspace';
}

export default function ManagerConsoleShell({ mode, email, accountLabel, navItems, children }: Props) {
  const workspaceMode = mode === 'workspace';
  return <ConsoleShell
    role="manager"
    mode={mode}
    email={email}
    accountLabel={accountLabel}
    brandSubtitle={workspaceMode ? 'Manager workspace' : 'Manager console'}
    sidebarSectionTitle={workspaceMode ? 'Workspace' : 'Operations'}
    navItems={navItems}
    switchTarget={switchHref(mode)}
    switchTargetLabel={switchLabel(mode)}
    navAriaLabel={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'}
    navContract={MANAGER_SWITCH_CONTRACT_VERSION}
  >
    {children}
  </ConsoleShell>;
}
