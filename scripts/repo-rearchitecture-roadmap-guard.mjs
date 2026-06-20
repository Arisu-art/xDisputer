#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push('missing ' + path), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };

const roadmap = read('docs/roadmaps/repo-rearchitecture-checklist.md');
const cleanup = read('scripts/finalize-retired-surface-cleanup.mjs');
const proxy = read('proxy.ts');
const layout = read('app/layout.tsx');
const phase7 = read('scripts/root-css-import-reduction-guard.mjs');
const phase8 = read('src/features/notifications/notification-ownership-contract.ts');
const phase9 = read('scripts/backend-route-service-contract-guard.mjs');
const phase10 = read('scripts/compatibility-layer-retirement-guard.mjs');

must(roadmap, '## Top 6 active fixes', 'roadmap must track top 6 active fixes');
must(roadmap, '- [x] Fix 1 — stable cleanup entrypoint', 'roadmap missing fix 1 status');
must(roadmap, '- [x] Fix 2 — route convention normalization', 'roadmap missing fix 2 status');
must(roadmap, '- [x] Fix 3 — client account CSS repair', 'roadmap missing fix 3 status');
must(roadmap, '- [x] Fix 4 — client layout CSS repair', 'roadmap missing fix 4 status');
must(roadmap, '- [x] Fix 5 — contract-driven guard alignment', 'roadmap missing fix 5 status');
must(roadmap, '- [x] Fix 6 — roadmap + tracker enforcement', 'roadmap missing fix 6 status');
must(roadmap, '- [x] Phase 7 — root CSS import reduction', 'roadmap missing phase 7 status');
must(roadmap, '- [x] Phase 8 — notification ownership isolation', 'roadmap missing phase 8 status');
must(roadmap, '- [x] Phase 9 — backend route/service contract audit', 'roadmap missing phase 9 status');
must(roadmap, '- [x] Phase 10 — delete temporary compatibility layers after verification', 'roadmap missing phase 10 status');
must(cleanup, 'verifyOnly', 'cleanup entrypoint must support verify mode');
must(proxy, 'export async function proxy', 'proxy must stay active');
must(layout, "import './root-css-workspace-foundation.css';", 'layout must use workspace foundation bundle');
must(layout, "import './root-css-contracts.css';", 'layout must use contracts bundle');
must(phase7, 'root-css-import-reduction-guard: ok', 'phase 7 guard must exist');
must(phase8, "ownerComponent: 'components/console/AccountMenu.tsx'", 'phase 8 notification ownership contract must exist');
must(phase9, 'backend-route-service-contract-guard: ok', 'phase 9 route/service guard must exist');
must(phase10, 'compatibility-layer-retirement-guard: ok', 'phase 10 compatibility retirement guard must exist');

if (failures.length) {
  console.error('repo-rearchitecture-roadmap-guard failed: ' + failures.length + ' check(s).');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}

console.log('repo-rearchitecture-roadmap-guard: ok');
