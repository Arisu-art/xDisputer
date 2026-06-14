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

function WorkspaceSwitchAnchor({ href, reverse }: { href: string; reverse: boolean }) {
  return <a
    className="manager-workspace-nav-switch"
    href={href}
    data-manager-canonical-switch="true"
    data-manager-switch-target={href}
  >
    <span className="manager-workspace-switch-pulse" aria-hidden="true" />
    <span className="manager-workspace-switch-copy"><strong>Switch mode</strong><small>{reverse ? 'Operations console' : 'Manager workspace'}</small></span>
    <span className="manager-workspace-switch-arrow" aria-hidden="true">→</span>
  </a>;
}

export default function ManagerConsoleShell({ mode, email, accountLabel, navItems, children }: Props) {
  const workspaceMode = mode === 'workspace';
  const switchTarget = workspaceMode ? '/admin' : '/manager-workspace';
  const hasExplicitSwitch = navItems.some((item) => item.kind === 'workspace-switch');
  return <main className={`admin-monitor-page native-console ${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}`} data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION} data-manager-console-mode={mode}>
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{workspaceMode ? 'Manager workspace' : 'Manager console'}</small></div></div>
      <div className="admin-sidebar-section-title">{workspaceMode ? 'Workspace' : 'Operations'}</div>
      <nav aria-label={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'} data-manager-shell-nav="true" data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION}>
        {navItems.map((item) => item.kind === 'workspace-switch'
          ? <WorkspaceSwitchAnchor key={`${item.href}-workspace-switch`} href={item.href || switchTarget} reverse={workspaceMode} />
          : <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
        {!hasExplicitSwitch && <WorkspaceSwitchAnchor href={switchTarget} reverse={workspaceMode} />}
      </nav>
      <div className="admin-monitor-account"><strong>{email || 'Manager account'}</strong><small>{accountLabel}</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
      <style>{`
        .admin-monitor-sidebar nav .manager-workspace-nav-switch {
          position: relative;
          width: 100%;
          min-height: 58px !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          margin-top: 12px !important;
          padding: 12px 14px !important;
          border-radius: 18px !important;
          color: #eff6ff !important;
          text-decoration: none !important;
          background: linear-gradient(135deg, #2563eb, #7c3aed) !important;
          box-shadow: 0 16px 36px rgba(37, 99, 235, .28) !important;
          overflow: hidden !important;
          isolation: isolate;
          white-space: normal !important;
          text-overflow: clip !important;
        }
        .admin-monitor-sidebar nav .manager-workspace-nav-switch::after {
          content: '';
          position: absolute;
          inset: -45% -25%;
          z-index: -1;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.34), transparent);
          transform: translateX(-65%) rotate(12deg);
          animation: managerSwitchShine 3000ms ease-in-out infinite;
        }
        .manager-workspace-switch-pulse {
          width: 14px;
          height: 14px;
          flex: none;
          border-radius: 999px;
          background: #bbf7d0;
          box-shadow: 0 0 0 0 rgba(187, 247, 208, .72);
          animation: managerSwitchPulse 1600ms ease-out infinite;
        }
        .manager-workspace-switch-copy { display: grid; gap: 2px; min-width: 0; flex: 1; }
        .manager-workspace-switch-copy strong { font-size: 13px; line-height: 1.1; letter-spacing: .02em; text-transform: uppercase; }
        .manager-workspace-switch-copy small { color: rgba(239,246,255,.9); font-size: 12px; line-height: 1.2; }
        .manager-workspace-switch-arrow { color: rgba(239,246,255,.95); font-weight: 900; }
        @keyframes managerSwitchPulse { 0% { box-shadow: 0 0 0 0 rgba(187, 247, 208, .72); } 70% { box-shadow: 0 0 0 12px rgba(187, 247, 208, 0); } 100% { box-shadow: 0 0 0 0 rgba(187, 247, 208, 0); } }
        @keyframes managerSwitchShine { 0%, 35% { transform: translateX(-75%) rotate(12deg); } 62%, 100% { transform: translateX(95%) rotate(12deg); } }
      `}</style>
    </aside>
    <section className="admin-monitor-main native-console-main">{children}</section>
  </main>;
}
