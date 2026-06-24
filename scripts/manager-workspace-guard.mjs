#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }

if (existsSync('scripts/apply-manager-workspace-nav-wiring.mjs')) {
  execSync('node scripts/apply-manager-workspace-nav-wiring.mjs', { stdio: 'inherit' });
  execSync('node scripts/apply-manager-workspace-nav-wiring.mjs', { stdio: 'inherit' });
}

const page = read('app/manager-workspace/page.tsx');
const shell = read('components/templates/workspace/TemplateWorkspaceShell.tsx');
const library = read('components/templates/workspace/TemplateRoundOnlyLibrary.tsx');
const libraryCss = read('app/manager-template-library-upload.css');
const switchComponent = read('components/ManagerWorkspaceSwitch.tsx');
const routes = read('lib/saas/routes.ts');
const admin = read('app/admin/page.tsx');
const access = read('app/admin/access/page.tsx');
const audit = read('components/AccessAuditView.tsx');
const reports = read('components/GenerationReportView.tsx');
const layout = read('app/layout.tsx');
const api = read('app/api/template-assets/route.ts');
const pkg = read('package.json');

has(page, 'TemplateWorkspaceShell', 'manager workspace uses template workspace shell');
has(page, 'TemplateLibraryHub', 'manager workspace renders Template Library hub');
has(shell, 'ManagerConsoleShell', 'template shell uses shared manager shell');
has(shell, 'mode="workspace"', 'template shell runs in manager workspace mode');
has(switchComponent, 'manager-workspace-nav-switch', 'switch component exposes visible nav CTA variant');
has(routes, '/manager-workspace', 'manager workspace route is protected');
has(admin, 'ManagerConsoleShell', '/admin uses shared manager shell');
has(admin, 'mode="operations"', '/admin shell is operations mode');
has(access, '<ManagerWorkspaceSwitch />', '/admin/access sidebar directly renders switch');
has(audit, "{scope === 'manager' && <ManagerWorkspaceSwitch />}", '/admin/audit sidebar renders switch');
has(reports, "{scope === 'manager' && <ManagerWorkspaceSwitch />}", '/admin/reports sidebar renders switch');
has(layout, "import './manager-template-library-upload.css';", 'layout loads manager template upload CSS');
has(library, 'templateSlots', 'Template Library exposes upload slots');
has(library, 'uploadTemplate', 'Template Library upload handler exists');
has(library, "fetch('/api/template-assets'", 'Template Library posts uploads to API');
has(library, 'data-template-library-minimal="upload-enabled"', 'Template Library is upload-enabled');
notHas(library, 'data-template-library-minimal="round-only"', 'Template Library must not be round-only');
has(libraryCss, '.template-upload-slot-grid', 'Template Library upload layout exists');
has(api, 'request.formData()', 'template-assets API reads multipart uploads');
has(api, 'uploadManagerTemplateObject', 'template-assets API writes manager template files');
has(pkg, 'template-workspace:guard', 'package keeps template workspace guard wired');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager workspace guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager workspace guard passed: ${checks.length} check(s).`);
