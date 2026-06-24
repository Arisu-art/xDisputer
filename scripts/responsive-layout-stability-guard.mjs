#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, marker, label) => { if (!source.includes(marker)) failures.push(label); };
const before = (source, first, second, label) => {
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  if (a < 0 || b < 0 || a >= b) failures.push(label);
};

const canvas = read('docs/responsive-layout-stability-canvas.md');
const layout = read('app/layout.tsx');
const globalCss = read('app/responsive-layout-stability-system.css');
const supportCss = read('app/supporting-documents-runtime-wide-fix.css');
const entitlement = read('components/ClientOutputLimitBoundary.tsx');

must(canvas, 'Code status', 'responsive canvas must show coded status');
must(canvas, 'app/responsive-layout-stability-system.css', 'responsive canvas must name global CSS owner');
must(canvas, 'app/supporting-documents-runtime-wide-fix.css', 'responsive canvas must name Supporting Documents final owner');
must(canvas, 'scripts/website-stability-guard.mjs', 'responsive canvas must name stability guard');

must(layout, "import './responsive-layout-stability-system.css';", 'root layout must load responsive stability CSS');
before(layout, './final-responsive-integrity.css', './responsive-layout-stability-system.css', 'responsive stability CSS must load after integrity baseline');
before(layout, './responsive-layout-stability-system.css', './stable-ui-primitives.css', 'responsive stability CSS must load before stable final layers');
before(layout, './supporting-documents-wide-stage.css', './supporting-documents-runtime-wide-fix.css', 'Supporting Documents runtime fix must load last for that feature');

must(globalCss, '--responsive-layout-stability-system: coded', 'global responsive CSS must expose coded contract marker');
must(globalCss, 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', 'global responsive CSS must implement auto-fit grids');
must(globalCss, '.client-output-limit-checking', 'global responsive CSS must center/stabilize entitlement loading state');
must(globalCss, "[role='dialog']", 'global responsive CSS must bound modal surfaces');
must(globalCss, 'prefers-reduced-motion: reduce', 'global responsive CSS must respect reduced motion');
must(globalCss, 'overflow-x: clip', 'global responsive CSS must prevent horizontal overflow');

must(supportCss, 'Layout contract: side panels are secondary; the center document canvas gets the maximum safe space first', 'Supporting Documents CSS must document center priority');
must(supportCss, '--support-runtime-canvas-target: clamp(430px, 56vw, var(--support-runtime-page-max))', 'Supporting Documents CSS must maximize center canvas target');
must(supportCss, 'min-height: clamp(520px, calc(100dvh - 230px), 980px)', 'Supporting Documents CSS must reserve vertical stage space for a large page');
must(supportCss, 'grid-template-areas: "documents page controls"', 'Supporting Documents CSS must use wide three-area grid');
must(supportCss, 'grid-template-areas: "documents" "page" "controls"', 'Supporting Documents CSS must stack on narrow screens');
must(supportCss, 'overflow-x: clip', 'Supporting Documents CSS must prevent horizontal overflow');

must(entitlement, 'ENTITLEMENT_FETCH_TIMEOUT_MS = 8000', 'entitlement check must timeout cold fetches');
must(entitlement, 'AbortController', 'entitlement check must abort stuck requests');

if (failures.length) {
  console.error(`responsive-layout-stability-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('responsive-layout-stability-guard: ok');
