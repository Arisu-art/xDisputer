#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const checks = [];
function read(path) { const ok = existsSync(path); checks.push({ ok, label: `file exists: ${path}` }); return ok ? readFileSync(path, 'utf8') : ''; }
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }
function count(source, term, expected, label) { const actual = source.split(term).length - 1; checks.push({ ok: actual === expected, label: `${label} (${actual}/${expected})` }); }

for (const script of ['scripts/apply-manager-template-generation-wiring.mjs', 'scripts/apply-manager-template-workspace-state-wiring.mjs']) {
  if (existsSync(script)) {
    execSync(`node ${script}`, { stdio: 'inherit' });
    execSync(`node ${script}`, { stdio: 'inherit' });
  }
}

const managerPage = read('app/manager-workspace/page.tsx');
const managerClient = read('components/ManagerTemplateWorkspaceClient.tsx');
const packet = read('components/TemplatePacketConfigurator.tsx');
const progressive = read('components/TemplateProgressiveWorkspace.tsx');
const shell = read('components/ManagerConsoleShell.tsx');
const authority = read('lib/manager-template-authority.ts');
const resolver = read('lib/manager-template-file-resolver.ts');
const workspace = read('components/LetterGeneratorWorkspaceV2.tsx');
const pkg = read('package.json');

has(managerPage, 'ManagerConsoleShell', 'manager workspace uses shared shell');
has(managerPage, 'ManagerTemplateWorkspaceClient', 'manager workspace uses client-like flow');
has(managerPage, "session.isMaster ? '/master' : '/admin'", 'manager workspace switch target is role-aware');
notHas(managerPage, 'TemplateUploadCard', 'manager workspace has no raw upload cards');
notHas(managerPage, 'encType="multipart/form-data"', 'manager workspace has no raw multipart upload forms');

has(managerClient, 'TemplateProgressiveWorkspace', 'manager upload flow reuses progressive client template workflow');
has(managerClient, 'MANAGER_TEMPLATE_ASSET', 'manager upload flow uses manager template source');
has(managerClient, 'ManagerTemplateLibraryStatus', 'manager upload flow shows active template library status');
has(managerClient, 'managerTemplateScope={managerTemplateScope}', 'manager client passes only verified template scope');
notHas(managerClient, 'canManageTemplates: true', 'manager client has no fake writable fallback scope');
has(managerClient, 'handleExhibitsHydrated', 'manager client separates hydration from mutation refresh');
has(managerClient, 'handleTemplateMutation', 'manager client reloads assets only after template mutation');
notHas(managerClient, 'async function handleExhibitsChange() { await loadAssets(round); }', 'manager client no longer reloads on exhibit hydration');

has(packet, 'ManagerTemplateScopeUi', 'packet configurator accepts manager scope');
has(packet, 'canManageTemplates', 'packet configurator gates upload controls');
has(packet, 'resolveTemplateAuthority', 'packet configurator uses authority model');
has(packet, 'Manager controlled', 'packet configurator renders locked manager-controlled client actions');
has(packet, 'pendingActionKey', 'packet configurator tracks per-slot pending actions');
has(packet, 'disabled={actionInFlight}', 'packet configurator disables repeated actions while upload/remove is pending');
has(packet, 'onTemplateMutation?.()', 'packet configurator refreshes parent only after upload/remove mutation');
has(packet, 'data-template-authority-mode={authority.mode}', 'packet configurator exposes authority mode');
has(packet, 'summarizeTemplateQuality', 'packet configurator renders template quality summaries');
count(packet, 'const readOnlyReason = managerTemplateLockMessage(managerTemplateScope);', 1, 'packet configurator has one readOnlyReason');

has(progressive, 'data-template-authority-mode', 'progressive template UX exposes authority mode');
has(progressive, 'onTemplateMutation?', 'progressive template UX wires mutation callback');
has(authority, "'CLIENT_READONLY'", 'authority model defines client read-only mode');
has(authority, "'MANAGER_EDIT'", 'authority model defines manager edit mode');
has(shell, 'data-manager-canonical-switch="true"', 'shared manager shell owns canonical switch mode');
has(shell, 'switchCopyForTarget', 'shared manager shell uses target-aware switch copy');
has(shell, 'data-manager-switch-target-label', 'shared manager shell exposes switch target label');
has(resolver, 'resolveManagerTemplateFile', 'template resolver exposes manager file resolver');
has(resolver, 'allowLocalFallback', 'template resolver explicitly controls local fallback');
has(workspace, 'resolveManagerTemplateFile', 'client workspace generation uses manager resolver');
has(workspace, 'MANAGER_TEMPLATE_ASSET', 'client workspace marks manager template source');
has(workspace, 'managerTemplateScope', 'client workspace tracks manager template scope');
has(pkg, 'apply-manager-template-generation-wiring.mjs', 'dev/typecheck/build apply generation wiring');
has(pkg, 'apply-manager-template-workspace-state-wiring.mjs', 'dev/typecheck/build apply workspace state wiring');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nManager template roadmap guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nManager template roadmap guard passed: ${checks.length} check(s).`);
