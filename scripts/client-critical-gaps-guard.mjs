#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const has = (source, text, label) => { if (!source.includes(text)) failures.push(label); };

const workspace = read('components/LetterGeneratorWorkspaceV2.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const accountCss = read('app/client-account-popover-ratio.css');
const layoutCss = read('app/client-workspace-layout-lock.css');
const contract = read('src/features/client-workspace/client-workspace-contract.ts');
const dashboard = read('src/features/client-workspace/client-dashboard-surface.ts');
const cssOwnership = read('src/features/client-workspace/client-css-ownership.ts');

for (const marker of [
  'large-client-workspace-component',
  'dashboard-header-duplication',
  'canonical-client-account-menu',
  'modernization-pending-slices',
  'client-css-cascade-conflicts',
  'clientWorkspaceGapSummary'
]) has(contract, marker, `contract marker missing: ${marker}`);

has(dashboard, "entitlementSurface: 'dashboard-command-card'", 'dashboard entitlement surface must be dashboard command card');
has(dashboard, "headerEntitlementSurface: 'hidden'", 'top header entitlement must be hidden');
has(dashboard, "accountSurface: 'canonical-account-dock'", 'dashboard account surface must be canonical dock');
has(cssOwnership, 'clientCssOwners', 'client CSS ownership map missing');
has(cssOwnership, 'clientCssOwnershipSummary', 'client CSS ownership summary missing');
has(accountMenu, "type ConsoleRole = 'manager' | 'master' | 'client'", 'canonical AccountMenu must support client role');
has(accountMenu, "Client workspace account", 'client AccountMenu label missing');
has(accountMenu, "Client packet workspace", 'client AccountMenu surface missing');
has(workspace, "import AccountMenu from './console/AccountMenu';", 'client workspace must import canonical AccountMenu');
has(workspace, 'data-client-console-shell="true"', 'client workspace shell marker missing');
has(workspace, 'className="main-area admin-monitor-main client-console-main"', 'client workspace must use canonical account grid class');
has(workspace, '<AccountMenu role="client" mode="workspace"', 'client workspace must mount canonical AccountMenu');
has(workspace, 'data-console-header-primary="true"', 'client header must be primary console header');
has(accountCss, '--client-account-popover-contract: canonical-console-account-dock', 'client account CSS must use canonical dock contract');
has(accountCss, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width)', 'client account dock ratio missing');
has(accountCss, '.workspace-header-actions .output-limit-reset-chip', 'duplicate header entitlement selector missing');
has(accountCss, 'display: none !important', 'duplicate header entitlement must be hidden');
has(accountCss, '.dashboard-command-card .output-limit-reset-chip', 'dashboard entitlement selector missing');
has(layoutCss, '--client-workspace-content-max', 'client layout max width token missing');
has(layoutCss, '.dashboard-command-card', 'client dashboard card cleanup missing');
has(layoutCss, '.dashboard-operational-metrics', 'client metrics layout cleanup missing');
has(layoutCss, '.compact-case-row', 'client recent work cleanup missing');

if (failures.length) {
  console.error(`client-critical-gaps-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('client-critical-gaps-guard: ok');
