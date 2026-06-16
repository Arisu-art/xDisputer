import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`Missing ${path}`), '');
const has = (path, text, message) => { if (!read(path).includes(text)) failures.push(message); };
const not = (path, text, message) => { if (read(path).includes(text)) failures.push(message); };

has('app/layout.tsx', "import './instant-interaction-performance.css';", 'layout must import instant performance layer');
has('app/instant-interaction-performance.css', '--x-instant-performance: ready', 'instant performance readiness token missing');
has('app/instant-interaction-performance.css', 'transition-property: none', 'static transition reset missing');
has('app/instant-interaction-performance.css', 'translate3d(0, var(--x-float-y), 0)', 'global float transform missing');
has('app/instant-interaction-performance.css', '.admin-monitor-page .admin-monitor-card', 'manager/master dense card optimization missing');
has('app/instant-interaction-performance.css', 'xInstantShellReady', 'short shell ready animation missing');
has('app/instant-interaction-performance.css', 'prefers-reduced-motion', 'reduced-motion safety missing');
has('app/instant-interaction-performance.css', 'min-width: 0 !important', 'overflow containment missing');
has('app/ui-theme-triad.css', 'xTriadSurfaceEnter', 'triad theme should remain present');
not('app/instant-interaction-performance.css', 'transition-property: all', 'instant layer must not transition all properties');
not('app/instant-interaction-performance.css', 'filter: blur', 'instant layer must not add blur');

if (failures.length) {
  console.error('Instant performance guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Instant performance guard passed.');
