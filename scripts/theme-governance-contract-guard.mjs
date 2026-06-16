#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd, exit } from 'node:process';

const root = cwd();
const failures = [];

function read(path) {
  const full = join(root, path);
  if (!existsSync(full)) {
    failures.push(`Missing file: ${path}`);
    return '';
  }
  return readFileSync(full, 'utf8');
}

function must(path, text, message) {
  if (!read(path).includes(text)) failures.push(message);
}

must('lib/ui-intelligence/theme-governance.ts', 'XDISPUTER_THEME_GOVERNANCE_CANVAS', 'Typed theme governance canvas export missing.');
must('lib/ui-intelligence/theme-governance.ts', 'classifyThemeGovernanceIssue', 'Theme issue classifier missing.');
must('lib/ui-intelligence/theme-governance.ts', 'themeGovernanceChecklist', 'Theme checklist helper missing.');
must('lib/ui-intelligence/theme-governance.ts', 'app/ui-theme-contracts.css', 'Visual issues must route to the theme owner file.');
must('lib/ui-intelligence/theme-governance.ts', 'app/ui-layout-contracts.css', 'Geometry issues must route to the layout owner file.');
must('lib/ui-intelligence/theme-governance.ts', 'data-theme-custom="client|manager|master|auth"', 'Role customization hook missing.');
must('lib/ui-intelligence/theme-governance.ts', 'Do not create a new global theme per route.', 'Theme anti-pattern list missing.');
must('docs/ux-theme-governance-canvas.md', 'xDisputer Unified UX Theme Governance Canvas', 'Governance canvas document missing.');
must('docs/ux-theme-governance-canvas.md', '5W + HOW', 'Governance canvas must include 5W + HOW.');
must('docs/ux-theme-governance-canvas.md', 'What not to do', 'Governance canvas must include anti-patterns.');
must('app/layout.tsx', 'data-theme-contract="xdisputer-unified"', 'Root theme contract missing.');
must('app/layout.tsx', 'data-ui-scope="global"', 'Root UI scope marker missing.');
must('app/ui-theme-contracts.css', '--x-theme-version', 'Theme version token missing.');
must('app/ui-theme-contracts.css', 'data-theme-surface="card"', 'Future card hook missing.');
must('app/ui-theme-contracts.css', 'data-theme-loading="skeleton"', 'Loading skeleton hook missing.');

if (failures.length) {
  console.error('Theme governance contract guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  exit(1);
}

console.log('Theme governance contract guard passed.');
