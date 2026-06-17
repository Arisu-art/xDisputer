#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'lib/frontend-control/account-scope.ts',
  'lib/frontend-control/action-registry.ts',
  'lib/frontend-control/content-registry.ts',
  'lib/frontend-control/identity-registry.ts',
  'lib/frontend-control/layout-registry.ts',
  'lib/frontend-control/navigation-map.ts',
  'lib/frontend-control/performance-profile.ts',
  'lib/frontend-control/resolve-control.ts',
  'lib/frontend-control/index.ts',
  'lib/design-system/tokens.ts',
  'lib/design-system/variants.ts',
  'docs/frontend-command-architecture-canvas.md'
];

const requiredScriptNames = [
  'frontend-control:guard',
  'ui-source:guard'
];

let failed = false;

function markFailure(message) {
  failed = true;
  console.error(`frontend-control-guard: ${message}`);
}

for (const file of requiredFiles) {
  if (!existsSync(file)) markFailure(`missing ${file}`);
}

if (existsSync('package.json')) {
  const packageJson = readFileSync('package.json', 'utf8');
  for (const scriptName of requiredScriptNames) {
    if (!packageJson.includes(`"${scriptName}"`)) {
      markFailure(`package.json missing script ${scriptName}`);
    }
  }
}

const identitySource = existsSync('lib/frontend-control/identity-registry.ts')
  ? readFileSync('lib/frontend-control/identity-registry.ts', 'utf8')
  : '';

for (const identity of ['action.primary', 'table.directory', 'panel.template', 'workspace.frame']) {
  if (!identitySource.includes(identity)) markFailure(`identity registry missing ${identity}`);
}

const contentSource = existsSync('lib/frontend-control/content-registry.ts')
  ? readFileSync('lib/frontend-control/content-registry.ts', 'utf8')
  : '';

for (const key of ['global.loading', 'actions.save', 'actions.finalize']) {
  if (!contentSource.includes(key)) markFailure(`content registry missing ${key}`);
}

if (failed) process.exit(1);
console.log('frontend-control-guard: ok');
