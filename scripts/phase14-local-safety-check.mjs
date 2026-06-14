#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const conflictPattern = /^(<<<<<<<|=======|>>>>>>>)/m;
const filesToCheck = [
  'components/GuidedSourceDataFlow.tsx',
  'components/LetterGeneratorWorkspaceV2.tsx',
  'app/api/generation-runs/route.ts',
  'app/api/template-assets/route.ts',
  'app/api/template-assets/file/route.ts',
  'app/api/template-assets/manifest/route.ts',
  'lib/letter-engine.ts',
  'lib/supplemental-template-renderer.ts'
];

const volatileGeneratedPaths = [
  '.next/dev/types',
  '.next/dev/server',
  '.next/dev/static',
  '.next/dev/trace',
  '.next/dev/cache',
  'tsconfig.tsbuildinfo'
];

const sourceTypoGuards = [
  {
    path: 'lib/supplemental-template-renderer.ts',
    pattern: /\bs\.sn\b/,
    message: 'Known source typo found: use s.ssn, not s.sn.'
  }
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

function cleanVolatileGeneratedArtifacts() {
  const removed = [];

  for (const artifactPath of volatileGeneratedPaths) {
    if (!existsSync(artifactPath)) continue;

    try {
      rmSync(artifactPath, { recursive: true, force: true });
      removed.push(artifactPath);
    } catch (error) {
      fail('Could not clean stale generated artifacts before local checks.', [`  - ${artifactPath}: ${error instanceof Error ? error.message : String(error)}`]);
    }
  }

  if (removed.length) {
    console.log(`Cleaned stale generated artifact(s): ${removed.join(', ')}`);
  }
}

function runSelfHealingScript(path, label) {
  if (!existsSync(path)) return;

  try {
    execSync(`node ${path}`, { stdio: 'inherit' });
  } catch (error) {
    fail(`Could not apply ${label} before local checks.`, [`  - ${error instanceof Error ? error.message : String(error)}`]);
  }
}

function assertNoKnownSourceTypos() {
  const failures = [];

  for (const guard of sourceTypoGuards) {
    if (!existsSync(guard.path)) continue;
    const source = readFileSync(guard.path, 'utf8');
    if (guard.pattern.test(source)) failures.push(`  - ${guard.path}: ${guard.message}`);
  }

  if (failures.length) {
    fail('Known source typo guard failed. Fix the source file; safety checks must not rewrite code.', failures);
  }
}

cleanVolatileGeneratedArtifacts();
runSelfHealingScript('scripts/apply-user-error-flyout-wiring.mjs', 'user-error flyout wiring');
runSelfHealingScript('scripts/apply-manager-template-storage-wiring.mjs', 'manager template storage wiring');
assertNoKnownSourceTypos();

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
