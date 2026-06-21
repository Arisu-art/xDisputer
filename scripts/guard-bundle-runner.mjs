#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const bundleName = process.argv[2];
const CACHE_DIR = path.join(process.cwd(), '.xdisputer-cache');
const CACHE_FILE = path.join(CACHE_DIR, 'guard-bundle-cache.json');

const bundles = {
  performance: [
    ['node', ['scripts/guard-policy-canvas-guard.mjs']],
    ['node', ['scripts/guard-policy-consistency.mjs']],
    ['node', ['scripts/performance-boost-guard.mjs']],
    ['node', ['scripts/feature-ownership-guard.mjs']],
    ['node', ['scripts/repo-precision-audit.mjs']]
  ],
  'ui-source': [
    ['node', ['scripts/guard-policy-canvas-guard.mjs']],
    ['node', ['scripts/guard-policy-consistency.mjs']],
    ['node', ['scripts/no-autowrite-ui-guard.mjs']],
    ['node', ['scripts/ui-shell-registry-guard.mjs']],
    ['node', ['scripts/ui-intelligence-guard.mjs']],
    ['bundle', ['performance']],
    ['node', ['scripts/notification-ui-frontend-guard.mjs']],
    ['node', ['scripts/assistant-chip-retirement-guard.mjs']],
    ['node', ['scripts/manager-master-lightweight-ui-guard.mjs']],
    ['node', ['scripts/repo-rearchitecture-roadmap-guard.mjs']],
    ['node', ['scripts/modernization-canvas-next-actions-guard.mjs']],
    ['node', ['scripts/css-ownership-guard.mjs']],
    ['node', ['scripts/manager-console-workflow-guard.mjs']],
    ['node', ['scripts/notification-output-activity-guard.mjs']],
    ['node', ['scripts/client-account-popover-guard.mjs']],
    ['node', ['scripts/client-critical-gaps-guard.mjs']],
    ['node', ['scripts/template-workspace-contract-guard.mjs']],
    ['node', ['scripts/dti-check.mjs']],
    ['node', ['scripts/dynamic-template-anchor-guard.mjs']],
    ['node', ['scripts/manager-owned-docx-guard.mjs']],
    ['node', ['scripts/client-template-runtime-guard.mjs']],
    ['node', ['scripts/responsive-integrity-guard.mjs']],
    ['node', ['scripts/theme-consistency-guard.mjs']],
    ['node', ['scripts/theme-governance-contract-guard.mjs']],
    ['node', ['scripts/master-ui-workspace-guard.mjs']],
    ['node', ['scripts/ui-layout-contract-guard.mjs']],
    ['node', ['scripts/ui-collapse-contract-guard.mjs']],
    ['node', ['scripts/console-shell-contract-guard.mjs']],
    ['node', ['scripts/manager-visible-switch-contract-guard.mjs']]
  ],
  preflight: [
    ['node', ['scripts/guard-policy-canvas-guard.mjs']],
    ['node', ['scripts/guard-policy-consistency.mjs']],
    ['node', ['scripts/phase14-local-safety-check.mjs']],
    ['node', ['scripts/repair-generation-blocked-panel.mjs']],
    ['node', ['scripts/repair-generation-blocked-reasons-idempotent.mjs']],
    ['bundle', ['ui-source']],
    ['node', ['scripts/console-roadmap-guard.mjs']],
    ['node', ['scripts/template-execution-guard.mjs']]
  ]
};

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sha(value) {
  return createHash('sha256').update(value).digest('hex');
}

function readCache() {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function writeCache(cache) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function runCapture(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  if (result.status !== 0) {
    return `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  }
  return `${result.stdout || ''}${result.stderr || ''}`.trim();
}

function repoFingerprint(bundle) {
  const head = runCapture('git', ['rev-parse', 'HEAD']) || 'no-git-head';
  const status = runCapture('git', ['status', '--short', '--untracked-files=all']) || '';
  const bundleDefinition = JSON.stringify(bundles[bundle] || []);
  return sha(`${bundle}\n${bundleDefinition}\n${head}\n${status}`);
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) {
    fail(`${command} ${args.join(' ')} failed`);
  }
}

function runBundle(bundle, cache, stack = new Set()) {
  if (!bundles[bundle]) fail(`Unknown guard bundle: ${bundle}`);
  if (stack.has(bundle)) fail(`Recursive guard bundle detected: ${bundle}`);

  const fingerprint = repoFingerprint(bundle);
  const cached = cache[bundle];
  if (cached?.fingerprint === fingerprint && cached?.ok === true) {
    console.log(`${bundle}: cache hit`);
    return;
  }

  stack.add(bundle);
  console.log(`${bundle}: running`);
  for (const [command, args] of bundles[bundle]) {
    if (command === 'bundle') {
      runBundle(args[0], cache, stack);
      continue;
    }
    runCommand(command, args);
  }
  stack.delete(bundle);

  cache[bundle] = {
    ok: true,
    fingerprint,
    updatedAt: new Date().toISOString()
  };
  writeCache(cache);
  console.log(`${bundle}: ok`);
}

if (!bundleName) fail('Usage: node scripts/guard-bundle-runner.mjs <performance|ui-source|preflight>');
const cache = readCache();
runBundle(bundleName, cache);
