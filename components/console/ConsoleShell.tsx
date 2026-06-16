import type { ReactNode } from 'react';
import ConsoleNavLink from '../ConsoleNavLink';
import AccountMenu from './AccountMenu';
import ConsoleHeader, { type ConsoleHeaderProps } from './ConsoleHeader';

type ConsoleNavItem = {
  href: string;
  label: string;
  active?: boolean;
  kind?: 'link' | 'workspace-switch';
};

type ConsoleShellRole = 'manager' | 'master';
type ConsoleShellMode = 'operations' | 'workspace';

type Props = {
  role: ConsoleShellRole;
  mode: ConsoleShellMode;
  email?: string | null;
  accountName?: string | null;
  accountLabel: string;
  brandTitle?: string;
  brandSubtitle: string;
  sidebarSectionTitle: string;
  navItems: ConsoleNavItem[];
  switchTarget: string;
  switchTargetLabel: string;
  className?: string;
  navAriaLabel: string;
  navContract?: string;
  activeNavUsesConsoleLink?: boolean;
  header?: ConsoleHeaderProps;
  children: ReactNode;
};

type SwitchModeContract = {
  currentLabel: string;
  targetLabel: string;
  intent: string;
  helper: string;
  icon: string;
};

function shellModeClass(role: ConsoleShellRole, mode: ConsoleShellMode) {
  if (mode === 'workspace') return 'manager-template-workspace';
  if (role === 'manager') return 'manager-ops-console';
  return 'master-ops-console';
}

function join(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(' ');
}

function switchModeContract(role: ConsoleShellRole, mode: ConsoleShellMode, switchTargetLabel: string): SwitchModeContract {
  if (role === 'manager' && mode === 'workspace') {
    return { currentLabel: 'Workspace authoring', targetLabel: switchTargetLabel || 'Operations console', intent: 'Switch to monitoring', helper: 'Review clients, outputs, access, reports, and audit queues.', icon: '↗' };
  }
  if (role === 'manager') {
    return { currentLabel: 'Operations monitoring', targetLabel: switchTargetLabel || 'Manager workspace', intent: 'Switch to authoring', helper: 'Open template library, mapping, validation, release, and automation tools.', icon: '↔' };
  }
  return { currentLabel: 'Master governance', targetLabel: switchTargetLabel || 'Manager console', intent: 'Open paired surface', helper: 'Move to the paired operational surface without mixing account settings.', icon: '↘' };
}

export default function ConsoleShell({ role, mode, email, accountName, accountLabel, brandTitle = 'xDisputer', brandSubtitle, sidebarSectionTitle, navItems, switchTarget, switchTargetLabel, className, navAriaLabel, navContract = 'console-shell-v2', activeNavUsesConsoleLink = false, header, children }: Props) {
  const visibleNavItems = navItems.filter((item) => item.kind !== 'workspace-switch');
  const shellClassName = join('admin-monitor-page native-console', shellModeClass(role, mode), className);
  const switchMode = switchModeContract(role, mode, switchTargetLabel);

  return <main className={shellClassName} data-console-shell="true" data-console-component="ConsoleShell" data-console-role={role} data-console-mode={mode} data-console-layout-ratio="75/25" data-console-contract={navContract} data-master-console-shell={role === 'master' ? 'true' : undefined} data-manager-console-mode={role === 'manager' ? mode : undefined}>
    <aside className="admin-monitor-sidebar native-console-sidebar" data-layout-contract="console-sidebar" data-console-sidebar="true" data-console-component="ConsoleSidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>{brandTitle}</strong><small>{brandSubtitle}</small></div></div>
      <div className="admin-sidebar-section-title">{sidebarSectionTitle}</div>
      <nav aria-label={navAriaLabel} data-console-sidebar-nav="true" data-manager-shell-nav={role === 'manager' ? 'true' : undefined} data-master-shell-nav={role === 'master' ? 'true' : undefined} data-manager-switch-contract={navContract}>
        {visibleNavItems.map((item) => activeNavUsesConsoleLink
          ? <ConsoleNavLink key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</ConsoleNavLink>
          : <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
      </nav>
      <section className="console-sidebar-mode-switch" data-console-mode-switch="sidebar-bottom" data-console-mode-switch-role={role} data-console-mode-switch-current={mode} aria-label="Switch console mode">
        <div><span>{switchMode.currentLabel}</span><strong>{switchMode.intent}</strong><small>{switchMode.helper}</small></div>
        <ConsoleNavLink href={switchTarget} className="console-sidebar-mode-switch-button" data-manager-canonical-switch="true" data-manager-switch-visible-slot="sidebar-bottom" data-manager-switch-target={switchTarget} data-manager-switch-target-label={switchMode.targetLabel}><span>{switchMode.targetLabel}</span><em aria-hidden="true">{switchMode.icon}</em></ConsoleNavLink>
      </section>
    </aside>
    <section className="admin-monitor-main native-console-main" data-console-main="true" data-console-component="ConsoleMain" data-console-header-grid="true" data-console-has-header={header ? 'true' : 'false'}>
      <AccountMenu role={role} mode={mode} email={email} displayName={accountName} accountLabel={accountLabel} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />
      {header ? <ConsoleHeader {...header} /> : null}
      {children}
    </section>
  </main>;
}

export type { ConsoleNavItem, ConsoleShellMode, ConsoleShellRole, Props as ConsoleShellProps };
