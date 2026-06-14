#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function run(command) {
  console.log(`\n▶ ${command}`);
  execSync(command, { stdio: 'inherit' });
}
function assertContains(path, term, label) { if (!existsSync(path)) throw new Error(`Missing file: ${path}`); const source = readFileSync(path, 'utf8'); if (!source.includes(term)) throw new Error(`${label}: missing ${term} in ${path}`); console.log(`✅ ${label}`); }
function assertNotContains(path, term, label) { if (!existsSync(path)) throw new Error(`Missing file: ${path}`); const source = readFileSync(path, 'utf8'); if (source.includes(term)) throw new Error(`${label}: forbidden ${term} in ${path}`); console.log(`✅ ${label}`); }
console.log('\n=== Manager local dev readiness ===');
run('node scripts/apply-manager-template-workspace-state-wiring.mjs');
run('node scripts/apply-manager-workspace-nav-wiring.mjs');
run('node scripts/apply-manager-template-generation-wiring.mjs');
assertContains('app/admin/page.tsx', 'ManagerConsoleShell', '/admin uses shared manager shell');
assertContains('app/admin/page.tsx', 'mode="operations"', '/admin is operations mode');
assertNotContains('app/admin/page.tsx', "import ManagerWorkspaceSwitch from '../../components/ManagerWorkspaceSwitch';", '/admin has no stale direct switch import after shell migration');
assertContains('app/admin/access/page.tsx', 'ManagerWorkspaceSwitch', '/admin/access is switch-ready after nav wiring');
assertContains('components/AccessAuditView.tsx', 'ManagerWorkspaceSwitch', '/admin/audit is switch-ready');
assertContains('components/GenerationReportView.tsx', 'ManagerWorkspaceSwitch', '/admin/reports is switch-ready');
assertContains('app/manager-workspace/page.tsx', 'ManagerConsoleShell', '/manager-workspace uses shared shell');
assertContains('app/manager-workspace/page.tsx', 'ManagerTemplateWorkspaceClient', '/manager-workspace uses client-style upload workflow');
assertNotContains('app/manager-workspace/page.tsx', 'TemplateUploadCard', '/manager-workspace has no raw upload cards');
assertNotContains('app/manager-workspace/page.tsx', 'encType="multipart/form-data"', '/manager-workspace has no raw upload forms');
assertContains('components/ManagerTemplateWorkspaceClient.tsx', 'TemplateProgressiveWorkspace', 'manager upload workflow reuses client progressive workflow');
assertContains('components/ManagerTemplateWorkspaceClient.tsx', 'ManagerTemplateLibraryStatus', 'manager workspace shows active template summary');
assertContains('components/ManagerTemplateWorkspaceClient.tsx', 'async function handleExhibitsChange() { await loadAssets(round); }', 'manager workspace refetches after exhibit mutation');
assertContains('components/TemplatePacketConfigurator.tsx', 'resolveTemplateAuthority', 'template configurator uses authority model');
assertContains('components/TemplatePacketConfigurator.tsx', 'summarizeTemplateQuality', 'template cards show quality summary');
assertContains('components/TemplateProgressiveWorkspace.tsx', 'data-template-authority-mode', 'progressive UX exposes authority mode');
assertContains('components/LetterGeneratorWorkspaceV2.tsx', 'resolveManagerTemplateFile', 'generation uses manager template resolver');
assertContains('components/LetterGeneratorWorkspaceV2.tsx', 'MANAGER_TEMPLATE_ASSET', 'generation tracks manager template source');
run('node scripts/manager-workspace-guard.mjs');
run('node scripts/manager-template-roadmap-guard.mjs');
console.log('\n✅ Manager local dev UI is ready. Restart dev and open /admin or /manager-workspace on port 3000.');
