#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'docs/modernization-implementation-tracker.md',
  'docs/modernization-boundary-contract.md',
  'src/features/README.md',
  'src/features/auth/README.md',
  'src/features/accounts/README.md',
  'src/features/templates/README.md',
  'src/features/source-data/README.md',
  'src/features/generation/README.md',
  'src/features/outputs/README.md',
  'src/features/evidence/README.md',
  'src/features/notifications/README.md',
  'src/features/admin/README.md',
  'src/server/README.md',
  'src/server/auth/README.md',
  'src/server/contracts/service-result.ts',
  'src/server/http/api-response.ts',
  'src/server/policies/README.md',
  'src/server/repositories/README.md',
  'src/server/services/README.md',
  'app/api/system/modernization/route.ts'
];

const requiredTrackerMarkers = [
  'Coded in this pass',
  'Not coded yet',
  'Next safe coding order',
  'Tracking rule'
];

const requiredBoundaryMarkers = [
  'parse request -> validate -> authorize -> call service -> map result -> return response',
  'Routes',
  'Services',
  'Repositories',
  'Policies',
  'Features',
  'Styling'
];

let failed = false;

function fail(message) {
  failed = true;
  console.error(`modernization-boundary-guard: ${message}`);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

for (const file of requiredFiles) {
  if (!existsSync(file)) fail(`missing ${file}`);
}

const tracker = read('docs/modernization-implementation-tracker.md');
for (const marker of requiredTrackerMarkers) {
  if (!tracker.includes(marker)) fail(`tracker missing ${marker}`);
}

const boundary = read('docs/modernization-boundary-contract.md');
for (const marker of requiredBoundaryMarkers) {
  if (!boundary.includes(marker)) fail(`boundary contract missing ${marker}`);
}

const serviceResult = read('src/server/contracts/service-result.ts');
for (const marker of ['ServiceResult', 'serviceSuccess', 'serviceFailure']) {
  if (!serviceResult.includes(marker)) fail(`service result contract missing ${marker}`);
}

const apiResponse = read('src/server/http/api-response.ts');
for (const marker of ['jsonFromServiceResult', 'jsonOk', 'Cache-Control']) {
  if (!apiResponse.includes(marker)) fail(`HTTP helper missing ${marker}`);
}

if (failed) process.exit(1);
console.log('modernization-boundary-guard: ok');
