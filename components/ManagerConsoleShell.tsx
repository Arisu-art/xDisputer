import type { CSSProperties, ReactNode } from 'react';
import { MANAGER_SWITCH_CONTRACT_VERSION } from '../lib/manager-runtime-source-sync';
import ManagerSwitchAccountChrome from './ManagerSwitchAccountChrome';

type NavItem = { href: string; label: string; active?: boolean; kind?: 'link' | 'workspace-switch' };

type Props = {
  mode: 'operations' | 'workspace';
  email?: string | null;
  accountLabel: string;
  navItems: NavItem[];
  children: ReactNode;
};

const accountSwitchStyle: CSSProperties = {
  width: '100%',
  minHeight: 54,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '12px 0 10px',
  padding: '12px 13px',
  borderRadius: 16,
  color: '#eff6ff',
  textDecoration: 'none',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  boxShadow: '0 14px 30px rgba(37, 99, 235, .30)',
  boxSizing: 'border-box',
  visibility: 'visible',
  opacity: 1,
  pointerEvents: 'auto'
};

const switchCopyStyle: CSSProperties = {
  display: 'grid',
  gap: 2,
  minWidth: 0,
  flex: 1
};

function switchCopyForTarget(href: string, reverse: boolean) {
  if (href.startsWith('/master')) return 'Master console';
  if (href.startsWith('/admin')) return 'Operations console';
  if (href.startsWith('/workspace')) return 'Client workspace';
  return reverse ? 'Operations console' : 'Manager workspace';
}

function WorkspaceSwitchAnchor({ href, reverse }: { href: string; reverse: boolean }) {
  const targetCopy = switchCopyForTarget(href, reverse);
  return <a className="manager-workspace-nav-switch account-switch-mode" style={accountSwitchStyle} href={href} data-manager-canonical-switch="true" data-manager-switch-target={href} data-manager-switch-target-label={targetCopy}>
    <span className="manager-workspace-switch-copy" style={switchCopyStyle}><strong style={{ fontSize: 12, lineHeight: 1.1, letterSpacing: '.02em', textTransform: 'uppercase' }}>Switch mode</strong><small style={{ color: 'rgba(239,246,255,.9)', fontSize: 11, lineHeight: 1.2 }}>{targetCopy}</small></span>
    <span className="manager-workspace-switch-arrow" style={{ color: 'rgba(239,246,255,.95)', fontWeight: 900 }} aria-hidden="true">→</span>
  </a>;
}

export default function ManagerConsoleShell({ mode, email, accountLabel, navItems, children }: Props) {
  const workspaceMode = mode === 'workspace';
  const switchTarget = workspaceMode ? '/admin' : '/manager-workspace';
  const explicitSwitch = navItems.find((item) => item.kind === 'workspace-switch');
  const regularNavItems = navItems.filter((item) => item.kind !== 'workspace-switch');
  const accountSwitchTarget = explicitSwitch?.href || switchTarget;

  return <main className={`admin-monitor-page native-console ${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}`} data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION} data-manager-console-mode={mode}>
    <ManagerSwitchAccountChrome />
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
