#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const scripts = packageJson.scripts || {};
const failures = [];
const forbiddenAutowriteScripts = [
  'apply-manager-workspace-nav-wiring.mjs',
  'apply-user-error-flyout-wiring.mjs',
  'apply-manager-template-storage-wiring.mjs',
  'apply-manager-template-ui-wiring.mjs',
  'apply-manager-template-workspace-state-wiring.mjs',
  'apply-manager-template-generation-wiring.mjs'
];

for (const [name, command] of Object.entries(scripts)) {
  if (name.startsWith('ai:')) continue;
  if (name === 'ui-source:guard') continue;
  for (const forbidden of forbiddenAutowriteScripts) {
    if (String(command).includes(forbidden)) failures.push(`${name} still runs ${forbidden}`);
  }
}

if (!String(scripts.predev || '').includes('phase14-local-safety-check.mjs') || !String(scripts.predev || '').includes('ui-source:guard')) failures.push('predev must run verification-only safety and UI guards.');
if (!String(scripts.pretypecheck || '').includes('phase14-local-safety-check.mjs') || !String(scripts.pretypecheck || '').includes('ui-source:guard')) failures.push('pretypecheck must run verification-only safety and UI guards.');
if (!String(scripts.prebuild || '').includes('phase14-local-safety-check.mjs') || !String(scripts.prebuild || '').includes('ui-source:guard')) failures.push('prebuild must run verification-only safety and UI guards.');

if (failures.length) {
  console.error('\nNo-autowrite UI guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('No-autowrite UI guard passed. Normal dev/typecheck/build scripts are verification-only.');
