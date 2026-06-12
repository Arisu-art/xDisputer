#!/usr/bin/env node
import { execSync } from 'node:child_process';

const productionUrl = process.env.XDISPUTER_PRODUCTION_URL || 'https://x-disputer.vercel.app';
const maxWaitMs = Number(process.env.XDISPUTER_VERIFY_WAIT_MS || 900_000);
const pollMs = Number(process.env.XDISPUTER_VERIFY_POLL_MS || 20_000);
const localSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const shortLocalSha = localSha.slice(0, 7);
const startedAt = Date.now();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readBuildInfo() {
  const endpoint = `${productionUrl.replace(/\/$/, '')}/api/system/build-info?ts=${Date.now()}`;
  const response = await fetch(endpoint, { cache: 'no-store' });
  if (!response.ok) throw new Error(`build-info returned HTTP ${response.status}`);
  return response.json();
}

console.log('== xDisputer wait for production deployment ==');
console.log(`Target URL: ${productionUrl}`);
console.log(`Local HEAD: ${localSha}`);
console.log(`Timeout:    ${Math.round(maxWaitMs / 1000)}s`);

while (Date.now() - startedAt <= maxWaitMs) {
  try {
    const payload = await readBuildInfo();
    const deployedSha = String(payload.gitCommitSha || 'unknown');

    if (deployedSha === localSha) {
      console.log(`✅ Production now matches local HEAD ${shortLocalSha}.`);
      process.exit(0);
    }

    console.log(`Waiting for Vercel... deployed=${deployedSha.slice(0, 7)} target=${shortLocalSha}`);
  } catch (error) {
    console.log(`Waiting for Vercel... ${error instanceof Error ? error.message : String(error)}`);
  }

  await sleep(pollMs);
}

console.error('❌ Production did not update to the pushed commit before timeout.');
console.error(`   Local HEAD: ${localSha}`);
console.error('   Check Vercel → Project → Deployments for a failed, skipped, or non-production deployment.');
console.error('   Then redeploy the latest main branch deployment and run: npm run verify:production');
process.exit(1);
