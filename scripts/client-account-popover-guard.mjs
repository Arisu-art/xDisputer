#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
function read(path) {
  if (!existsSync(path)) {
    failures.push('missing ' + path);
    return '';
  }
  return readFileSync(path, 'utf8');
}
function must(source, text, label) { if (!source.includes(text)) failures.push(label); }
function mustNot(source, text, label) { if (source.includes(text)) failures.push(label); }

const layout = read('app/layout.tsx');
const css = read('app/client-account-popover-ratio.css');
const bellAvatarCss = read('app/account-bell-avatar-row.css');
const accountMenu = read('components/console/AccountMenu.tsx');
const workspace = read('components/LetterGeneratorWorkspaceV2.tsx');
const dynamicChip = 'OutputLimit' + 'ResetChip';
const staticChip = 'Static' + 'Entitlement' + 'Chip';
const chipClass = 'output-limit' + '-reset-chip';
const chipMain = 'output-limit' + '-chip-main';
const staticClass = 'performance-static' + '-entitlement-chip';

must(layout, "import './client-account-popover-ratio.css';", 'root layout must load client account popover CSS');
must(layout, "import './account-popover-compact-retirement.css';", 'root layout must load compact popover CSS');
must(layout, "import './account-bell-avatar-row.css';", 'root layout must load bell/avatar row CSS');
must(css, '--client-account-popover-contract: canonical-console-account-dock', 'client must use canonical account dock contract');
must(css, 'main.app-shell[data-client-console-shell="true"]', 'client shell scoped selector missing');
must(css, 'data-console-role="client"', 'client role selector missing');
must(css, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width)', 'client account dock must use shared grid');
must(bellAvatarCss, '--account-bell-avatar-row-contract: bell-before-avatar-horizontal', 'bell/avatar row contract missing');
must(bellAvatarCss, 'order: 1', 'notification bell must be ordered before avatar');
must(bellAvatarCss, 'order: 2', 'avatar must be ordered after notification bell');
must(bellAvatarCss, 'flex-direction: row', 'account action dock must be horizontal');
must(bellAvatarCss, '--account-dock-width: clamp(112px, 30vw, 136px)', 'mobile account rail must be wide enough for bell and avatar row');
mustNot(css, chipClass, 'client account CSS still references retired chip class');
mustNot(css, chipMain, 'client account CSS still references retired chip internals');
mustNot(css, staticClass, 'client account CSS still references retired static chip');
mustNot(workspace, dynamicChip, 'client workspace still mounts retired dynamic chip');
mustNot(workspace, staticChip, 'client workspace still mounts retired static chip');
must(accountMenu, "type ConsoleRole = 'manager' | 'master' | 'client'", 'canonical account menu must support client role');
must(accountMenu, "if (role === 'client') return 'Client workspace account'", 'client account role label missing');
must(accountMenu, '<NotificationDock />', 'canonical account menu must render notification dock before avatar');
must(accountMenu, 'className="manager-header-account-avatar"', 'canonical account menu avatar button missing');
if (accountMenu.indexOf('<NotificationDock />') > accountMenu.indexOf('className="manager-header-account-avatar"')) failures.push('notification dock must appear before account avatar in AccountMenu DOM');
must(workspace, "import AccountMenu from './console/AccountMenu';", 'client workspace must import canonical AccountMenu');
must(workspace, 'data-client-console-shell="true"', 'client workspace shell marker missing');
must(workspace, 'className="main-area admin-monitor-main client-console-main"', 'client main class missing');
must(workspace, 'data-console-header-grid="true"', 'client grid marker missing');
must(workspace, '<AccountMenu role="client" mode="workspace"', 'client workspace must mount canonical AccountMenu');
must(workspace, 'data-console-header-primary="true"', 'client primary header marker missing');

if (failures.length) {
  console.error('client-account-popover-guard failed: ' + failures.length + ' check(s).');
  for (const failure of failures) console.error('- ' + failure);
  process.exit(1);
}
console.log('client-account-popover-guard: ok');
