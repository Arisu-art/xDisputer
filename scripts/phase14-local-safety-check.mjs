#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const conflictPattern = /^(<<<<<<<|=======|>>>>>>>)/m;
const filesToCheck = [
  'components/GuidedSourceDataFlow.tsx',
  'components/LetterGeneratorWorkspaceV2.tsx',
  'app/api/generation-runs/route.ts',
  'app/api/template-assets/route.ts',
  'lib/letter-engine.ts'
];

function fail(message, details = []) {
  console.error('\nPhase 14 local safety check failed.');
  console.error(message);
  details.forEach((line) => console.error(line));
  console.error('\nRecommended repair for conflicted source files:');
  console.error('  git diff --name-only --diff-filter=U');
  console.error('  git restore --source=origin/main --staged --worktree components/GuidedSourceDataFlow.tsx');
  console.error('  grep -n "<<<<<<<\\|=======\\|>>>>>>>" components/GuidedSourceDataFlow.tsx || true');
  process.exit(1);
}

let unmerged = '';
try {
  unmerged = execSync('git diff --name-only --diff-filter=U', { encoding: 'utf8' }).trim();
} catch {
  unmerged = '';
}

if (unmerged) {
  fail('Git has unresolved merge conflicts. Resolve them before running typecheck/build.', unmerged.split('\n').map((file) => `  - ${file}`));
}

const conflictFiles = filesToCheck.filter((file) => existsSync(file) && conflictPattern.test(readFileSync(file, 'utf8')));
if (conflictFiles.length) {
  fail('Conflict markers were found inside source files.', conflictFiles.map((file) => `  - ${file}`));
}

console.log('Phase 14 local safety check passed.');
