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

function canonicalManagerConsoleShell() {
  return `import type { ReactNode } from 'react';
import ConsoleShell from './console/ConsoleShell';
import { MANAGER_SWITCH_CONTRACT_VERSION } from '../lib/manager-runtime-source-sync';

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
  return <ConsoleShell
    role="manager"
    mode={mode}
    email={email}
    accountLabel={accountLabel}
    brandSubtitle={workspaceMode ? 'Manager workspace' : 'Manager console'}
    sidebarSectionTitle={workspaceMode ? 'Workspace' : 'Operations'}
    navItems={navItems}
    switchTarget={switchHref(mode)}
    switchTargetLabel={switchLabel(mode)}
    navAriaLabel={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'}
    navContract={MANAGER_SWITCH_CONTRACT_VERSION}
  >
    {children}
  </ConsoleShell>;
}
`;
}

function shellHasGlobalConsoleContract(source) {
  const required = [
    "import ConsoleShell from './console/ConsoleShell';",
    '<ConsoleShell',
    'role="manager"',
    'navContract={MANAGER_SWITCH_CONTRACT_VERSION}',
    'switchTarget={switchHref(mode)}',
    'switchTargetLabel={switchLabel(mode)}'
  ];
  return required.every((token) => source.includes(token))
    && !source.includes('<aside className="admin-monitor-sidebar')
    && !source.includes('<section className="admin-monitor-main')
    && !source.includes('ManagerAccountMenu')
    && !source.includes('WorkspaceSwitchAnchor')
    && !source.includes('ManagerWorkspaceSwitch')
    && !source.includes('manager-workspace-nav-switch')
    && !source.includes('top-visible-switch-mode')
    && !source.includes('switchLinkStyle')
    && !source.includes('accountSwitchTarget')
    && !source.includes('data-manager-switch-visible-slot="plain-nav-button"')
    && !source.includes('className="admin-monitor-account"');
}

function wireManagerConsoleShell() {
  const path = 'components/ManagerConsoleShell.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  const source = shellHasGlobalConsoleContract(before) ? before : canonicalManagerConsoleShell();
  if (!shellHasGlobalConsoleContract(source)) throw new Error('Global ConsoleShell manager contract could not be generated.');
  writeIfChanged(path, before, source, 'manager shell delegated to global ConsoleShell');
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

function cleanupLegacyManagerSwitch(path, label) {
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = source
    .replace(/import ManagerWorkspaceSwitch from ['"][^'"]+['"];\n/g, '')
    .replace(/\{scope === 'manager' && <ManagerWorkspaceSwitch \/>\}/g, '')
    .replace(/<ManagerWorkspaceSwitch \/>/g, '');
  writeIfChanged(path, before, source, label);
}

wireManagerConsoleShell();
wireAdminPage();
cleanupLegacyManagerSwitch('app/admin/access/page.tsx', 'legacy manager switch cleanup on /admin/access');
cleanupLegacyManagerSwitch('components/AccessAuditView.tsx', 'legacy manager switch cleanup on audit view');
cleanupLegacyManagerSwitch('components/GenerationReportView.tsx', 'legacy manager switch cleanup on reports view');
