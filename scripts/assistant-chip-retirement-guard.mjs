#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const failures = [];
const sourceRoots = ['app', 'components', 'lib', 'src', 'scripts'];
const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css']);
const retiredPaths = [
  'app/api/ai/route.ts',
  'components/AiInsightPanel.tsx',
  'components/AdaptiveCommandCenter.tsx',
  'scripts/ai-coding-assistant.js',
  'components/OutputLimitResetChip.tsx',
  'app/output-limit-chip.css',
  'lib/ai'
];
const retiredMarkers = [
  'AiInsightPanel',
  'AdaptiveCommandCenter',
  'AI assistant layer',
  'adaptive-center',
  'adaptive-launch',
  'OutputLimitResetChip',
  'StaticEntitlementChip',
  'output-limit-reset-chip',
  'output-limit-chip-main',
  'performance-static-entitlement-chip'
];

function read(path) {
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

function walk(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (path.includes('node_modules') || path.includes('.next')) continue;
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, files);
    else if (sourceExts.has(extname(path))) files.push(path);
  }
  return files;
}

for (const path of retiredPaths) {
  if (existsSync(path)) failures.push(`retired file still exists: ${path}`);
}

for (const file of sourceRoots.flatMap((root) => walk(root))) {
  if (file.endsWith('assistant-chip-retirement-guard.mjs')) continue;
  const source = read(file);
  for (const marker of retiredMarkers) {
    if (source.includes(marker)) failures.push(`${file} still contains retired marker: ${marker}`);
  }
}

const layout = read('app/layout.tsx');
if (!layout.includes("import './account-popover-compact-retirement.css';")) failures.push('layout must import compact account popover CSS');
if (layout.includes("import './output-limit-chip.css';")) failures.push('layout must not import retired output-limit chip CSS');
if (layout.includes("import './master-hologram-workspace.css';")) failures.push('layout must not import retired master workspace CSS');

const compactCss = read('app/account-popover-compact-retirement.css');
if (!compactCss.includes('width: min(320px')) failures.push('manager/master popover must be compact');
if (!compactCss.includes('width: min(280px')) failures.push('client popover must be compact');

if (failures.length) {
  console.error(`assistant-chip-retirement-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('assistant-chip-retirement-guard: ok');
