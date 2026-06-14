#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const registry = readFileSync('components/console/ui-shell-registry.ts', 'utf8');
const failures = [];

function fail(message) {
  failures.push(message);
}

function assertFile(path) {
  if (!existsSync(path)) fail(`Missing required file: ${path}`);
}

function assertContains(path, text) {
  if (!existsSync(path)) return fail(`Missing file for source assertion: ${path}`);
  const source = readFileSync(path, 'utf8');
  if (!source.includes(text)) fail(`${path} must include: ${text}`);
}

function assertNotContains(path, text) {
  if (!existsSync(path)) return fail(`Missing file for forbidden assertion: ${path}`);
  const source = readFileSync(path, 'utf8');
  if (source.includes(text)) fail(`${path} must not include legacy shell pattern: ${text}`);
}

function extractOwners() {
  const matches = Array.from(registry.matchAll(/owner: '([^']+)'/g));
  return Array.from(new Set(matches.map((match) => match[1])));
}

function extractRoutes() {
  const matches = Array.from(registry.matchAll(/path: '([^']+)'/g));
  return matches.map((match) => match[1]);
}

const canonicalFiles = [
  'components/console/ConsoleShell.tsx',
  'components/console/ConsoleHeader.tsx',
  'components/console/AccountMenu.tsx',
  'components/console/RenderDebugger.tsx',
  'components/console/ui-shell-registry.ts',
  'app/console-shell-system.css',
  'app/console-debug-overlay.css'
];

canonicalFiles.forEach(assertFile);
assertContains('components/console/ConsoleShell.tsx', 'data-console-shell="true"');
assertContains('components/console/ConsoleShell.tsx', '<ConsoleHeader');
assertContains('components/console/ConsoleShell.tsx', '<AccountMenu');
assertContains('components/console/ConsoleHeader.tsx', 'data-console-header="true"');
assertContains('components/console/AccountMenu.tsx', 'data-console-account-menu="true"');
assertContains('components/console/RenderDebugger.tsx', 'window.__xdisputerDebug');
assertContains('app/layout.tsx', '<RenderDebugger />');

const owners = extractOwners();
for (const owner of owners) {
  assertFile(owner);
  assertContains(owner, '<ConsoleShell');
  for (const forbidden of [
    '<aside className="admin-monitor-sidebar',
    '<section className="admin-monitor-main',
    'className="admin-monitor-account"',
    '<ManagerWorkspaceSwitch',
    '<WorkspaceSwitchAnchor',
    'data-manager-switch-visible-slot="plain-nav-button"'
  ]) {
    assertNotContains(owner, forbidden);
  }
}

for (const route of extractRoutes()) {
  if (!registry.includes(`path: '${route}'`)) fail(`Registry route disappeared: ${route}`);
}

if (failures.length) {
  console.error('\nUI shell registry guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`UI shell registry guard passed: ${owners.length} owner file(s), ${extractRoutes().length} route contract(s).`);
