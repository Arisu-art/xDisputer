#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) { if (!existsSync(path)) { failures.push(`Missing required file: ${path}`); return ''; } return readFileSync(path, 'utf8'); }
function has(path, text) { const source = read(path); if (source && !source.includes(text)) failures.push(`${path} must include: ${text}`); }
function notHas(path, text) { const source = read(path); if (source && source.includes(text)) failures.push(`${path} must not include: ${text}`); }

has('lib/template-execution/canonical-source-model.ts', 'class CanonicalSourceModel');
has('lib/template-execution/manager-template-resolver.ts', 'class ManagerTemplateResolver');
has('lib/template-execution/dynamic-template-engine.ts', 'renderWithBestTemplateEngine');
has('lib/template-execution/legacy-renderer-adapter.ts', 'renderLegacyLetterAdapter');
has('lib/template-execution/template-execution-guards.ts', 'assertTemplateExecutionReady');
has('lib/template-execution/template-execution-orchestrator.ts', 'executeTemplateGeneration');
has('lib/dynamic-template/mapping-engine.ts', 'createCanonicalSourceModel');
has('components/LetterGeneratorWorkspaceV2.tsx', 'executeTemplateGeneration({');
has('components/LetterGeneratorWorkspaceV2.tsx', 'TemplateExecutionOrchestrator');
notHas('components/LetterGeneratorWorkspaceV2.tsx', 'renderReferenceDisputeDocx(');
notHas('components/LetterGeneratorWorkspaceV2.tsx', 'renderLatePaymentReference(');
has('components/console/RenderDebugger.tsx', '__xdisputerTemplateExecution');
has('components/console/ui-shell-registry.ts', 'templateExecutionStore');
notHas('scripts/manager-template-roadmap-guard.mjs', 'execSync(`node scripts/apply-');
notHas('app/api/system/source-sync/route.ts', 'apply-manager-workspace-nav-wiring.mjs');

if (failures.length) {
  console.error('\nTemplate execution guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Template execution guard passed.');
