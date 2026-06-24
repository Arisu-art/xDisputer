#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, 'utf8') : (failures.push(`missing ${file}`), '');
const must = (file, marker, label) => { if (!read(file).includes(marker)) failures.push(`${file}: ${label}`); };
const mustNot = (file, marker, label) => { if (read(file).includes(marker)) failures.push(`${file}: ${label}`); };
const before = (file, first, second, label) => {
  const source = read(file);
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  if (a < 0 || b < 0 || a >= b) failures.push(`${file}: ${label}`);
};

for (const file of [
  'components/templates/workspace/TemplateRoundOnlyLibrary.tsx',
  'components/TemplateProgressiveWorkspace.tsx',
  'components/TemplatePacketConfigurator.tsx',
  'components/ManagerTemplateWorkspaceChrome.tsx',
  'app/api/template-assets/route.ts',
  'app/manager-template-library-upload.css',
  'app/layout.tsx',
  'app/manager-workspace/page.tsx',
  'components/templates/workspace/TemplateWorkspaceShell.tsx',
  'lib/templates/workspace/template-workspace-navigation.ts'
]) read(file);

must('lib/templates/workspace/template-workspace-navigation.ts', 'Template Library', 'navigation must include Template Library');
must('lib/templates/workspace/template-workspace-navigation.ts', 'Template Studio', 'navigation must include Template Studio');
must('lib/templates/workspace/template-workspace-navigation.ts', 'Generation Engine', 'navigation must include Generation Engine');
must('components/templates/workspace/TemplateWorkspaceShell.tsx', 'templateWorkspaceNavForPath', 'template shell must use workspace nav');
must('app/manager-workspace/page.tsx', 'TemplateLibraryHub', 'manager workspace must render Template Library hub');
must('app/layout.tsx', "import './template-workspace-hubs.css';", 'layout must import template workspace CSS');
must('app/layout.tsx', "import './manager-template-library-upload.css';", 'layout must import manager template CSS');
before('app/layout.tsx', './template-workspace-hubs.css', './manager-template-library-upload.css', 'manager template CSS must load after base template CSS');

must('components/TemplateProgressiveWorkspace.tsx', "type Stage = 'ROUND' | 'PACKET' | 'EDITOR'", 'active template workflow must keep native progressive stages');
must('components/TemplateProgressiveWorkspace.tsx', 'TemplatePacketConfigurator', 'active workflow must use shared configurator');
must('components/TemplatePacketConfigurator.tsx', 'manager-template-direct-actions', 'shared configurator must expose manager actions');
must('components/TemplatePacketConfigurator.tsx', "fetch('/api/template-assets'", 'shared configurator must persist manager templates');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "import TemplateProgressiveWorkspace from '../../TemplateProgressiveWorkspace'", 'manager library must import active progressive workflow');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'ManagerTemplateWorkspaceChrome', 'manager library must include upload styling chrome');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-manager-template-progressive="uses-active-disputer-template-ui"', 'manager library must mark active UI reuse');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'managerTemplateScope={managerTemplateScope}', 'manager library must pass manager authority');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'managedExhibits={exhibits}', 'manager library must pass active exhibits');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'onTemplateMutation={handleTemplateMutation}', 'manager library must refresh after changes');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-template-library-minimal="progressive-upload"', 'manager library must be progressive upload');
mustNot('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-template-library-minimal="round-only"', 'manager library must not be round-only');
mustNot('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', '<div className="template-upload-slot-grid">', 'manager library must not show all cards at once');
must('app/manager-template-library-upload.css', 'same progressive workflow as Disputer template selection', 'manager CSS must document shared workflow');
must('app/api/template-assets/route.ts', 'export async function POST', 'template API must support POST');
must('app/api/template-assets/route.ts', 'request.formData()', 'template API must read form data');
must('app/api/template-assets/route.ts', 'uploadManagerTemplateObject', 'template API must save manager template files');

if (failures.length) {
  console.error(`Template workspace contract guard failed: ${failures.length} issue(s).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Template workspace contract guard passed.');
