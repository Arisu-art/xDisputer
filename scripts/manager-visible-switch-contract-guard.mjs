#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }

const shell = read('components/ManagerConsoleShell.tsx');
const accountMenu = read('components/ManagerAccountMenu.tsx');
const admin = read('app/admin/page.tsx');
const workspace = read('app/manager-workspace/page.tsx');

has(shell, "import ManagerAccountMenu from './ManagerAccountMenu';", 'shell imports top account menu');
has(shell, '<ManagerAccountMenu email={email} accountLabel={accountLabel} mode={mode} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />', 'shell mounts top account menu');
has(shell, "navItems.filter((item) => item.kind !== 'workspace-switch')", 'shell removes duplicate workspace-switch nav items');
has(shell, 'data-manager-shell-nav="true"', 'shell keeps standard sidebar nav renderer');
notHas(shell, 'data-manager-switch-visible-slot="plain-nav-button"', 'old sidebar switch nav button removed');
notHas(shell, '>\n          Switch mode\n        </a>', 'old sidebar switch text removed');
notHas(shell, 'className="admin-monitor-account"', 'old left sidebar account footer removed');
notHas(shell, 'WorkspaceSwitchAnchor', 'shell no longer uses complex switch component');
notHas(shell, 'manager-workspace-nav-switch', 'shell no longer uses legacy switch class');
notHas(shell, 'top-visible-switch-mode', 'shell no longer uses hidden-prone top-visible class');
notHas(shell, 'switchLinkStyle', 'shell no longer uses complex inline switch style object');
notHas(shell, 'action="/auth/sign-out" method="post"><button type="submit">Sign out</button>', 'sign out moved out of left sidebar footer');

has(accountMenu, "'use client';", 'account menu is client-side interactive');
has(accountMenu, 'data-manager-account-menu="true"', 'account menu exposes stable marker');
has(accountMenu, 'data-manager-account-layout="header-75-25-avatar-only"', 'account menu uses avatar-only 75/25 header layout marker');
has(accountMenu, 'manager-header-account-dock', 'account menu uses merged header account dock');
has(accountMenu, 'width: clamp(220px, 25vw, 360px)', 'account menu uses right-side 25 percent dock sizing');
has(accountMenu, 'justify-content: flex-end', 'account dock only exposes avatar on the right side');
has(accountMenu, 'manager-header-account-avatar', 'account menu exposes only the circle in the closed header');
has(accountMenu, 'manager-account-popover', 'account menu has popover panel');
has(accountMenu, 'manager-account-identity-card', 'account popover has professional identity card');
has(accountMenu, 'manager-account-primary-grid', 'account popover has primary action grid');
has(accountMenu, 'Manage access', 'account menu includes account management shortcut');
has(accountMenu, 'data-manager-canonical-switch="true"', 'account menu owns canonical switch marker');
has(accountMenu, 'data-manager-switch-visible-slot="account-popover"', 'switch action lives inside opened account popover');
has(accountMenu, 'Switch mode', 'account menu includes switch mode action');
has(accountMenu, 'action="/auth/sign-out"', 'account menu owns sign out action');
has(accountMenu, 'position: fixed', 'account menu is mounted in upper-right');
notHas(accountMenu, 'manager-top-account-left', 'old dock text area removed');
notHas(accountMenu, 'manager-top-icon-button', 'old header settings/switch icons removed');
notHas(accountMenu, 'manager-top-account-actions', 'old multi-icon header action group removed');
notHas(accountMenu, '⚙', 'settings icon removed from closed header');
notHas(accountMenu, '↔</Link>', 'switch icon removed from closed header');

has(admin, "{ href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }", '/admin keeps switch nav contract for account menu target');
has(workspace, "kind: 'workspace-switch' as const", '/manager-workspace keeps reverse switch nav contract for account menu target');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager account header contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager account header contract guard passed: ${checks.length} check(s).`);
