import type { ReactNode } from 'react';
import { MANAGER_SWITCH_CONTRACT_VERSION } from '../lib/manager-runtime-source-sync';
import ManagerAccountMenu from './ManagerAccountMenu';

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
  const switchTarget = switchHref(mode);
  const switchTargetLabel = switchLabel(mode);
  const visibleNavItems = navItems.filter((item) => item.kind !== 'workspace-switch');

  return <main className={`admin-monitor-page native-console ${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}`} data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION} data-manager-console-mode={mode}>
    <ManagerAccountMenu email={email} accountLabel={accountLabel} mode={mode} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{workspaceMode ? 'Manager workspace' : 'Manager console'}</small></div></div>
      <div className="admin-sidebar-section-title">{workspaceMode ? 'Workspace' : 'Operations'}</div>
      <nav aria-label={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'} data-manager-shell-nav="true" data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION}>
        {visibleNavItems.map((item) => <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
      </nav>
    </aside>
    <section className="admin-monitor-main native-console-main">{children}</section>
  </main>;
}
