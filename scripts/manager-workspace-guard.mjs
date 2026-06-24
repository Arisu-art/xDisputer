#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(file) {
  if (!existsSync(file)) {
    failures.push(`missing ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}
function must(file, marker, label) {
  if (!read(file).includes(marker)) failures.push(label);
}
function mustNot(file, marker, label) {
  if (read(file).includes(marker)) failures.push(label);
}

must('app/manager-workspace/page.tsx', 'TemplateWorkspaceShell', 'manager workspace must use template workspace shell');
must('app/manager-workspace/page.tsx', 'TemplateLibraryHub', 'manager workspace must render Template Library hub');
must('components/templates/workspace/TemplateWorkspaceShell.tsx', 'ManagerConsoleShell', 'template shell must use shared manager shell');
must('components/templates/workspace/TemplateWorkspaceShell.tsx', 'mode="workspace"', 'template shell must run in manager workspace mode');
must('app/layout.tsx', "import './manager-template-library-upload.css';", 'layout must load manager template upload CSS');

must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "type Stage = 'ROUND' | 'SLOT' | 'UPLOAD'", 'Template Library must use progressive stages');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'templates-progressive-workspace manager-template-progressive-workspace', 'Template Library must use native progressive workspace shell');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "stage === 'ROUND'", 'Template Library must have round stage');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "stage === 'SLOT'", 'Template Library must have template selection stage');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "stage === 'UPLOAD'", 'Template Library must have upload stage');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'uploadTemplate', 'Template Library upload handler must exist');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', "fetch('/api/template-assets'", 'Template Library must post uploads to template-assets API');
must('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-template-library-minimal="progressive-upload"', 'Template Library must be progressive-upload enabled');
mustNot('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', 'data-template-library-minimal="round-only"', 'Template Library must not be round-only');
mustNot('components/templates/workspace/TemplateRoundOnlyLibrary.tsx', '<div className="template-upload-slot-grid">', 'Template Library must not show all upload cards at once');

must('app/manager-template-library-upload.css', '.manager-template-progressive-workspace', 'progressive layout CSS must exist');
must('app/manager-template-library-upload.css', '.template-manager-slot-grid', 'template slot card layout must exist');
must('app/manager-template-library-upload.css', '.template-native-upload-panel', 'focused upload panel layout must exist');
must('app/api/template-assets/route.ts', 'request.formData()', 'template-assets API must read multipart uploads');
must('app/api/template-assets/route.ts', 'uploadManagerTemplateObject', 'template-assets API must write manager template files');

if (failures.length) {
  console.error(`Manager workspace guard failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Manager workspace guard passed.');
