#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }
function count(source, term, expected, label) { const actual = source.split(term).length - 1; checks.push({ ok: actual === expected, label: `${label} (${actual}/${expected})` }); }

const shell = read('components/ManagerConsoleShell.tsx');
const accountMenu = read('components/ManagerAccountMenu.tsx');
const admin = read('app/admin/page.tsx');
const workspace = read('app/manager-workspace/page.tsx');

has(shell, "import ManagerAccountMenu from './ManagerAccountMenu';", 'shell imports Gmail-style top account menu');
has(shell, '<ManagerAccountMenu email={email} accountLabel={accountLabel} mode={mode} switchTarget={switchTarget} switchTargetLabel={switchTargetLabel} />', 'shell mounts top account menu');
has(shell, 'function switchHref', 'shell uses direct switch href helper');
has(shell, 'function switchLabel', 'shell uses direct switch label helper');
has(shell, 'data-manager-switch-visible-slot="plain-nav-button"', 'shell renders plain switch nav button');
has(shell, 'data-manager-canonical-switch="true"', 'shell preserves canonical switch marker');
has(shell, '>\n          Switch mode\n        </a>', 'switch is rendered as plain visible text inside anchor');
has(shell, "mode === 'workspace' ? '/admin' : '/manager-workspace'", 'plain switch targets correct route by shell mode');
has(shell, "navItems.filter((item) => item.kind !== 'workspace-switch')", 'shell removes duplicate workspace-switch nav items');
notHas(shell, 'WorkspaceSwitchAnchor', 'shell no longer uses complex switch component');
notHas(shell, 'manager-workspace-nav-switch', 'shell no longer uses legacy switch class');
notHas(shell, 'top-visible-switch-mode', 'shell no longer uses hidden-prone top-visible class');
notHas(shell, 'switchLinkStyle', 'shell no longer uses complex inline switch style object');
notHas(shell, 'action="/auth/sign-out" method="post"><button type="submit">Sign out</button>', 'sign out moved out of left sidebar footer');

has(accountMenu, "'use client';", 'account menu is client-side interactive');
has(accountMenu, 'data-manager-account-menu="true"', 'account menu exposes stable marker');
has(accountMenu, 'manager-account-popover', 'account menu has popover panel');
has(accountMenu, 'Manage account access', 'account menu includes account management shortcut');
has(accountMenu, 'Switch mode ·', 'account menu includes switch mode action');
has(accountMenu, 'action="/auth/sign-out"', 'account menu owns sign out action');
has(accountMenu, 'position: fixed', 'account menu is mounted in upper-right');

has(admin, "{ href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }", '/admin keeps switch nav contract for dedupe');
has(workspace, "kind: 'workspace-switch' as const", '/manager-workspace keeps reverse switch nav contract for dedupe');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager visible switch/account contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager visible switch/account contract guard passed: ${checks.length} check(s).`);
