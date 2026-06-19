#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };

const ownership = read('src/features/client-workspace/client-css-ownership.ts');
const clientAccount = read('app/client-account-popover-ratio.css');
const clientLayout = read('app/client-workspace-layout-lock.css');
const accountRatio = read('app/account-menu-ratio-system.css');
const layout = read('app/layout.tsx');

must(ownership, 'clientCssOwners', 'client CSS ownership manifest missing');
must(ownership, 'app/client-account-popover-ratio.css', 'client account CSS owner missing');
must(ownership, 'app/client-workspace-layout-lock.css', 'client layout CSS owner missing');
must(ownership, 'app/account-menu-ratio-system.css', 'shared account ratio CSS owner missing');
must(clientAccount, '--client-account-popover-contract: canonical-console-account-dock', 'client account CSS must own canonical dock contract');
must(clientAccount, '.workspace-header-actions .output-limit-reset-chip', 'client account CSS must hide duplicate header entitlement');
must(clientLayout, '--client-workspace-content-max', 'client layout CSS must own content max token');
must(clientLayout, '.dashboard-command-card', 'client layout CSS must own dashboard geometry');
must(accountRatio, 'data-manager-account-anchor="header-ratio-grid"', 'shared account ratio CSS must own header-ratio-grid dock');
must(layout, "import './client-account-popover-ratio.css';", 'root layout must import client account owner CSS');
must(layout, "import './client-workspace-layout-lock.css';", 'root layout must import client layout owner CSS');

if (failures.length) {
  console.error(`css-ownership-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('css-ownership-guard: ok');
