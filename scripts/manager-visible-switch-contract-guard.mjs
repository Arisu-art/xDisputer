#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }

const shell = read('components/ManagerConsoleShell.tsx');
const accountMenu = read('components/ManagerAccountMenu.tsx');
const accountCss = read('app/account-menu-system.css');
const admin = read('app/admin/page.tsx');
const workspace = read('app/manager-workspace/page.tsx');
const templateWorkspace = read('components/ManagerTemplateWorkspaceClient.tsx');

has(shell, "import ManagerAccountMenu from './ManagerAccountMenu';", 'shell imports top account menu');
has(shell, '<section className="admin-monitor-main native-console-main" data-console-header-grid="true">', 'shell uses header-flow grid main section');
has(shell, '<ManagerAccountMenu email={email} accountLabel={accountLabel} mode={mode} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />', 'shell mounts account menu inside header grid flow');
has(shell, "navItems.filter((item) => item.kind !== 'workspace-switch')", 'shell removes duplicate workspace-switch nav items');
has(shell, 'data-manager-shell-nav="true"', 'shell keeps standard sidebar nav renderer');
notHas(shell, '<ManagerAccountMenu email={email} accountLabel={accountLabel} mode={mode} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />\n    <aside', 'account menu no longer renders before sidebar as a frozen overlay');
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
has(accountMenu, 'data-manager-account-state={open ? \'open\' : \'closed\'}', 'account menu exposes open/closed state for anchored overlay');
has(accountMenu, 'manager-header-account-dock', 'account menu uses merged header account dock');
has(accountMenu, 'manager-header-account-avatar', 'account menu exposes only the circle in the closed header');
has(accountMenu, 'manager-account-popover', 'account menu has popover panel');
has(accountMenu, 'manager-account-identity-panel', 'account popover has vertical identity panel');
has(accountMenu, 'manager-account-action-list', 'account popover has vertical action list');
has(accountMenu, 'Manage access', 'account menu includes account management shortcut');
has(accountMenu, 'data-manager-canonical-switch="true"', 'account menu owns canonical switch marker');
has(accountMenu, 'data-manager-switch-visible-slot="account-popover"', 'switch action lives inside opened account popover');
has(accountMenu, 'Switch mode', 'account menu includes switch mode action');
has(accountMenu, 'action="/auth/sign-out"', 'account menu owns sign out action');
notHas(accountMenu, 'manager-top-account-left', 'old dock text area removed');
notHas(accountMenu, 'manager-top-icon-button', 'old header settings/switch icons removed');
notHas(accountMenu, 'manager-top-account-actions', 'old multi-icon header action group removed');
notHas(accountMenu, '⚙', 'settings icon removed from closed header');
notHas(accountMenu, '↔</Link>', 'switch icon removed from closed header');
notHas(accountMenu, 'manager-account-primary-grid', 'old two-column primary grid removed');
notHas(accountMenu, 'manager-account-route-list', 'old duplicated route list removed');

has(accountCss, '--account-dock-width: clamp(88px, 7.2vw, 112px)', 'account CSS uses compact avatar header column');
has(accountCss, 'position: relative !important', 'account dock is header-flow relative, not frozen fixed');
has(accountCss, 'overflow: visible !important', 'account dock allows anchored overlay expansion');
has(accountCss, '[data-manager-account-state="open"]', 'account CSS raises open dock above page content');
has(accountCss, 'top: 0;', 'account popover opens from same header position');
has(accountCss, 'transform-origin: top right', 'account popover expands from avatar dock corner');
has(accountCss, 'accountPopoverExpandIn', 'account popover uses anchored open animation');
notHas(accountCss, 'top: calc(100% + 12px)', 'account popover no longer drops below header dock');
notHas(accountCss, 'position: fixed', 'account CSS no longer freezes the avatar dock');
notHas(accountCss, 'rgba(124, 58, 237, .36)', 'violet account dock border removed');
notHas(accountCss, 'border-left: 4px solid rgba(124', 'thick violet left border removed');

notHas(templateWorkspace, 'merged-template-command-metrics', 'template workspace compact summary chips removed');
notHas(templateWorkspace, 'manager-round-chip', 'template selected-round compact chip removed');
notHas(templateWorkspace, 'Active templates', 'template active summary chip removed');
notHas(templateWorkspace, 'Storage proof', 'template storage proof chip removed');

has(admin, "{ href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }", '/admin keeps switch nav contract for account menu target');
has(workspace, "kind: 'workspace-switch' as const", '/manager-workspace keeps reverse switch nav contract for account menu target');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager account header contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager account header contract guard passed: ${checks.length} check(s).`);
