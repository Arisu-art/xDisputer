#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) {
  if (!existsSync(path)) {
    failures.push(`missing ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}
function must(source, text, label) {
  if (!source.includes(text)) failures.push(label);
}

const layout = read('app/layout.tsx');
const css = read('app/client-account-popover-ratio.css');
const workspace = read('components/LetterGeneratorWorkspaceV2.tsx');

must(layout, "import './client-account-popover-ratio.css';", 'root layout must load client account popover CSS');
must(css, '--client-account-popover-contract: 70-30-header-popover', 'client account ratio contract marker missing');
must(css, 'grid-template-columns: minmax(0, var(--client-header-left-ratio)) var(--client-header-right-ratio)', 'client header must use 70/30 grid ratio');
must(css, '.app-shell .sidebar .workspace-account-card', 'client account card selector missing');
must(css, 'position: fixed !important', 'client account card must become header popover on desktop');
must(css, 'max-height: 0 !important', 'client account popover actions must collapse by default');
must(css, ':focus-within > button', 'client account popover must open on focus');
must(workspace, 'workspace-account-card', 'client workspace account card markup missing');
must(workspace, 'Account settings', 'client account settings action missing');
must(workspace, 'Sign out', 'client sign out action missing');

if (failures.length) {
  console.error(`client-account-popover-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('client-account-popover-guard: ok');
