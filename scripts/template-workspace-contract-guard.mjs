#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, 'utf8') : (failures.push(`missing ${file}`), '');
const must = (file, marker, label) => { if (!read(file).includes(marker)) failures.push(`${file}: ${label}`); };
const mustNot = (file, marker, label) => { if (read(file).includes(marker)) failures.push(`${file}: ${label}`); };

for (const file of [
  'lib/templates/workspace/template-workspace-navigation.ts',
  'components/templates/workspace/TemplateRoundOnlyLibrary.tsx',
  'components/TemplateProgressiveWorkspace.tsx',
  'components/TemplatePacketConfigurator.tsx',
  'components/templates/workspace/TemplateTestLabHub.tsx',
  'lib/templates/workspace/template-test-lab-service.ts',
  'app/api/template-assets/route.ts',
  'app/api/template-assets/download/route.ts',
  'app/manager-template-test-lab.css',
  'app/layout.tsx',
  'app/manager-workspace/test/page.tsx'
]) read(file);

must('lib/templates/workspace/template-workspace-navigation.ts', 'Template Test Lab', 'navigation must include Test Lab');
must('lib/templates/workspace/template-workspace-navigation.ts', 'TEMPLATE_WORKSPACE_NAV_ITEMS.length !== 4', 'navigation must enforce 4 hubs');
must('app/manager-workspace/test/page.tsx', 'TemplateTestLabHub', 'test route must render hub');
must('app/manager-workspace/test/page.tsx', "dynamic = 'force-dynamic'", 'test route must be dynamic');
must('app/layout.tsx', "import './manager-template-test-lab.css';", 'layout must import test CSS');
must('components/TemplateProgressiveWorkspace.tsx', "type Stage = 'ROUND' | 'PACKET' | 'EDITOR'", 'shared workflow stages missing');
must('components/TemplatePacketConfigurator.tsx', 'manager-template-direct-actions', 'manager actions missing');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "import TemplateProgressiveWorkspace from '../../TemplateProgressiveWorkspace'", 'manager library must use shared workflow');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-template-library-minimal="progressive-upload"', 'manager library must be progressive upload');
mustNot('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-template-library-minimal="round-only"', 'old round-only marker returned');
must('lib/templates/workspace/template-test-lab-service.ts', 'buildTemplateTestLabContext', 'test service missing');
must('lib/templates/workspace/template-test-lab-service.ts', 'previewGenerationPlan', 'preview plan missing');
must('components/templates/workspace/TemplateTestLabHub.tsx', 'template-test-side-panel', 'side panel missing');
must('components/templates/workspace/TemplateTestLabHub.tsx', 'Generated output preview', 'preview panel missing');
must('components/templates/workspace/TemplateTestLabHub.tsx', 'Active template downloads', 'active file links missing');
must('app/api/template-assets/download/route.ts', 'downloadManagerTemplateObject', 'file reader missing');
must('app/api/template-assets/download/route.ts', 'scope.managerUserId', 'scope check missing');
must('app/manager-template-test-lab.css', '.template-test-side-panel', 'side panel CSS missing');
must('app/api/template-assets/route.ts', 'request.formData()', 'template API upload parser missing');

if (failures.length) {
  console.error(`Template workspace contract guard failed: ${failures.length} issue(s).`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Template workspace contract guard passed.');
