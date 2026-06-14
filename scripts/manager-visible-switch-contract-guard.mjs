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

const shell = read('components/ManagerConsoleShell.tsx');
const accountMenu = read('components/ManagerAccountMenu.tsx');
const baseCss = read('app/account-menu-system.css');
const ratioCss = read('app/account-menu-ratio-system.css');
const layout = read('app/layout.tsx');
const admin = read('app/admin/page.tsx');
const workspace = read('app/manager-workspace/page.tsx');
const masterHome = read('app/master/MasterConsoleHome.tsx');
const masterAccounts = read('app/master/accounts/page.tsx');
const masterWorkspaces = read('app/master/workspaces/page.tsx');
const templateWorkspace = read('components/ManagerTemplateWorkspaceClient.tsx');
const roadmap = read('docs/ui-shell-roadmap-tracker.md');

has(shell, 'data-console-header-grid="true"', 'manager shell uses header grid main section');
has(shell, '<ManagerAccountMenu email={email} accountLabel={accountLabel} mode={mode} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />', 'manager shell mounts account menu inside header flow');
has(shell, "navItems.filter((item) => item.kind !== 'workspace-switch')", 'manager shell dedupes workspace-switch nav items');
notHas(shell, 'className="admin-monitor-account"', 'old manager left sidebar account footer removed');
notHas(shell, 'WorkspaceSwitchAnchor', 'old complex switch component removed');
notHas(shell, 'data-manager-switch-visible-slot="plain-nav-button"', 'old sidebar switch button removed');

has(masterHome, 'data-console-header-grid="true"', 'master home uses account header grid');
has(masterHome, '<ManagerAccountMenu email={email} accountLabel="Master account"', 'master home mounts account menu');
notHas(masterHome, 'admin-monitor-account', 'master home has no old sidebar account footer');
has(masterAccounts, 'data-console-header-grid="true"', 'master accounts uses account header grid');
has(masterAccounts, '<ManagerAccountMenu email={email} accountLabel="Master account"', 'master accounts mounts account menu');
notHas(masterAccounts, 'admin-monitor-account', 'master accounts has no old sidebar account footer');
has(masterWorkspaces, 'data-console-header-grid="true"', 'master workspaces uses account header grid');
has(masterWorkspaces, '<ManagerAccountMenu email={email} accountLabel="Master account"', 'master workspaces mounts account menu');
notHas(masterWorkspaces, 'admin-monitor-account', 'master workspaces has no old sidebar account footer');

has(accountMenu, 'data-manager-account-menu="true"', 'account menu marker exists');
has(accountMenu, 'data-manager-account-layout="header-75-25-avatar-only"', 'account menu uses avatar-only header contract');
has(accountMenu, "data-manager-account-state={open ? 'open' : 'closed'}", 'account menu exposes open state');
has(accountMenu, 'manager-account-popover', 'account popover exists');
has(accountMenu, 'manager-account-action-list', 'account action list exists');
has(accountMenu, 'data-manager-canonical-switch="true"', 'account menu owns switch action');
has(accountMenu, 'action="/auth/sign-out"', 'account menu owns sign out');
notHas(accountMenu, 'manager-account-primary-grid', 'old two-column action grid removed');
notHas(accountMenu, 'manager-account-route-list', 'old duplicate route list removed');

has(layout, "import './account-menu-system.css';", 'layout imports base account menu CSS');
has(layout, "import './account-menu-ratio-system.css';", 'layout imports final ratio override CSS');
has(baseCss, 'top: 0;', 'base popover opens from same header position');
notHas(baseCss, 'top: calc(100% + 12px)', 'base popover no longer drops below header');
notHas(baseCss, 'position: fixed', 'base account CSS is not fixed');

has(ratioCss, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width) !important', 'ratio override applies 75/25 header grid');
has(ratioCss, '--account-dock-width: minmax(220px, 1fr)', 'ratio override reserves 25 percent account column');
has(ratioCss, 'height: 100% !important', 'ratio override equalizes header and dock height');
has(ratioCss, 'position: relative !important', 'ratio account dock is header-flow relative');
has(ratioCss, 'top: auto !important', 'ratio overrides old top positioning');
has(ratioCss, 'right: auto !important', 'ratio overrides old right positioning');
has(ratioCss, 'width: 100% !important', 'ratio account dock fills its column');
has(ratioCss, 'border-left: 1px solid rgba(129, 140, 154, .36)', 'ratio uses neutral separator border');
has(ratioCss, 'top: 0 !important', 'ratio popover opens in same header position');
notHas(ratioCss, 'rgba(124, 58, 237, .36)', 'violet dock border removed');
notHas(ratioCss, 'border-left: 4px solid rgba(124', 'thick violet border removed');

notHas(templateWorkspace, 'merged-template-command-metrics', 'template metrics wrapper removed');
notHas(templateWorkspace, 'manager-round-chip', 'selected-round chip removed');
notHas(templateWorkspace, 'Active templates', 'active templates chip removed');
notHas(templateWorkspace, 'Storage proof', 'storage proof chip removed');
has(admin, "{ href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }", '/admin keeps switch target contract');
has(workspace, "kind: 'workspace-switch' as const", '/manager-workspace keeps reverse switch contract');
has(roadmap, 'Master accounts `/master/accounts` | Implemented', 'roadmap tracks master accounts implementation');
has(roadmap, 'Master workspaces `/master/workspaces` | Implemented', 'roadmap tracks master workspaces implementation');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager account header contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager account header contract guard passed: ${checks.length} check(s).`);
