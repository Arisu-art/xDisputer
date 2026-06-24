#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) { if (!existsSync(path)) { failures.push(`Missing required file: ${path}`); return ''; } return readFileSync(path, 'utf8'); }
function has(path, term) { const source = read(path); if (source && !source.includes(term)) failures.push(`${path} must include ${term}`); }
function notHas(path, term) { const source = read(path); if (source && source.includes(term)) failures.push(`${path} must not include ${term}`); }
function before(path, first, second, message) { const source = read(path); const a = source.indexOf(first); const b = source.indexOf(second); if (a < 0 || b < 0 || a >= b) failures.push(`${path}: ${message}`); }

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
  'components/templates/workspace/TemplateRoundOnlyLibrary.tsx',
  'components/templates/workspace/TemplateStudioHub.tsx',
  'components/templates/workspace/GenerationEngineHub.tsx',
  'components/templates/workspace/TemplateReadinessCard.tsx',
  'components/templates/workspace/TemplateRuleEditor.tsx',
  'components/templates/workspace/TemplateRenderPlanPreview.tsx',
  'app/manager-workspace/page.tsx',
  'app/manager-workspace/studio/page.tsx',
  'app/manager-workspace/engine/page.tsx',
  'app/api/template-assets/route.ts',
  'app/template-workspace-hubs.css',
  'app/manager-template-library-upload.css'
]) read(path);

has('components/templates/workspace/TemplateWorkspaceShell.tsx', 'templateWorkspaceNavForPath');
has('app/manager-workspace/page.tsx', 'TemplateLibraryHub');
has('app/manager-workspace/studio/page.tsx', 'TemplateStudioHub');
has('app/manager-workspace/engine/page.tsx', 'GenerationEngineHub');
notHas('app/manager-workspace/page.tsx', "navItemsForDomain('manager-authoring'");
has('app/layout.tsx', "import './template-workspace-hubs.css';");
has('app/layout.tsx', "import './manager-template-library-upload.css';");
before('app/layout.tsx', './template-workspace-hubs.css', './manager-template-library-upload.css', 'manager Template Library upload CSS must load after base template workspace CSS');

has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'templateSlots', 'Template Library must own upload slot definitions.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'selectedSlotKey', 'Template Library must use native selection mode.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'template-slot-selection-list', 'Template Library must render a slot selection list.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'template-selected-upload-card', 'Template Library must render one selected upload card.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'uploadTemplate', 'Template Library must expose manager template upload handler.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "fetch('/api/template-assets'", 'Template Library upload must post to template-assets API.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "method: 'DELETE'", 'Template Library must support removing active templates.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "x-template-upload': 'workspace'", 'Template Library upload must request JSON workspace responses.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'payloadData', 'Template Library GET must support service-result data envelope.');
has('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-template-library-minimal="selection-upload"', 'Template Library must expose selection upload marker.');
notHas('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-template-library-minimal="round-only"', 'Template Library must not be round-only without upload.');
notHas('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', '<div className="template-upload-slot-grid">', 'Template Library must not show all upload cards at once.');
has('app/manager-template-library-upload.css', 'native selection upload layout', 'Template Library upload CSS must declare native selection ownership.');
has('app/manager-template-library-upload.css', '.template-library-selection-grid', 'Template Library layout must use the selection grid.');
has('app/manager-template-library-upload.css', '.template-slot-selection-list', 'Template Library layout must style slot selection.');
has('app/manager-template-library-upload.css', '.template-selected-upload-card', 'Template Library layout must style the focused upload card.');
has('app/manager-template-library-upload.css', '@media (max-width: 1320px)', 'Template Library layout must respond on narrower screens.');
has('app/api/template-assets/route.ts', 'export async function POST', 'template-assets API must support POST upload.');
has('app/api/template-assets/route.ts', 'request.formData()', 'template-assets API must read multipart form data.');
has('app/api/template-assets/route.ts', 'uploadManagerTemplateObject', 'template-assets API must upload to manager template storage.');

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
