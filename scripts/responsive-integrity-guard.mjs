#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];

function read(path) {
  if (!existsSync(path)) {
    failures.push(`Missing required file: ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function has(path, term) {
  const source = read(path);
  if (source && !source.includes(term)) failures.push(`${path} must include ${term}`);
}

function notHas(path, term) {
  const source = read(path);
  if (source && source.includes(term)) failures.push(`${path} must not include ${term}`);
}

has('app/layout.tsx', "import './final-responsive-integrity.css';");
has('app/layout.tsx', "import './client-template-runtime.css';");
has('app/final-responsive-integrity.css', '--xdisputer-responsive-integrity');
has('app/final-responsive-integrity.css', 'overflow-x: clip');
has('app/final-responsive-integrity.css', '@media (max-width: 960px)');
has('app/final-responsive-integrity.css', '@media (max-width: 760px)');
has('app/final-responsive-integrity.css', 'grid-template-columns: 1fr !important');
has('app/final-responsive-integrity.css', '.admin-monitor-page.native-console');
has('app/final-responsive-integrity.css', '.client-template-runtime-grid');
has('app/final-responsive-integrity.css', '.dynamic-template-rule-layout');
has('app/final-responsive-integrity.css', '.admin-monitor-table-wrap');
has('app/globals.css', 'box-sizing');
has('app/globals.css', 'body');
has('app/globals.css', 'min-width: 0');
has('components/console/RenderDebugger.tsx', 'detectHorizontalOverflow');
has('components/console/RenderDebugger.tsx', 'largestOverflowSelector');
has('components/console/RenderDebugger.tsx', 'finalResponsiveIntegrityLoaded');
has('lib/ui-intelligence/registry.ts', 'responsive-integrity');
has('package.json', 'responsive:guard');

notHas('app/final-responsive-integrity.css', 'min-width: 1200px');
notHas('app/final-responsive-integrity.css', 'width: 1600px');

if (failures.length) {
  console.error('\nResponsive integrity guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Responsive integrity guard passed.');
