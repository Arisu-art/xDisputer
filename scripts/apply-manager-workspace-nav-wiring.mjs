#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function writeIfChanged(path, before, after, label) {
  if (before === after) {
    console.log(`${label} already present.`);
    return;
  }
  writeFileSync(path, after);
  console.log(`Applied ${label}.`);
}

function removeImport(source, line) {
  return source.replace(`${line}\n`, '').replace(`\n${line}`, '');
}

function ensureImport(source, anchor, line) {
  if (source.includes(line)) return source;
  return source.replace(anchor, `${anchor}\n${line}`);
}

function canonicalManagerConsoleShell() {
  return `import type { ReactNode } from 'react';
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

  return <main className={\`admin-monitor-page native-console \${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}\`} data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION} data-manager-console-mode={mode}>
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
`;
}

function shellHasTopAccountContract(source) {
  const required = [
    "import ManagerAccountMenu from './ManagerAccountMenu';",
    '<ManagerAccountMenu email={email} accountLabel={accountLabel} mode={mode} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />',
    'function switchHref',
    'function switchLabel',
    "navItems.filter((item) => item.kind !== 'workspace-switch')",
    'data-manager-shell-nav="true"'
  ];
  return required.every((token) => source.includes(token))
    && !source.includes('WorkspaceSwitchAnchor')
    && !source.includes('manager-workspace-nav-switch')
    && !source.includes('top-visible-switch-mode')
    && !source.includes('switchLinkStyle')
    && !source.includes('accountSwitchTarget')
    && !source.includes('data-manager-switch-visible-slot="plain-nav-button"')
    && !source.includes('>\n          Switch mode\n        </a>')
    && !source.includes('action="/auth/sign-out" method="post"><button type="submit">Sign out</button>')
    && !source.includes('className="admin-monitor-account"');
}

function wireManagerConsoleShell() {
  const path = 'components/ManagerConsoleShell.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  const source = shellHasTopAccountContract(before) ? before : canonicalManagerConsoleShell();
  if (!shellHasTopAccountContract(source)) throw new Error('Top account menu shell contract could not be generated.');
  writeIfChanged(path, before, source, 'manager shell with top account menu only');
}

function wireAdminPage() {
  const path = 'app/admin/page.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = removeImport(source, "import ManagerWorkspaceSwitch from '../../components/ManagerWorkspaceSwitch';");
  source = source.replace("    { href: '/manager-workspace', label: 'Manager workspace' },\n", '');
  if (source.includes('ManagerConsoleShell') && !source.includes("kind: 'workspace-switch'")) {
    source = source.replace(
      "    { href: '/admin/audit', label: 'Audit log' }",
      "    { href: '/admin/audit', label: 'Audit log' },\n    { href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }"
    );
  }
  writeIfChanged(path, before, source, 'top account switch contract on /admin');
}

function wireAdminAccessPage() {
  const path = 'app/admin/access/page.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = ensureImport(source, "import ConsoleNavLink from '../../../components/ConsoleNavLink';", "import ManagerWorkspaceSwitch from '../../../components/ManagerWorkspaceSwitch';");
  if (!source.includes('<ManagerWorkspaceSwitch />')) source = source.replace('<div className="admin-monitor-account">', '<ManagerWorkspaceSwitch /><div className="admin-monitor-account">');
  writeIfChanged(path, before, source, 'manager workspace switch on /admin/access');
}

function wireAuditView() {
  const path = 'components/AccessAuditView.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = ensureImport(source, "import ConsoleNavLink from './ConsoleNavLink';", "import ManagerWorkspaceSwitch from './ManagerWorkspaceSwitch';");
  if (!source.includes("{scope === 'manager' && <ManagerWorkspaceSwitch />}")) source = source.replace('{nav(scope)}', "{nav(scope)}\n      {scope === 'manager' && <ManagerWorkspaceSwitch />}");
  writeIfChanged(path, before, source, 'manager workspace switch on audit view');
}

function wireReportView() {
  const path = 'components/GenerationReportView.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = ensureImport(source, "import ConsoleNavLink from './ConsoleNavLink';", "import ManagerWorkspaceSwitch from './ManagerWorkspaceSwitch';");
  if (!source.includes("{scope === 'manager' && <ManagerWorkspaceSwitch />}")) source = source.replace('<ReportNavigation scope={scope} />', "<ReportNavigation scope={scope} />{scope === 'manager' && <ManagerWorkspaceSwitch />}");
  writeIfChanged(path, before, source, 'manager workspace switch on reports view');
}

wireManagerConsoleShell();
wireAdminPage();
wireAdminAccessPage();
wireAuditView();
wireReportView();
