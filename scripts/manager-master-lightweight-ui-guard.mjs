#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, marker, label) => { if (!source.includes(marker)) failures.push(label); };
const mustNot = (source, marker, label) => { if (source.includes(marker)) failures.push(label); };

const shell = read('components/console/ConsoleShell.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const debuggerMount = read('components/console/RenderDebuggerMount.tsx');
const admin = read('app/admin/page.tsx');
const panels = read('lib/manager-console/manager-operations-panels.ts');
const manifest = read('lib/console/contracts/navigation-manifest.ts');
const performance = read('src/features/performance/performance-contract.ts');

must(shell, 'data-console-layout-ratio="75/25"', 'console shell must keep 75/25 layout contract');
must(shell, '<AccountMenu', 'console shell must delegate account rail to AccountMenu');
mustNot(shell, '<NotificationDock', 'console shell must not mount notification dock directly');
must(accountMenu, '<NotificationDock />', 'account rail must own notification dock');
must(debuggerMount, 'NEXT_PUBLIC_XDISPUTER_DEBUG_PANEL', 'debug panel must require explicit opt-in');
mustNot(debuggerMount, "process.env.NODE_ENV !== 'production') return true", 'debug panel must not auto-enable in development');
must(panels, "'output_activity'", 'manager operations must use output_activity id');
mustNot(admin, 'function PayrollPanel', 'manager admin page must not expose PayrollPanel');
must(admin, 'OutputActivityPanel', 'manager admin page must expose OutputActivityPanel');
must(manifest, "'master-governance'", 'master governance manifest must stay wired through shared console shell');
must(performance, 'debugPanelDefault', 'performance contract must define debug panel default rule');

if (failures.length) {
  console.error(`manager-master-lightweight-ui-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('manager-master-lightweight-ui-guard: ok');
