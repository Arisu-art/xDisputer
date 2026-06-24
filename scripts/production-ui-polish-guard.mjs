#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (file) => existsSync(file) ? readFileSync(file, 'utf8') : (failures.push(`missing ${file}`), '');
const must = (file, marker, message) => {
  if (!read(file).includes(marker)) failures.push(`${file}: ${message}`);
};
const before = (file, first, second, message) => {
  const source = read(file);
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  if (a < 0 || b < 0 || a >= b) failures.push(`${file}: ${message}`);
};

must('app/production-ui-polish-system.css', 'xDisputer Production UI Polish System', 'production polish CSS owner is required');
must('app/production-ui-polish-system.css', 'content-visibility: auto', 'performance containment is required for large lists');
must('app/production-ui-polish-system.css', 'backdrop-filter: none', 'expensive stacked blur must be disabled in heavy surfaces');
must('app/production-ui-polish-system.css', 'compact-command-header + .compact-command-header', 'duplicate header flattening rule is required');
must('app/production-ui-polish-system.css', 'master-account-row-v3', 'manager/master account rows must be included');
must('app/production-ui-polish-system.css', 'prefers-reduced-motion: reduce', 'reduced motion safety is required');

must('app/layout.tsx', "import './production-ui-polish-system.css';", 'root layout must import production polish CSS');
before('app/layout.tsx', './supporting-documents-center-canvas-contract.css', './production-ui-polish-system.css', 'production polish CSS must load after feature canvas CSS');

if (failures.length) {
  console.error(`production-ui-polish-guard failed: ${failures.length} issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('production-ui-polish-guard: ok');
