#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };

const roadmap = read('docs/roadmaps/repo-rearchitecture-checklist.md');
const cleanup = read('scripts/finalize-retired-surface-cleanup.mjs');
const proxy = read('proxy.ts');
const layout = read('app/layout.tsx');

must(roadmap, '## Top 6 active fixes', 'roadmap must track top 6 active fixes');
must(roadmap, '- [x] Fix 1 — stable cleanup entrypoint', 'roadmap missing fix 1 status');
must(roadmap, '- [x] Fix 2 — route convention normalization', 'roadmap missing fix 2 status');
must(roadmap, '- [x] Fix 3 — client account CSS repair', 'roadmap missing fix 3 status');
must(roadmap, '- [x] Fix 4 — client layout CSS repair', 'roadmap missing fix 4 status');
must(roadmap, '- [x] Fix 5 — contract-driven guard alignment', 'roadmap missing fix 5 status');
must(roadmap, '- [x] Fix 6 — roadmap + tracker enforcement', 'roadmap missing fix 6 status');
must(cleanup, 'verifyOnly', 'cleanup entrypoint must support verify mode');
must(proxy, 'export async function proxy', 'Next.js proxy convention must be active');
must(layout, "import './account-popover-compact-retirement.css';", 'root layout must include compact popover CSS');

if (failures.length) {
  console.error(`repo-rearchitecture-roadmap-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('repo-rearchitecture-roadmap-guard: ok');
