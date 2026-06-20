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
function mustNot(source, text, label) {
  if (source.includes(text)) failures.push(label);
}

const layout = read('app/layout.tsx');
const css = read('app/client-account-popover-ratio.css');
const accountMenu = read('components/console/AccountMenu.tsx');
const workspace = read('components/LetterGeneratorWorkspaceV2.tsx');

const retiredDynamicChip = 'OutputLimit' + 'ResetChip';
const retiredStaticChip = 'Static' + 'Entitlement' + 'Chip';
const retiredChipClass = 'output-limit' + '-reset-chip';
const retiredChipMain = 'output-limit' + '-chip-main';
const retiredStaticClass = 'performance-static' + '-entitlement-chip';

must(layout, "import './client-account-popover-ratio.css';", 'root layout must load client account popover CSS');
must(css, '--client-account-popover-contract: canonical-console-account-dock', 'client must use canonical console account dock contract');
must(css, 'main.app-shell[data-client-console-shell="true"]', 'client shell scoped selector missing');
must(css, 'data-console-role="client"', 'client role selector missing');
must(css, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width)', 'client account dock must use shared 75/25-style grid');

mustNot(css, retiredChipClass, 'client account CSS must not reference retired output chip class');
mustNot(css, retiredChipMain, 'client account CSS must not reference retired output chip internals');
mustNot(css, retiredStaticClass, 'client account CSS must not reference retired static chip class');
mustNot(workspace, retiredDynamicChip, 'client workspace must not mount retired dynamic output chip');
mustNot(workspace, retiredStaticChip, 'client workspace must not mount retired static entitlement chip');

must(accountMenu, "type ConsoleRole = 'manager' | 'master' | 'client'", 'canonical account menu must support client role');
must(accountMenu, "if (role === 'client') return 'Client workspace account'", 'client account role label missing');
must(workspace, "import AccountMenu from './console/AccountMenu';", 'client workspace must import canonical AccountMenu');
must(workspace, 'data-client-console-shell="true"', 'client workspace shell marker missing');
must(workspace, 'className="main-area admin-monitor-main client-console-main"', 'client main must use canonical console main class');
must(workspace, 'data-console-header-grid="true"', 'client main must use account ratio grid');
must(workspace, '<AccountMenu role="client" mode="workspace"', 'client workspace must mount canonical AccountMenu');
must(workspace, 'data-console-header-primary="true"', 'client header must be primary console header');
mustNot(workspace, 'workspace-account-card"><div>', 'legacy sidebar account card must not render in client workspace');

if (failures.length) {
  console.error(`client-account-popover-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('client-account-popover-guard: ok');
