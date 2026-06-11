import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function run(command) {
  console.log(`\n▶ ${command}`);
  execSync(command, { stdio: 'inherit' });
}

function assertFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing required file: ${path}`);
  }
  console.log(`✅ ${path}`);
}

function assertContains(path, text) {
  const file = readFileSync(path, 'utf8');
  if (!file.includes(text)) {
    throw new Error(`Missing required code in ${path}: ${text}`);
  }
  console.log(`✅ ${path} contains ${text}`);
}

console.log('\n=== xDisputer deploy guard ===');

assertFile('lib/round-template-policy.ts');
assertFile('lib/generation-manifest.ts');
assertFile('lib/supabase/template-registry.ts');
assertFile('app/api/template-assets/route.ts');
assertFile('app/api/template-assets/file/route.ts');
assertFile('app/api/system/runtime/route.ts');
assertFile('app/system/runtime/page.tsx');
assertFile('app/system/templates/page.tsx');

assertContains('components/LetterGeneratorWorkspaceV2.tsx', '/api/template-assets?round=');
assertContains('components/LetterGeneratorWorkspaceV2.tsx', '/api/template-assets/file?');
assertContains('components/LetterGeneratorWorkspaceV2.tsx', 'generation-manifest.json');
assertContains('components/LetterGeneratorWorkspaceV2.tsx', 'buildGenerationManifest');

run('npm run typecheck');
run('npm run build');

console.log('\n✅ Deploy guard passed. Repo is ready to commit, push, and verify in Vercel.');
