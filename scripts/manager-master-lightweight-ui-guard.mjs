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
const masterHome = read('app/master/MasterConsoleHome.tsx');
const managerKpis = read('src/features/manager-console/components/ManagerKpiGrid.tsx');
const masterKpis = read('src/features/master-console/components/MasterKpiGrid.tsx');
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
must(admin, 'ManagerKpiGrid', 'manager admin page must use feature-owned KPI grid');
must(admin, 'accountsForPanel', 'manager admin page must route data by active panel');
must(admin, 'let pendingPromise', 'manager admin page must use lazy panel-specific data promises');
must(admin, "if (activePanel === 'monitoring')", 'manager monitoring panel must load only monitoring datasets');
must(admin, "activePanel === 'access' || activePanel === 'reports'", 'manager access/report panels must share one all-clients dataset');
must(admin, "activePanel === 'output_activity'", 'manager output activity must load only active accounts');
must(admin, 'needsUserSettings', 'manager user settings must only load for panels that render payroll metadata');
mustNot(admin, 'ensureManagerInviteCode(supabase, user.id) : Promise.resolve', 'manager invite code must not be fetched for every panel');
mustNot(admin, 'const allAccounts = uniqueAccounts(pendingResult.accounts, activeResult.accounts, blockedResult.accounts)', 'manager admin page must not build all accounts from every status on every panel');
must(managerKpis, 'manager-console-kpi-grid', 'manager KPI grid component must preserve premium card layout');
must(masterHome, 'MasterKpiGrid', 'master home must use feature-owned KPI grid');
must(masterKpis, 'master-monitoring-stats', 'master KPI grid component must preserve master stats layout');
must(manifest, "'master-governance'", 'master governance manifest must stay wired through shared console shell');
must(performance, 'debugPanelDefault', 'performance contract must define debug panel default rule');

if (failures.length) {
  console.error(`manager-master-lightweight-ui-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('manager-master-lightweight-ui-guard: ok');
