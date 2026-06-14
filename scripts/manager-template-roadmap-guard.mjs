#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }
function count(source, term, expected, label) { const actual = source.split(term).length - 1; checks.push({ ok: actual === expected, label: `${label} (${actual}/${expected})` }); }

for (const script of ['scripts/apply-manager-template-generation-wiring.mjs']) {
  if (existsSync(script)) {
    execSync(`node ${script}`, { stdio: 'inherit' });
    execSync(`node ${script}`, { stdio: 'inherit' });
  }
}

const managerPage = read('app/manager-workspace/page.tsx');
const managerClient = read('components/ManagerTemplateWorkspaceClient.tsx');
const packet = read('components/TemplatePacketConfigurator.tsx');
const shell = read('components/ManagerConsoleShell.tsx');
const resolver = read('lib/manager-template-file-resolver.ts');
const workspace = read('components/LetterGeneratorWorkspaceV2.tsx');
const pkg = read('package.json');

has(managerPage, 'ManagerConsoleShell', 'manager workspace uses shared shell');
has(managerPage, 'ManagerTemplateWorkspaceClient', 'manager workspace uses client-like flow');
notHas(managerPage, 'TemplateUploadCard', 'manager workspace has no raw upload cards');
notHas(managerPage, 'encType="multipart/form-data"', 'manager workspace has no raw multipart upload forms');
has(managerClient, 'TemplateProgressiveWorkspace', 'manager upload flow reuses progressive client template workflow');
has(managerClient, 'MANAGER_TEMPLATE_ASSET', 'manager upload flow uses manager template source');
has(packet, 'ManagerTemplateScopeUi', 'packet configurator accepts manager scope');
has(packet, 'canManageTemplates', 'packet configurator gates upload controls');
has(packet, 'Read-only client mode', 'packet configurator has client read-only UX');
count(packet, 'const readOnlyReason = managerTemplateLockMessage(managerTemplateScope);', 1, 'packet configurator has one readOnlyReason');
has(shell, 'ManagerWorkspaceSwitch', 'shared manager shell owns switch mode');
has(resolver, 'resolveManagerTemplateFile', 'template resolver exposes manager file resolver');
has(resolver, 'allowLocalFallback', 'template resolver explicitly controls local fallback');
has(workspace, 'resolveManagerTemplateFile', 'client workspace generation uses manager resolver');
has(workspace, 'MANAGER_TEMPLATE_ASSET', 'client workspace marks manager template source');
has(workspace, 'managerTemplateScope', 'client workspace tracks manager template scope');
has(pkg, 'apply-manager-template-generation-wiring.mjs', 'dev/typecheck/build apply generation wiring');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager template roadmap guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager template roadmap guard passed: ${checks.length} check(s).`);
