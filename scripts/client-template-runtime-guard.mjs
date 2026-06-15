#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) { if (!existsSync(path)) { failures.push(`Missing required file: ${path}`); return ''; } return readFileSync(path, 'utf8'); }
function has(path, term) { const source = read(path); if (source && !source.includes(term)) failures.push(`${path} must include ${term}`); }

[
  'lib/client-template-runtime/client-template-types.ts',
  'lib/client-template-runtime/client-template-context.ts',
  'lib/client-template-runtime/client-template-assignment.ts',
  'lib/client-template-runtime/client-template-source-mapping.ts',
  'lib/client-template-runtime/client-template-rule-application.ts',
  'lib/client-template-runtime/client-template-generation-gate.ts',
  'lib/client-template-runtime/client-template-output-limit.ts',
  'lib/client-template-runtime/client-template-review-packet.ts',
  'lib/client-template-runtime/client-template-supporting-documents.ts',
  'lib/client-template-runtime/client-template-generation-orchestrator.ts',
  'lib/client-template-runtime/index.ts',
  'components/client-template-runtime/ClientTemplateRuntimeDashboard.tsx',
  'components/client-template-runtime/ClientTemplateAssignmentCard.tsx',
  'components/client-template-runtime/ClientOutputLimitCard.tsx',
  'components/client-template-runtime/ClientSourceMappingCard.tsx',
  'components/client-template-runtime/ClientManagerTemplatePreview.tsx',
  'components/client-template-runtime/ClientReviewPacketScopePanel.tsx',
  'components/client-template-runtime/ClientGeneratedFilesReviewPanel.tsx',
  'components/client-template-runtime/ClientGenerationActionBar.tsx',
  'app/api/client-template-runtime/context/route.ts',
  'app/api/client-template-runtime/generate/route.ts',
  'app/client-template-runtime.css'
].forEach(read);

has('app/workspace/page.tsx', 'ClientTemplateRuntimeDashboard');
has('app/workspace/page.tsx', 'getClientTemplateRuntimeContext');
has('lib/client-template-runtime/client-template-context.ts', 'loadEnabledDynamicTemplateRules');
has('lib/client-template-runtime/client-template-rule-application.ts', 'applyManagerRulesToClientData');
has('lib/client-template-runtime/client-template-generation-gate.ts', 'assertClientCanGenerate');
has('lib/client-template-runtime/client-template-generation-orchestrator.ts', 'generateClientLettersFromManagerTemplate');
has('app/api/client-template-runtime/generate/route.ts', 'generateClientLettersFromManagerTemplate');
has('app/globals.css', "@import './client-template-runtime.css';");
has('app/api/template-assets/route.ts', "revalidatePath('/workspace')");
has('package.json', 'client-template:guard');

if (failures.length) {
  console.error('\nClient template runtime guard failed.');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Client template runtime guard passed.');
