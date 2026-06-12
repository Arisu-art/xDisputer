#!/usr/bin/env node
import { execSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const token = process.env.VERCEL_TOKEN;

function run(command, args, options = {}) {
  console.log(`\n▶ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, ...options });
  if (result.status !== 0) process.exit(result.status || 1);
}

if (!token) {
  console.error('Missing VERCEL_TOKEN. Direct Vercel sync requires a Vercel token.');
  console.error('Set it in Codespaces secrets or export it in this shell, then rerun npm run vercel:direct.');
  process.exit(2);
}

console.log('== xDisputer direct Vercel production sync ==');
console.log(`Commit: ${sha}`);
console.log('This bypasses Git auto-deploy by building locally and uploading a prebuilt production deployment.');

run('npx', ['vercel', 'pull', '--yes', '--environment=production', '--token', token]);
run('npx', ['vercel', 'build', '--prod', '--token', token]);

if (!existsSync('.vercel/output')) {
  console.error('Missing .vercel/output after vercel build. Direct deploy cannot continue.');
  process.exit(1);
}

run('npx', ['vercel', 'deploy', '--prebuilt', '--prod', '--archive=tgz', '--token', token, '--env', `XDISPUTER_DEPLOY_COMMIT=${sha}`]);

console.log('\nDirect Vercel deploy finished. If your build-info endpoint uses Git integration metadata, verify with the deployment URL or Vercel Dashboard.');
