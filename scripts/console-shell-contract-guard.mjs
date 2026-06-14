#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) {
  const ok = existsSync(path);
  checks.push({ ok, label: `file exists: ${path}` });
  return ok ? readFileSync(path, 'utf8') : '';
}
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }
function delegates(path, source) {
  has(source, '<ConsoleShell', `${path} delegates to ConsoleShell`);
  notHas(source, '<aside className="admin-monitor-sidebar', `${path} does not own sidebar markup`);
  notHas(source, '<section className="admin-monitor-main', `${path} does not own main markup`);
  notHas(source, 'className="admin-monitor-account"', `${path} has no old account footer`);
}

const consoleShell = read('components/console/ConsoleShell.tsx');
const consoleHeader = read('components/console/ConsoleHeader.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const managerAccountMenu = read('components/ManagerAccountMenu.tsx');
const renderDebugger = read('components/console/RenderDebugger.tsx');
const managerShell = read('components/ManagerConsoleShell.tsx');
const masterHome = read('app/master/MasterConsoleHome.tsx');
const masterAccounts = read('app/master/accounts/page.tsx');
const masterWorkspaces = read('app/master/workspaces/page.tsx');
const masterSystem = read('app/master/system/page.tsx');
const masterRecovery = read('app/master/recovery/page.tsx');
const managerAccess = read('app/admin/access/page.tsx');
const managerClients = read('app/admin/clients/page.tsx');
const reportView = read('components/GenerationReportView.tsx');
const accessAuditView = read('components/AccessAuditView.tsx');
const layout = read('app/layout.tsx');
const packageJson = read('package.json');
const phase14 = read('scripts/phase14-local-safety-check.mjs');
const shellCss = read('app/console-shell-system.css');
const ratioCss = read('app/account-menu-ratio-system.css');
const roadmap = read('docs/ui-shell-roadmap-tracker.md');

has(consoleShell, 'data-console-shell="true"', 'ConsoleShell owns global shell marker');
has(consoleShell, 'data-console-sidebar="true"', 'ConsoleShell owns global sidebar marker');
has(consoleShell, 'data-console-main="true"', 'ConsoleShell owns global main marker');
has(consoleShell, 'data-console-layout-ratio="75/25"', 'ConsoleShell exposes active ratio marker');
has(consoleShell, '<ConsoleHeader', 'ConsoleShell owns ConsoleHeader placement');
has(consoleShell, '<AccountMenu', 'ConsoleShell owns shared AccountMenu placement');
notHas(consoleShell, '<ManagerAccountMenu', 'ConsoleShell no longer mounts legacy ManagerAccountMenu');
notHas(consoleShell, 'action="/auth/sign-out"', 'ConsoleShell does not duplicate account actions');

has(consoleHeader, 'data-console-header="true"', 'ConsoleHeader exposes header marker');
has(consoleHeader, 'export type ConsoleHeaderProps', 'ConsoleHeader exports typed props');
has(accountMenu, 'data-console-account-menu="true"', 'AccountMenu exposes shared marker');
has(accountMenu, "role === 'master'", 'AccountMenu supports master role behavior');
has(accountMenu, 'data-manager-canonical-switch="true"', 'AccountMenu keeps canonical switch contract');
has(managerAccountMenu, '<AccountMenu', 'compat ManagerAccountMenu forwards to shared AccountMenu');
has(renderDebugger, 'window.__xdisputerDebug', 'RenderDebugger exposes debug global');
has(renderDebugger, 'document.styleSheets', 'RenderDebugger inspects loaded CSS');
has(layout, '<RenderDebugger />', 'root layout mounts RenderDebugger');
has(layout, "import './console-debug-overlay.css';", 'root layout imports debugger CSS');

delegates('ManagerConsoleShell', managerShell);
delegates('/master', masterHome);
delegates('/master/accounts', masterAccounts);
delegates('/master/workspaces', masterWorkspaces);
delegates('/master/system', masterSystem);
delegates('/master/recovery', masterRecovery);
delegates('/admin/access', managerAccess);
delegates('/admin/clients', managerClients);
delegates('GenerationReportView', reportView);
delegates('AccessAuditView', accessAuditView);

has(packageJson, '"ui-source:guard"', 'package defines ui-source:guard');
notHas(packageJson, 'apply-manager-workspace-nav-wiring.mjs', 'package no longer auto-runs workspace wiring');
notHas(packageJson, 'apply-user-error-flyout-wiring.mjs', 'package no longer auto-runs flyout wiring');
notHas(phase14, 'runSelfHealingScript(', 'phase14 no longer rewrites source');
has(phase14, 'verification-only mode', 'phase14 is verification-only');
has(shellCss, '.console-header-card', 'console shell CSS defines shared header card');
has(shellCss, '.console-header-secondary', 'console shell CSS defines secondary header slot');
has(ratioCss, "@import './console-shell-system.css';", 'Ratio CSS chains global console shell CSS');
has(roadmap, 'Phase A', 'roadmap tracks stabilization phase A');
has(roadmap, 'Phase E', 'roadmap tracks stabilization phase E');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nConsole shell contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nConsole shell contract guard passed: ${checks.length} check(s).`);
