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

const consoleShell = read('components/console/ConsoleShell.tsx');
const managerShell = read('components/ManagerConsoleShell.tsx');
const masterHome = read('app/master/MasterConsoleHome.tsx');
const masterAccounts = read('app/master/accounts/page.tsx');
const masterWorkspaces = read('app/master/workspaces/page.tsx');
const accountMenu = read('components/ManagerAccountMenu.tsx');
const shellCss = read('app/console-shell-system.css');
const ratioCss = read('app/account-menu-ratio-system.css');
const roadmap = read('docs/ui-shell-roadmap-tracker.md');

has(consoleShell, 'data-console-shell="true"', 'ConsoleShell owns global shell marker');
has(consoleShell, 'data-console-sidebar="true"', 'ConsoleShell owns global sidebar marker');
has(consoleShell, 'data-console-main="true"', 'ConsoleShell owns global main marker');
has(consoleShell, 'data-console-header-grid="true"', 'ConsoleShell owns header grid marker');
has(consoleShell, 'navItems.filter((item) => item.kind !== \'workspace-switch\')', 'ConsoleShell dedupes switch nav items');
has(consoleShell, '<ManagerAccountMenu email={email}', 'ConsoleShell owns account menu placement');
notHas(consoleShell, 'action="/auth/sign-out"', 'ConsoleShell does not duplicate sign out');

has(managerShell, '<ConsoleShell', 'ManagerConsoleShell delegates to ConsoleShell');
notHas(managerShell, '<aside className="admin-monitor-sidebar', 'ManagerConsoleShell no longer owns sidebar markup');
notHas(managerShell, '<section className="admin-monitor-main', 'ManagerConsoleShell no longer owns main layout markup');

has(masterHome, '<ConsoleShell', 'Master home delegates to ConsoleShell');
has(masterAccounts, '<ConsoleShell', 'Master accounts delegates to ConsoleShell');
has(masterWorkspaces, '<ConsoleShell', 'Master workspaces delegates to ConsoleShell');
notHas(masterHome, '<aside className="admin-monitor-sidebar', 'Master home no longer owns sidebar markup');
notHas(masterAccounts, '<aside className="admin-monitor-sidebar', 'Master accounts no longer owns sidebar markup');
notHas(masterWorkspaces, '<aside className="admin-monitor-sidebar', 'Master workspaces no longer owns sidebar markup');
notHas(masterHome, '<ManagerAccountMenu', 'Master home no longer directly owns account menu');
notHas(masterAccounts, '<ManagerAccountMenu', 'Master accounts no longer directly owns account menu');
notHas(masterWorkspaces, '<ManagerAccountMenu', 'Master workspaces no longer directly owns account menu');

has(accountMenu, 'data-manager-account-state={open ? \'open\' : \'closed\'}', 'Account menu exposes open state');
has(accountMenu, 'data-manager-canonical-switch="true"', 'Account menu keeps canonical switch action');
has(accountMenu, 'action="/auth/sign-out"', 'Account menu owns sign out action');

has(shellCss, '--console-header-height', 'Console shell CSS defines global header height token');
has(shellCss, '--console-header-ratio-left: 3fr', 'Console shell CSS defines 75 percent left ratio');
has(shellCss, '--console-header-ratio-right: minmax(220px, 1fr)', 'Console shell CSS defines 25 percent account dock ratio');
has(shellCss, '[data-console-header-grid="true"]', 'Console shell CSS styles header grid contract');
has(shellCss, 'height: 100% !important', 'Console shell CSS equalizes header and dock heights');
has(ratioCss, "@import './console-shell-system.css';", 'Ratio CSS chains global console shell CSS');
has(ratioCss, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width) !important', 'Ratio CSS keeps final 75/25 override');

has(roadmap, 'Phase 1 — Global shell contract', 'Roadmap tracks global shell contract phase');
has(roadmap, 'Phase 2 — Global layout tokens', 'Roadmap tracks layout token phase');
has(roadmap, 'Phase 3 — Shared avatar account dock', 'Roadmap tracks account dock phase');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nConsole shell contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nConsole shell contract guard passed: ${checks.length} check(s).`);
