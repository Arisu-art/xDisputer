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
const clientFlow = read('components/ManagerTemplateWorkspaceClient.tsx');
const switchComponent = read('components/ManagerWorkspaceSwitch.tsx');
const routes = read('lib/saas/routes.ts');
const admin = read('app/admin/page.tsx');
const access = read('app/admin/access/page.tsx');
const audit = read('components/AccessAuditView.tsx');
const reports = read('components/GenerationReportView.tsx');
const pkg = read('package.json');

has(page, 'ManagerTemplateWorkspaceClient', 'manager workspace uses client-like template workflow component');
has(page, '<ManagerWorkspaceSwitch target="/admin" reverse />', 'manager workspace has reverse switch to operations');
has(clientFlow, 'TemplateProgressiveWorkspace', 'manager upload UX reuses client workspace progressive template workflow');
has(clientFlow, '/api/template-assets?round=', 'manager upload workflow loads manager-scoped template API');
has(clientFlow, 'MANAGER_TEMPLATE_ASSET', 'manager upload workflow uses manager template source');
has(switchComponent, 'manager-workspace-switch-button', 'switch button component exists');
has(switchComponent, 'managerSwitchPulse', 'switch pulse animation exists');
has(switchComponent, 'managerSwitchShine', 'switch shine animation exists');
has(routes, '/manager-workspace', 'manager workspace route is protected');
has(admin, '<ManagerWorkspaceSwitch />', '/admin sidebar directly renders switch');
has(access, '<ManagerWorkspaceSwitch />', '/admin/access sidebar directly renders switch');
has(audit, "{scope === 'manager' && <ManagerWorkspaceSwitch />}", '/admin/audit sidebar renders switch');
has(reports, "{scope === 'manager' && <ManagerWorkspaceSwitch />}", '/admin/reports sidebar renders switch');
has(pkg, 'apply-manager-workspace-nav-wiring.mjs', 'predev applies manager workspace nav wiring');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) process.exit(1);
console.log(`\nManager workspace guard passed: ${checks.length} check(s).`);
