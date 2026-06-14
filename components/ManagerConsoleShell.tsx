import type { CSSProperties, ReactNode } from 'react';
import { MANAGER_SWITCH_CONTRACT_VERSION } from '../lib/manager-runtime-source-sync';

type NavItem = { href: string; label: string; active?: boolean; kind?: 'link' | 'workspace-switch' };

type Props = {
  mode: 'operations' | 'workspace';
  email?: string | null;
  accountLabel: string;
  navItems: NavItem[];
  children: ReactNode;
};

const visibleSwitchStyle: CSSProperties = {
  width: '100%',
  minHeight: 58,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  margin: '12px 0 18px',
  padding: '13px 14px',
  borderRadius: 18,
  color: '#eff6ff',
  textDecoration: 'none',
  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
  boxShadow: '0 16px 34px rgba(37, 99, 235, .34)',
  boxSizing: 'border-box',
  visibility: 'visible',
  opacity: 1,
  pointerEvents: 'auto',
  position: 'relative',
  zIndex: 50
};

const switchCopyStyle: CSSProperties = { display: 'grid', gap: 2, minWidth: 0, flex: 1 };

function switchCopyForTarget(href: string, reverse: boolean) {
  if (href.startsWith('/master')) return 'Master console';
  if (href.startsWith('/admin')) return 'Operations console';
  if (href.startsWith('/workspace')) return 'Client workspace';
  return reverse ? 'Operations console' : 'Manager workspace';
}

function WorkspaceSwitchAnchor({ href, reverse }: { href: string; reverse: boolean }) {
  const targetCopy = switchCopyForTarget(href, reverse);
  return <a className="manager-workspace-nav-switch top-visible-switch-mode" style={visibleSwitchStyle} href={href} data-manager-canonical-switch="true" data-manager-switch-target={href} data-manager-switch-target-label={targetCopy}>
    <span aria-hidden="true" style={{ width: 13, height: 13, flex: 'none', borderRadius: 999, background: '#bbf7d0', boxShadow: '0 0 0 5px rgba(187,247,208,.18)' }} />
    <span className="manager-workspace-switch-copy" style={switchCopyStyle}><strong style={{ fontSize: 13, lineHeight: 1.1, letterSpacing: '.03em', textTransform: 'uppercase' }}>Switch mode</strong><small style={{ color: 'rgba(239,246,255,.92)', fontSize: 12, lineHeight: 1.2 }}>{targetCopy}</small></span>
    <span className="manager-workspace-switch-arrow" style={{ color: 'rgba(239,246,255,.95)', fontWeight: 900 }} aria-hidden="true">→</span>
  </a>;
}

export default function ManagerConsoleShell({ mode, email, accountLabel, navItems, children }: Props) {
  const workspaceMode = mode === 'workspace';
  const switchTarget = workspaceMode ? '/admin' : '/manager-workspace';
  const explicitSwitch = navItems.find((item) => item.kind === 'workspace-switch');
  const regularNavItems = navItems.filter((item) => item.kind !== 'workspace-switch');
  const visibleSwitchTarget = explicitSwitch?.href || switchTarget;

  return <main className={`admin-monitor-page native-console ${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}`} data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION} data-manager-console-mode={mode}>
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{workspaceMode ? 'Manager workspace' : 'Manager console'}</small></div></div>
      <div className="admin-sidebar-section-title">{workspaceMode ? 'Workspace' : 'Operations'}</div>
      <WorkspaceSwitchAnchor href={visibleSwitchTarget} reverse={workspaceMode} />
      <nav aria-label={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'} data-manager-shell-nav="true" data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION}>
        {regularNavItems.map((item) => <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
      </nav>
      <div className="admin-monitor-account"><strong>{email || 'Manager account'}</strong><small>{accountLabel}</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
    </aside>
    <section className="admin-monitor-main native-console-main">{children}</section>
  </main>;
}
