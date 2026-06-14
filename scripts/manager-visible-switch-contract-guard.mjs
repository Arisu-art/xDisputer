#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }

const shell = read('components/ManagerConsoleShell.tsx');
const admin = read('app/admin/page.tsx');
const workspace = read('app/manager-workspace/page.tsx');
const switchComponent = read('components/ManagerWorkspaceSwitch.tsx');

has(shell, "kind?: 'link' | 'workspace-switch'", 'shell nav contract supports workspace switch item kind');
has(shell, "item.kind === 'workspace-switch'", 'shell renders explicit workspace switch item');
has(shell, 'data-manager-shell-nav="true"', 'shell marks visible sidebar nav with stable selector');
has(shell, '!hasExplicitSwitch', 'shell has fallback switch if page forgets explicit switch item');
has(admin, "{ href: '/manager-workspace', label: 'Switch mode', kind: 'workspace-switch' as const }", '/admin declares manager workspace switch in nav contract');
has(workspace, "{ href: '/admin', label: 'Switch mode', kind: 'workspace-switch' as const }", '/manager-workspace declares operations switch in nav contract');
has(switchComponent, "variant?: 'card' | 'nav'", 'switch supports visible nav variant');
has(switchComponent, 'manager-workspace-nav-switch', 'switch nav variant has stable visible class');
notHas(admin, "<ManagerWorkspaceSwitch />", '/admin does not use hidden ad hoc switch placement');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager visible switch contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager visible switch contract guard passed: ${checks.length} check(s).`);
