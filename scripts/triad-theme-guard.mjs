import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`Missing ${path}`), '');
const has = (path, text, message) => { if (!read(path).includes(text)) failures.push(message); };

has('app/layout.tsx', "import './ui-theme-triad.css';", 'layout must import triad theme');
has('app/ui-theme-triad.css', '--x-triad-theme: ready', 'triad readiness token missing');
has('app/ui-theme-triad.css', 'client-aurora', 'client aurora theme missing');
has('app/ui-theme-triad.css', 'manager-graphite', 'manager graphite theme missing');
has('app/ui-theme-triad.css', 'master-executive', 'master executive theme missing');
has('app/ui-theme-triad.css', 'xTriadSurfaceEnter', 'triad animation missing');
has('app/ui-theme-triad.css', 'prefers-reduced-motion', 'reduced motion fallback missing');
has('lib/ui-intelligence/theme-governance.ts', 'app/ui-theme-triad.css', 'typed governance must include triad owner file');

if (failures.length) {
  console.error('Triad theme guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Triad theme guard passed.');
