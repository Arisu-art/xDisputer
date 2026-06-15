#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) { if (!existsSync(path)) { failures.push(`Missing required file: ${path}`); return ''; } return readFileSync(path, 'utf8'); }
function has(path, term) { const source = read(path); if (source && !source.includes(term)) failures.push(`${path} must include ${term}`); }
function notHas(path, term) { const source = read(path); if (source && source.includes(term)) failures.push(`${path} must not include ${term}`); }

const nav = read('lib/templates/workspace/template-workspace-navigation.ts');
const contract = read('lib/templates/workspace/template-workspace-contract.ts');
const libraryService = read('lib/templates/workspace/template-library-service.ts');
const studioService = read('lib/templates/workspace/template-studio-service.ts');
const engineService = read('lib/templates/workspace/generation-engine-service.ts');

for (const label of ['Template Library', 'Template Studio', 'Generation Engine']) {
  if (!nav.includes(label)) failures.push(`template workspace navigation missing ${label}`);
}
for (const stale of ['Contracts', 'Mappings', 'Quality', 'Releases', 'Automation']) {
  if (nav.includes(`label: '${stale}'`) || nav.includes(`shortLabel: '${stale}'`)) failures.push(`template workspace navigation must not expose old static label ${stale}`);
}
if (!nav.includes('TEMPLATE_WORKSPACE_NAV_ITEMS.length !== 3')) failures.push('template workspace nav must enforce exactly 3 hubs.');
if (!contract.includes('decideTemplateTokenBehavior')) failures.push('template workspace contract must include preserve/replace decision logic.');
if (!contract.includes('computeTemplateReadiness')) failures.push('template workspace contract must include readiness logic.');
if (!libraryService.includes('getManagerTemplateLibraryContext')) failures.push('template library service missing context builder.');
if (!studioService.includes('inspectTemplateStructure')) failures.push('template studio service missing structure inspector.');
if (!studioService.includes('buildTemplateRenderPlan')) failures.push('template studio service missing render plan builder.');
if (!engineService.includes('previewGenerationPlan')) failures.push('generation engine service missing preview plan.');

for (const path of [
  'components/templates/workspace/TemplateWorkspaceShell.tsx',
  'components/templates/workspace/TemplateLibraryHub.tsx',
  'components/templates/workspace/TemplateStudioHub.tsx',
  'components/templates/workspace/GenerationEngineHub.tsx',
  'components/templates/workspace/TemplateReadinessCard.tsx',
  'components/templates/workspace/TemplateRuleEditor.tsx',
  'components/templates/workspace/TemplateRenderPlanPreview.tsx',
  'app/manager-workspace/page.tsx',
  'app/manager-workspace/studio/page.tsx',
  'app/manager-workspace/engine/page.tsx',
  'app/template-workspace-hubs.css'
]) read(path);

has('components/templates/workspace/TemplateWorkspaceShell.tsx', 'templateWorkspaceNavForPath');
has('app/manager-workspace/page.tsx', 'TemplateLibraryHub');
has('app/manager-workspace/studio/page.tsx', 'TemplateStudioHub');
has('app/manager-workspace/engine/page.tsx', 'GenerationEngineHub');
notHas('app/manager-workspace/page.tsx', "navItemsForDomain('manager-authoring'");
has('app/layout.tsx', "import './template-workspace-hubs.css';");

const redirects = [
  ['app/manager-workspace/contracts/page.tsx', '/manager-workspace/studio'],
  ['app/manager-workspace/mappings/page.tsx', '/manager-workspace/studio'],
  ['app/manager-workspace/quality/page.tsx', '/manager-workspace/engine'],
  ['app/manager-workspace/releases/page.tsx', '/manager-workspace/engine'],
  ['app/manager-workspace/automation/page.tsx', '/manager-workspace/engine']
];
redirects.forEach(([path, target]) => {
  has(path, "import { redirect } from 'next/navigation';");
  has(path, `redirect('${target}')`);
  notHas(path, 'ConsolePanelRoutePage');
});

if (failures.length) {
  console.error('\nTemplate workspace contract guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Template workspace contract guard passed.');
