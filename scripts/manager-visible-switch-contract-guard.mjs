#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }
function count(source, term, expected, label) { const actual = source.split(term).length - 1; checks.push({ ok: actual === expected, label: `${label} (${actual}/${expected})` }); }

const shell = read('components/ManagerConsoleShell.tsx');
const admin = read('app/admin/page.tsx');
const workspace = read('app/manager-workspace/page.tsx');

has(shell, "kind?: 'link' | 'workspace-switch'", 'shell supports workspace switch item kind');
has(shell, "navItems.filter((item) => item.kind !== 'workspace-switch')", 'shell removes switch items from main nav');
has(shell, 'visibleSwitchTarget', 'shell resolves top visible switch target');
has(shell, '<WorkspaceSwitchAnchor href={visibleSwitchTarget}', 'shell renders switch directly under sidebar section heading');
has(shell, 'top-visible-switch-mode', 'shell uses top visible switch class');
has(shell, 'style={visibleSwitchStyle}', 'shell uses inline visible switch styles');
has(shell, 'data-manager-canonical-switch="true"', 'shell renders canonical switch marker');
count(shell, 'data-manager-canonical-switch="true"', 1, 'shell owns one canonical switch marker');
notHas(shell, 'accountSwitchTarget', 'shell no longer depends on account footer for switch visibility');
notHas(shell, '<WorkspaceSwitchAnchor href={accountSwitchTarget}', 'shell no longer renders switch inside cramped account block');
has(admin, "{ href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }", '/admin declares manager workspace switch target');
has(workspace, "kind: 'workspace-switch' as const", '/manager-workspace declares role-aware reverse switch target');
notHas(admin, '<ManagerWorkspaceSwitch />', '/admin does not render ad hoc switch');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager visible switch contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager visible switch contract guard passed: ${checks.length} check(s).`);
