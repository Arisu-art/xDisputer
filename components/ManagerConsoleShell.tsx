import type { ReactNode } from 'react';
import { MANAGER_SWITCH_CONTRACT_VERSION } from '../lib/manager-runtime-source-sync';

type NavItem = { href: string; label: string; active?: boolean; kind?: 'link' | 'workspace-switch' };

type Props = {
  mode: 'operations' | 'workspace';
  email?: string | null;
  accountLabel: string;
  navItems: NavItem[];
  children: ReactNode;
};

function switchCopyForTarget(href: string, reverse: boolean) {
  if (href.startsWith('/master')) return 'Master console';
  if (href.startsWith('/admin')) return 'Operations console';
  if (href.startsWith('/workspace')) return 'Client workspace';
  return reverse ? 'Operations console' : 'Manager workspace';
}

function WorkspaceSwitchAnchor({ href, reverse }: { href: string; reverse: boolean }) {
  const targetCopy = switchCopyForTarget(href, reverse);
  return <a className="manager-workspace-nav-switch account-switch-mode" href={href} data-manager-canonical-switch="true" data-manager-switch-target={href} data-manager-switch-target-label={targetCopy}>
    <span className="manager-workspace-switch-copy"><strong>Switch mode</strong><small>{targetCopy}</small></span>
    <span className="manager-workspace-switch-arrow" aria-hidden="true">→</span>
  </a>;
}

export default function ManagerConsoleShell({ mode, email, accountLabel, navItems, children }: Props) {
  const workspaceMode = mode === 'workspace';
  const switchTarget = workspaceMode ? '/admin' : '/manager-workspace';
  const explicitSwitch = navItems.find((item) => item.kind === 'workspace-switch');
  const regularNavItems = navItems.filter((item) => item.kind !== 'workspace-switch');
  const accountSwitchTarget = explicitSwitch?.href || switchTarget;

  return <main className={`admin-monitor-page native-console ${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}`} data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION} data-manager-console-mode={mode}>
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{workspaceMode ? 'Manager workspace' : 'Manager console'}</small></div></div>
      <div className="admin-sidebar-section-title">{workspaceMode ? 'Workspace' : 'Operations'}</div>
      <nav aria-label={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'} data-manager-shell-nav="true" data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION}>
        {regularNavItems.map((item) => <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
      </nav>
      <div className="admin-monitor-account"><strong>{email || 'Manager account'}</strong><small>{accountLabel}</small><WorkspaceSwitchAnchor href={accountSwitchTarget} reverse={workspaceMode} /><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
    </aside>
    <section className="admin-monitor-main native-console-main">{children}</section>
  </main>;
}
