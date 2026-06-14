#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
const read = (path) => {
  const ok = existsSync(path);
  checks.push({ ok, label: `file exists: ${path}` });
  return ok ? readFileSync(path, 'utf8') : '';
};
const has = (source, term, label) => checks.push({ ok: source.includes(term), label });
const notHas = (source, term, label) => checks.push({ ok: !source.includes(term), label });

const consoleShell = read('components/console/ConsoleShell.tsx');
const managerShell = read('components/ManagerConsoleShell.tsx');
const accountMenu = read('components/ManagerAccountMenu.tsx');
const baseCss = read('app/account-menu-system.css');
const ratioCss = read('app/account-menu-ratio-system.css');
const admin = read('app/admin/page.tsx');
const workspace = read('app/manager-workspace/page.tsx');
const templateWorkspace = read('components/ManagerTemplateWorkspaceClient.tsx');
const roadmap = read('docs/ui-shell-roadmap-tracker.md');

has(consoleShell, 'data-console-shell="true"', 'global console shell marker exists');
has(consoleShell, 'data-console-sidebar="true"', 'global sidebar marker exists');
has(consoleShell, 'data-console-main="true"', 'global main marker exists');
has(consoleShell, 'data-console-header-grid="true"', 'global header grid marker exists');
has(consoleShell, '<ManagerAccountMenu email={email}', 'account menu is owned by ConsoleShell');
has(consoleShell, "kind !== 'workspace-switch'", 'workspace switch nav item is deduped');
notHas(consoleShell, 'admin-monitor-account', 'old account footer is not in ConsoleShell');

has(managerShell, '<ConsoleShell', 'manager wrapper delegates to ConsoleShell');
notHas(managerShell, '<aside className="admin-monitor-sidebar', 'manager wrapper does not own sidebar markup');
notHas(managerShell, '<section className="admin-monitor-main', 'manager wrapper does not own main markup');
notHas(managerShell, 'WorkspaceSwitchAnchor', 'old complex switch component removed');
notHas(managerShell, 'plain-nav-button', 'old sidebar switch button removed');

has(accountMenu, 'data-manager-account-menu="true"', 'account menu marker exists');
has(accountMenu, 'data-manager-account-layout="header-75-25-avatar-only"', 'avatar-only account layout marker exists');
has(accountMenu, "data-manager-account-state={open ? 'open' : 'closed'}", 'account menu exposes open state');
has(accountMenu, 'data-manager-canonical-switch="true"', 'canonical switch action remains in account menu');
has(accountMenu, 'action="/auth/sign-out"', 'sign out remains owned by account menu');
notHas(accountMenu, 'manager-account-primary-grid', 'old two-column action grid removed');
notHas(accountMenu, 'manager-account-route-list', 'old duplicate route list removed');

has(baseCss, 'top: 0;', 'base popover opens from same header position');
notHas(baseCss, 'top: calc(100% + 12px)', 'base popover no longer drops below header');
notHas(baseCss, 'position: fixed', 'base account CSS is not fixed');
has(ratioCss, "@import './console-shell-system.css';", 'ratio CSS imports global console shell system');
has(ratioCss, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width) !important', 'ratio override applies 75/25 header grid');
has(ratioCss, '--account-dock-width: minmax(220px, 1fr)', 'ratio override reserves 25 percent account column');
has(ratioCss, 'height: 100% !important', 'header and dock height are equalized');
notHas(ratioCss, 'rgba(124, 58, 237, .36)', 'violet account dock border removed');

notHas(templateWorkspace, 'merged-template-command-metrics', 'template metrics wrapper removed');
notHas(templateWorkspace, 'manager-round-chip', 'selected-round chip removed');
notHas(templateWorkspace, 'Active templates', 'active templates chip removed');
notHas(templateWorkspace, 'Storage proof', 'storage proof chip removed');
has(admin, "kind: 'workspace-switch' as const", '/admin keeps switch target contract');
has(workspace, "kind: 'workspace-switch' as const", '/manager-workspace keeps reverse switch contract');
has(roadmap, 'Phase 1 — Global shell contract', 'roadmap tracks phase 1');
has(roadmap, 'Phase 2 — Global layout tokens', 'roadmap tracks phase 2');
has(roadmap, 'Phase 3 — Shared avatar account dock', 'roadmap tracks phase 3');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager visible switch/account contract failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager visible switch/account contract passed: ${checks.length} check(s).`);
