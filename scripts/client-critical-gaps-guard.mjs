#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const has = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const lacks = (source, text, label) => { if (source.includes(text)) failures.push(label); };

const workspace = read('components/LetterGeneratorWorkspaceV2.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const accountCss = read('app/client-account-popover-ratio.css');
const layoutCss = read('app/client-workspace-layout-lock.css');
const contract = read('src/features/client-workspace/client-workspace-contract.ts');
const dashboard = read('src/features/client-workspace/client-dashboard-surface.ts');
const cssOwnership = read('src/features/client-workspace/client-css-ownership.ts');

const retiredA = 'output-limit' + '-reset-chip';
const retiredB = 'output-limit' + '-chip-main';
const retiredC = 'performance-static' + '-entitlement-chip';
const retiredD = 'OutputLimit' + 'ResetChip';
const retiredE = 'Static' + 'Entitlement' + 'Chip';

for (const marker of ['large-client-workspace-component', 'dashboard-header-duplication', 'canonical-client-account-menu', 'modernization-pending-slices', 'client-css-cascade-conflicts', 'clientWorkspaceGapSummary']) has(contract, marker, `contract marker missing: ${marker}`);

has(dashboard, "entitlementSurface: 'retired'", 'dashboard entitlement surface must be retired');
has(dashboard, "headerEntitlementSurface: 'retired'", 'top header entitlement surface must be retired');
has(dashboard, "accountSurface: 'canonical-account-dock'", 'dashboard account surface must be canonical dock');
lacks(dashboard, retiredD, 'dashboard contract still references retired dynamic chip');
lacks(dashboard, retiredE, 'dashboard contract still references retired static chip');
has(cssOwnership, 'clientCssOwners', 'client CSS ownership map missing');
has(cssOwnership, 'clientCssOwnershipSummary', 'client CSS ownership summary missing');
has(accountMenu, "type ConsoleRole = 'manager' | 'master' | 'client'", 'canonical AccountMenu must support client role');
has(accountMenu, 'Client workspace account', 'client AccountMenu label missing');
has(accountMenu, 'Client packet workspace', 'client AccountMenu surface missing');
has(workspace, "import AccountMenu from './console/AccountMenu';", 'client workspace must import canonical AccountMenu');
has(workspace, 'data-client-console-shell="true"', 'client workspace shell marker missing');
has(workspace, 'className="main-area admin-monitor-main client-console-main"', 'client workspace must use canonical account grid class');
has(workspace, '<AccountMenu role="client" mode="workspace"', 'client workspace must mount canonical AccountMenu');
has(workspace, 'data-console-header-primary="true"', 'client header must be primary console header');
has(accountCss, '--client-account-popover-contract: canonical-console-account-dock', 'client account CSS must use canonical dock contract');
has(accountCss, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width)', 'client account dock ratio missing');
lacks(accountCss, retiredA, 'client account CSS still references retired chip class');
lacks(accountCss, retiredB, 'client account CSS still references retired chip internals');
lacks(accountCss, retiredC, 'client account CSS still references retired static chip');
has(layoutCss, '--client-workspace-content-max', 'client layout max width token missing');
has(layoutCss, '.dashboard-command-card', 'client dashboard card cleanup missing');
has(layoutCss, '.dashboard-operational-metrics', 'client metrics layout cleanup missing');
has(layoutCss, '.compact-case-row', 'client recent work cleanup missing');
lacks(layoutCss, retiredA, 'client layout CSS still references retired chip class');
lacks(layoutCss, retiredB, 'client layout CSS still references retired chip internals');
lacks(layoutCss, retiredC, 'client layout CSS still references retired static chip');
lacks(workspace, retiredD, 'client workspace still references retired dynamic chip');
lacks(workspace, retiredE, 'client workspace still references retired static chip');

if (failures.length) {
  console.error(`client-critical-gaps-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('client-critical-gaps-guard: ok');
