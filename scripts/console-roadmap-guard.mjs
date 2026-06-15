#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) { if (!existsSync(path)) { failures.push(`Missing required file: ${path}`); return ''; } return readFileSync(path, 'utf8'); }
function has(path, term) { const source = read(path); if (source && !source.includes(term)) failures.push(`${path} must include ${term}`); }

const manifest = read('lib/console/contracts/navigation-manifest.ts');
const routePage = read('components/console/ConsolePanelRoutePage.tsx');
const renderer = read('components/console/ConsoleTransformationPanel.tsx');

for (const term of ['manager-authoring', 'manager-operations', 'master-governance', 'Contracts Center', 'Mapping Studio', 'Quality Lab', 'Release Center', 'Automation Center', 'Lifecycle Desk', 'Output Queue', 'Exceptions Desk', 'Capacity Desk', 'Filings Board', 'Policy Studio', 'Entitlements Center', 'Deployment Control', 'Incident Command']) {
  if (!manifest.includes(term)) failures.push(`navigation manifest missing ${term}`);
}

for (const path of [
  'app/manager-workspace/contracts/page.tsx',
  'app/manager-workspace/mappings/page.tsx',
  'app/manager-workspace/quality/page.tsx',
  'app/manager-workspace/releases/page.tsx',
  'app/manager-workspace/automation/page.tsx',
  'app/admin/lifecycle/page.tsx',
  'app/admin/output-queue/page.tsx',
  'app/admin/exceptions/page.tsx',
  'app/admin/capacity/page.tsx',
  'app/admin/filings/page.tsx',
  'app/master/policies/page.tsx',
  'app/master/entitlements/page.tsx',
  'app/master/incidents/page.tsx'
]) has(path, 'ConsolePanelRoutePage');

if (!routePage.includes('navItemsForDomain')) failures.push('ConsolePanelRoutePage must use manifest navigation.');
if (!routePage.includes('requireRole')) failures.push('ConsolePanelRoutePage must enforce role access.');
if (!routePage.includes('ManagerConsoleShell')) failures.push('ConsolePanelRoutePage must use shared shell.');
if (!renderer.includes('data-console-panel-id')) failures.push('ConsoleTransformationPanel must expose panel markers.');

if (failures.length) {
  console.error('\nConsole roadmap guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Console roadmap guard passed.');
