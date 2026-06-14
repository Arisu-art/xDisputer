import type { ReactNode } from 'react';
import ManagerWorkspaceSwitch from './ManagerWorkspaceSwitch';

type NavItem = { href: string; label: string; active?: boolean };

type Props = {
  mode: 'operations' | 'workspace';
  email?: string | null;
  accountLabel: string;
  navItems: NavItem[];
  children: ReactNode;
};

export default function ManagerConsoleShell({ mode, email, accountLabel, navItems, children }: Props) {
  const workspaceMode = mode === 'workspace';
  return <main className={`admin-monitor-page native-console ${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}`}>
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{workspaceMode ? 'Manager workspace' : 'Manager console'}</small></div></div>
      <div className="admin-sidebar-section-title">{workspaceMode ? 'Workspace' : 'Operations'}</div>
      <nav aria-label={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'}>
        {navItems.map((item) => <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
        <ManagerWorkspaceSwitch target={workspaceMode ? '/admin' : '/manager-workspace'} reverse={workspaceMode} variant="nav" />
      </nav>
      <div className="admin-monitor-account"><strong>{email || 'Manager account'}</strong><small>{accountLabel}</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
    </aside>
    <section className="admin-monitor-main native-console-main">{children}</section>
  </main>;
}
