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

function ensureImport(source, anchor, line) {
  if (source.includes(line)) return source;
  return source.replace(anchor, `${anchor}\n${line}`);
}

function removeImport(source, line) {
  return source.replace(`${line}\n`, '').replace(`\n${line}`, '');
}

function assertShellSwitchContract(source) {
  const required = [
    'data-manager-canonical-switch="true"',
    'data-manager-switch-visible-slot="nav-first"',
    '<WorkspaceSwitchAnchor href={visibleSwitchTarget} reverse={workspaceMode} />',
    "navItems.filter((item) => item.kind !== 'workspace-switch')",
    'const visibleSwitchTarget = explicitSwitch?.href || switchTarget;'
  ];
  const missing = required.filter((token) => !source.includes(token));
  if (missing.length) throw new Error(`ManagerConsoleShell visible switch contract is broken. Missing: ${missing.join(', ')}`);
  if (source.includes('manager-workspace-nav-switch')) throw new Error('ManagerConsoleShell still uses legacy manager-workspace-nav-switch class; it can be visually suppressed.');
  if (source.includes('accountSwitchTarget')) throw new Error('ManagerConsoleShell still depends on account footer switch placement.');
}

function canonicalManagerConsoleShell() {
  return `import type { CSSProperties, ReactNode } from 'react';
import { MANAGER_SWITCH_CONTRACT_VERSION } from '../lib/manager-runtime-source-sync';

type NavItem = { href: string; label: string; active?: boolean; kind?: 'link' | 'workspace-switch' };

type Props = {
  mode: 'operations' | 'workspace';
  email?: string | null;
  accountLabel: string;
  navItems: NavItem[];
  children: ReactNode;
};

const switchLinkStyle: CSSProperties = {
  width: '100%',
  minHeight: 62,
  display: 'grid',
  gridTemplateColumns: '14px minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: 12,
  margin: '0 0 16px',
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
  zIndex: 1001,
  whiteSpace: 'normal',
  overflow: 'visible'
};

function switchCopyForTarget(href: string, reverse: boolean) {
  if (href.startsWith('/master')) return 'Master console';
  if (href.startsWith('/admin')) return 'Operations console';
  if (href.startsWith('/workspace')) return 'Client workspace';
  return reverse ? 'Operations console' : 'Manager workspace';
}

function WorkspaceSwitchAnchor({ href, reverse }: { href: string; reverse: boolean }) {
  const targetCopy = switchCopyForTarget(href, reverse);
  return <a style={switchLinkStyle} href={href} data-manager-switch-visible-slot="nav-first" data-manager-canonical-switch="true" data-manager-switch-target={href} data-manager-switch-target-label={targetCopy}>
    <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 999, background: '#bbf7d0', boxShadow: '0 0 0 5px rgba(187,247,208,.18)' }} />
    <span style={{ display: 'grid', gap: 3, minWidth: 0 }}><strong style={{ fontSize: 13, lineHeight: 1.05, letterSpacing: '.04em', textTransform: 'uppercase' }}>Switch mode</strong><small style={{ color: 'rgba(255,255,255,.92)', fontSize: 12, lineHeight: 1.2 }}>{targetCopy}</small></span>
    <span style={{ color: 'rgba(255,255,255,.96)', fontWeight: 950, fontSize: 18 }} aria-hidden="true">→</span>
  </a>;
}

export default function ManagerConsoleShell({ mode, email, accountLabel, navItems, children }: Props) {
  const workspaceMode = mode === 'workspace';
  const switchTarget = workspaceMode ? '/admin' : '/manager-workspace';
  const explicitSwitch = navItems.find((item) => item.kind === 'workspace-switch');
  const regularNavItems = navItems.filter((item) => item.kind !== 'workspace-switch');
  const visibleSwitchTarget = explicitSwitch?.href || switchTarget;

  return <main className={\`admin-monitor-page native-console \${workspaceMode ? 'manager-template-workspace' : 'manager-ops-console'}\`} data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION} data-manager-console-mode={mode}>
    <aside className="admin-monitor-sidebar native-console-sidebar">
      <div className="admin-monitor-brand"><span>xD</span><div><strong>xDisputer</strong><small>{workspaceMode ? 'Manager workspace' : 'Manager console'}</small></div></div>
      <div className="admin-sidebar-section-title">{workspaceMode ? 'Workspace' : 'Operations'}</div>
      <nav aria-label={workspaceMode ? 'Manager workspace navigation' : 'Manager operations navigation'} data-manager-shell-nav="true" data-manager-switch-contract={MANAGER_SWITCH_CONTRACT_VERSION}>
        <WorkspaceSwitchAnchor href={visibleSwitchTarget} reverse={workspaceMode} />
        {regularNavItems.map((item) => <a key={item.href} className={item.active ? 'active' : ''} href={item.href}>{item.label}</a>)}
      </nav>
      <div className="admin-monitor-account"><strong>{email || 'Manager account'}</strong><small>{accountLabel}</small><form action="/auth/sign-out" method="post"><button type="submit">Sign out</button></form></div>
    </aside>
    <section className="admin-monitor-main native-console-main">{children}</section>
  </main>;
}
`;
}

function wireVisibleSwitchStylesheet() {
  const path = 'app/layout.tsx';
  if (!existsSync(path) || !existsSync('app/manager-switch-visible.css')) return;
  const before = readFileSync(path, 'utf8');
  let source = before;
  source = ensureImport(source, "import './professional-console-layout.css';", "import './manager-switch-visible.css';");
  writeIfChanged(path, before, source, 'manager switch visibility stylesheet import');
}

function wireManagerConsoleShell() {
  const path = 'components/ManagerConsoleShell.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;

  try {
    assertShellSwitchContract(source);
  } catch {
    source = canonicalManagerConsoleShell();
  }

  assertShellSwitchContract(source);
  writeIfChanged(path, before, source, 'canonical visible manager switch shell');
}

function wireAdminPage() {
  const path = 'app/admin/page.tsx';
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  let source = before;

  if (source.includes('ManagerConsoleShell')) {
    source = removeImport(source, "import ManagerWorkspaceSwitch from '../../components/ManagerWorkspaceSwitch';");
    source = source.replace("    { href: '/manager-workspace', label: 'Manager workspace' },\n", '');
    if (!source.includes("kind: 'workspace-switch'")) {
      source = source.replace(
        "    { href: '/admin/audit', label: 'Audit log' }",
        "    { href: '/admin/audit', label: 'Audit log' },\n    { href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }"
      );
    }
    writeIfChanged(path, before, source, 'canonical manager workspace switch on /admin via shared shell');
    return;
  }

  source = ensureImport(source, "import ConsoleNavLink from '../../components/ConsoleNavLink';", "import ManagerWorkspaceSwitch from '../../components/ManagerWorkspaceSwitch';");
  if (!source.includes('<ManagerWorkspaceSwitch />')) source = source.replace('<div className="admin-monitor-account">', '<ManagerWorkspaceSwitch /><div className="admin-monitor-account">');
  writeIfChanged(path, before, source, 'manager workspace switch on /admin');
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

wireVisibleSwitchStylesheet();
wireManagerConsoleShell();
wireAdminPage();
wireAdminAccessPage();
wireAuditView();
wireReportView();
