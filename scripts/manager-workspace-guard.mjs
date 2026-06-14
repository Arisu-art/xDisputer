#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function count(source, term, expected, label) { const actual = source.split(term).length - 1; checks.push({ ok: actual === expected, label: `${label} (${actual}/${expected})` }); }

if (existsSync('scripts/apply-manager-workspace-nav-wiring.mjs')) {
  execSync('node scripts/apply-manager-workspace-nav-wiring.mjs', { stdio: 'inherit' });
  execSync('node scripts/apply-manager-workspace-nav-wiring.mjs', { stdio: 'inherit' });
}

const page = read('app/manager-workspace/page.tsx');
const routes = read('lib/saas/routes.ts');
const nav = read('app/admin/page.tsx');
const css = read('app/globals.css');
const pkg = read('package.json');

has(page, 'Manager workspace', 'manager workspace page has environment label');
has(page, 'Upload manager defaults', 'manager workspace has upload area');
has(page, '/api/template-assets', 'manager workspace uploads through manager template API');
has(page, 'TemplateUploadCard', 'manager workspace has per-round upload cards');
has(page, 'managerTemplateSlotKey', 'manager workspace shows template slot keys');
has(routes, '/manager-workspace', 'manager workspace route is protected');
has(nav, 'manager-workspace-switch-card', 'operations sidebar has bottom switch card');
has(nav, 'Switch mode', 'operations sidebar switch has visible label');
has(nav, 'Manager workspace</small>', 'operations sidebar switch describes target environment');
count(nav, 'manager-workspace-switch-card', 1, 'operations sidebar has one switch card');
has(css, 'managerSwitchPulse', 'switch has pulse animation');
has(css, 'managerSwitchShine', 'switch has shine animation');
has(css, 'manager-workspace-switch-button', 'switch button styling exists');
has(pkg, 'apply-manager-workspace-nav-wiring.mjs', 'predev applies manager workspace switch wiring');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) process.exit(1);
console.log(`\nManager workspace guard passed: ${checks.length} check(s).`);
