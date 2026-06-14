#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }

if (existsSync('scripts/apply-manager-workspace-nav-wiring.mjs')) {
  execSync('node scripts/apply-manager-workspace-nav-wiring.mjs', { stdio: 'inherit' });
  execSync('node scripts/apply-manager-workspace-nav-wiring.mjs', { stdio: 'inherit' });
}

const page = read('app/manager-workspace/page.tsx');
const routes = read('lib/saas/routes.ts');
const nav = read('app/admin/page.tsx');

has(page, 'Manager workspace', 'manager workspace page has environment label');
has(page, 'Upload manager defaults', 'manager workspace has upload area');
has(page, '/api/template-assets', 'manager workspace uploads through manager template API');
has(page, 'TemplateUploadCard', 'manager workspace has per-round upload cards');
has(page, 'managerTemplateSlotKey', 'manager workspace shows template slot keys');
has(routes, '/manager-workspace', 'manager workspace route is protected');
has(nav, 'href="/manager-workspace"', 'operations console links to manager workspace');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) process.exit(1);
console.log(`\nManager workspace guard passed: ${checks.length} check(s).`);
