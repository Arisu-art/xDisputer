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
const accountMenu = read('components/ManagerAccountMenu.tsx');
const shellCss = read('app/console-shell-system.css');
const ratioCss = read('app/account-menu-ratio-system.css');
const roadmap = read('docs/ui-shell-roadmap-tracker.md');

has(consoleShell, 'data-console-shell="true"', 'ConsoleShell owns global shell marker');
has(consoleShell, 'data-console-sidebar="true"', 'ConsoleShell owns global sidebar marker');
has(consoleShell, 'data-console-main="true"', 'ConsoleShell owns global main marker');
has(consoleShell, 'data-console-header-grid="true"', 'ConsoleShell owns header grid marker');
has(consoleShell, "navItems.filter((item) => item.kind !== 'workspace-switch')", 'ConsoleShell dedupes switch nav items');
has(consoleShell, '<ManagerAccountMenu email={email}', 'ConsoleShell owns account menu placement');
notHas(consoleShell, 'action="/auth/sign-out"', 'ConsoleShell does not duplicate sign out');

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

notHas(masterHome, '<ManagerAccountMenu', 'Master home no longer directly owns account menu');
notHas(masterAccounts, '<ManagerAccountMenu', 'Master accounts no longer directly owns account menu');
notHas(masterWorkspaces, '<ManagerAccountMenu', 'Master workspaces no longer directly owns account menu');
notHas(masterSystem, '<ManagerAccountMenu', 'Master system no longer directly owns account menu');
notHas(masterRecovery, '<ManagerAccountMenu', 'Master recovery no longer directly owns account menu');
notHas(reportView, 'ManagerWorkspaceSwitch', 'Reports no longer use legacy manager switch component');
notHas(accessAuditView, 'ManagerWorkspaceSwitch', 'Audit no longer uses legacy manager switch component');

has(accountMenu, "data-manager-account-state={open ? 'open' : 'closed'}", 'Account menu exposes open state');
has(accountMenu, 'data-manager-canonical-switch="true"', 'Account menu keeps canonical switch action');
has(accountMenu, 'action="/auth/sign-out"', 'Account menu owns sign out action');

has(shellCss, '--console-header-height', 'Console shell CSS defines global header height token');
has(shellCss, '--console-header-ratio-left: 3fr', 'Console shell CSS defines 75 percent left ratio');
has(shellCss, '--console-header-ratio-right: minmax(220px, 1fr)', 'Console shell CSS defines 25 percent account dock ratio');
has(shellCss, '[data-console-header-grid="true"]', 'Console shell CSS styles header grid contract');
has(shellCss, 'height: 100% !important', 'Console shell CSS equalizes header and dock heights');
has(ratioCss, "@import './console-shell-system.css';", 'Ratio CSS chains global console shell CSS');
has(ratioCss, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width) !important', 'Ratio CSS keeps final 75/25 override');

has(roadmap, 'Phase 4 — Remaining master secondary pages | Implemented', 'Roadmap tracks master secondary pages as implemented');
has(roadmap, 'Phase 5 — Remaining manager secondary pages | Implemented', 'Roadmap tracks manager secondary pages as implemented');
has(roadmap, '`/master/system` | Implemented', 'Roadmap tracks master system route');
has(roadmap, '`/master/recovery` | Implemented', 'Roadmap tracks master recovery route');
has(roadmap, '`/admin/access` | Implemented', 'Roadmap tracks manager access route');
has(roadmap, '`/admin/clients` | Implemented', 'Roadmap tracks manager clients route');
has(roadmap, '`/admin/reports` | Implemented', 'Roadmap tracks manager reports route');
has(roadmap, '`/admin/audit` | Implemented', 'Roadmap tracks manager audit route');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nConsole shell contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nConsole shell contract guard passed: ${checks.length} check(s).`);
