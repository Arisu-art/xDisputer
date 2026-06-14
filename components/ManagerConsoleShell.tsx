import type { ReactNode } from 'react';
import ManagerWorkspaceSwitch from './ManagerWorkspaceSwitch';

type NavItem = { href: string; label: string; active?: boolean; kind?: 'link' | 'workspace-switch' };

type Props = {
  mode: 'operations' | 'workspace';
  email?: string | null;
  accountLabel: string;
  navItems: NavItem[];
  children: ReactNode;
};

export default function ManagerConsoleShell({ mode, email, accountLabel, navItems, children }: Props) {
  const workspaceMode = mode === 'workspace';
  const switchTarget = workspaceMode ? '/admin' : '/manager-workspace';
  const hasExplicitSwitch = navItems.some((item) => item.kind === 'workspace-switch');
  return <main className={`admin-monitor-page native-console ${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}`}>
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{workspaceMode ? 'Manager workspace' : 'Manager console'}</small></div></div>
      <div className="admin-sidebar-section-title">{workspaceMode ? 'Workspace' : 'Operations'}</div>
      <nav aria-label={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'} data-manager-shell-nav="true">
        {navItems.map((item) => item.kind === 'workspace-switch'
          ? <ManagerWorkspaceSwitch key={`${item.href}-workspace-switch`} target={item.href || switchTarget} reverse={workspaceMode} variant="nav" />
          : <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
        {!hasExplicitSwitch && <ManagerWorkspaceSwitch target={switchTarget} reverse={workspaceMode} variant="nav" />}
      </nav>
      <div className="admin-monitor-account"><strong>{email || 'Manager account'}</strong><small>{accountLabel}</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
    </aside>
    <section className="admin-monitor-main native-console-main">{children}</section>
  </main>;
}
