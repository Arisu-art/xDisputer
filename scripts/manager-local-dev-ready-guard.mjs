#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function run(command) {
  console.log(`\n▶ ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function assertContains(path, term, label) {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`);
  const source = readFileSync(path, 'utf8');
  if (!source.includes(term)) throw new Error(`${label}: missing ${term} in ${path}`);
  console.log(`✅ ${label}`);
}

console.log('\n=== Manager local dev readiness ===');

run('node scripts/apply-manager-workspace-nav-wiring.mjs');
run('node scripts/apply-manager-template-generation-wiring.mjs');

assertContains('app/admin/page.tsx', '<ManagerWorkspaceSwitch />', '/admin renders switch mode');
assertContains('app/admin/access/page.tsx', 'ManagerWorkspaceSwitch', '/admin/access is switch-ready after nav wiring');
assertContains('components/AccessAuditView.tsx', 'ManagerWorkspaceSwitch', '/admin/audit is switch-ready');
assertContains('components/GenerationReportView.tsx', 'ManagerWorkspaceSwitch', '/admin/reports is switch-ready');
assertContains('app/manager-workspace/page.tsx', 'ManagerConsoleShell', '/manager-workspace uses shared shell');
assertContains('app/manager-workspace/page.tsx', 'ManagerTemplateWorkspaceClient', '/manager-workspace uses client-style upload workflow');
assertContains('components/ManagerTemplateWorkspaceClient.tsx', 'TemplateProgressiveWorkspace', 'manager upload workflow reuses client progressive workflow');
assertContains('components/TemplatePacketConfigurator.tsx', 'ManagerTemplateScopeUi', 'template configurator is manager-authority aware');
assertContains('components/LetterGeneratorWorkspaceV2.tsx', 'resolveManagerTemplateFile', 'generation uses manager template resolver');
assertContains('components/LetterGeneratorWorkspaceV2.tsx', 'MANAGER_TEMPLATE_ASSET', 'generation tracks manager template source');

run('node scripts/manager-workspace-guard.mjs');
run('node scripts/manager-template-roadmap-guard.mjs');

console.log('\n✅ Manager local dev UI is ready. Restart dev and open /admin or /manager-workspace on port 3000.');
