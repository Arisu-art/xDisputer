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

const switchBlockStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  margin: '12px 0 18px',
  padding: 0,
  visibility: 'visible',
  opacity: 1,
  position: 'relative',
  zIndex: 1000
};

const switchLinkStyle: CSSProperties = {
  width: '100%',
  minHeight: 62,
  display: 'grid',
  gridTemplateColumns: '14px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 12,
  padding: '14px 15px',
  borderRadius: 20,
  color: '#ffffff',
  textDecoration: 'none',
  background: 'linear-gradient(135deg, #111827 0%, #2563eb 48%, #7c3aed 100%)',
  border: '1px solid rgba(255,255,255,.28)',
  boxShadow: '0 18px 38px rgba(37, 99, 235, .38)',
  boxSizing: 'border-box',
  visibility: 'visible',
  opacity: 1,
  pointerEvents: 'auto',
  position: 'relative',
  zIndex: 1001
};

function switchCopyForTarget(href: string, reverse: boolean) {
  if (href.startsWith('/master')) return 'Master console';
  if (href.startsWith('/admin')) return 'Operations console';
  if (href.startsWith('/workspace')) return 'Client workspace';
  return reverse ? 'Operations console' : 'Manager workspace';
}

function WorkspaceSwitchAnchor({ href, reverse }: { href: string; reverse: boolean }) {
  const targetCopy = switchCopyForTarget(href, reverse);
  return <div data-manager-switch-visible-slot="top-sidebar" style={switchBlockStyle}>
    <a style={switchLinkStyle} href={href} data-manager-canonical-switch="true" data-manager-switch-target={href} data-manager-switch-target-label={targetCopy}>
      <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 999, background: '#bbf7d0', boxShadow: '0 0 0 5px rgba(187,247,208,.18)' }} />
      <span style={{ display: 'grid', gap: 3, minWidth: 0 }}><strong style={{ fontSize: 13, lineHeight: 1.05, letterSpacing: '.04em', textTransform: 'uppercase' }}>Switch mode</strong><small style={{ color: 'rgba(255,255,255,.92)', fontSize: 12, lineHeight: 1.2 }}>{targetCopy}</small></span>
      <span style={{ color: 'rgba(255,255,255,.96)', fontWeight: 950, fontSize: 18 }} aria-hidden="true">→</span>
    </a>
  </div>;
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
