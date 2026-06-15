#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const checks = [];
function read(path) {
  const ok = existsSync(path);
  checks.push({ ok, label: `file exists: ${path}` });
  return ok ? readFileSync(path, 'utf8') : '';
}
function has(source, term, label) { checks.push({ ok: source.includes(term), label }); }
function notHas(source, term, label) { checks.push({ ok: !source.includes(term), label }); }
function delegates(path, source) {
  has(source, '<ConsoleShell', `${path} delegates to ConsoleShell`);
  notHas(source, '<aside className="admin-monitor-sidebar', `${path} does not own sidebar markup`);
  notHas(source, '<section className="admin-monitor-main', `${path} does not own main markup`);
  notHas(source, 'className="admin-monitor-account"', `${path} has no old account footer`);
}

const consoleShell = read('components/console/ConsoleShell.tsx');
const consoleHeader = read('components/console/ConsoleHeader.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const accountProfileRoute = read('app/api/account/profile/route.ts');
const finalAccountRailCss = read('app/final-console-account-rail.css');
const managerAccountMenu = read('components/ManagerAccountMenu.tsx');
const renderDebugger = read('components/console/RenderDebugger.tsx');
const registry = read('components/console/ui-shell-registry.ts');
const managerShell = read('components/ManagerConsoleShell.tsx');
const adminLayout = read('app/admin/layout.tsx');
const masterLayout = read('app/master/layout.tsx');
const adminPage = read('app/admin/page.tsx');
const managerWorkspacePage = read('app/manager-workspace/page.tsx');
const masterHome = read('app/master/MasterConsoleHome.tsx');
const masterAccounts = read('app/master/accounts/page.tsx');
const masterWorkspaces = read('app/master/workspaces/page.tsx');
const masterSystem = read('app/master/system/page.tsx');
const masterRecovery = read('app/master/recovery/page.tsx');
const managerAccess = read('app/admin/access/page.tsx');
const managerClients = read('app/admin/clients/page.tsx');
const reportView = read('components/GenerationReportView.tsx');
const accessAuditView = read('components/AccessAuditView.tsx');
const controlShell = read('components/control/ControlConsoleShell.tsx');
const layout = read('app/layout.tsx');
const packageJson = read('package.json');
const phase14 = read('scripts/phase14-local-safety-check.mjs');
const shellCss = read('app/console-shell-system.css');
const ratioCss = read('app/account-menu-ratio-system.css');
const reportWorkbenchCss = read('app/report-workbench-system.css');
const roadmap = read('docs/ui-shell-roadmap-tracker.md');
const mcoder = read('scripts/mcoder-deployment-gate.mjs');
const smokeSpec = read('tests/ui-shell-smoke.spec.ts');
const playwrightConfig = read('playwright.config.ts');
const deployWorkflow = read('.github/workflows/deploy-approved.yml');
const deploymentMigration = read('supabase/migrations/20260615080000_mcoder_deployment_gate.sql');

has(consoleShell, 'data-console-shell="true"', 'ConsoleShell owns global shell marker');
has(consoleShell, 'data-console-sidebar="true"', 'ConsoleShell owns global sidebar marker');
has(consoleShell, 'data-console-main="true"', 'ConsoleShell owns global main marker');
has(consoleShell, 'data-console-layout-ratio="75/25"', 'ConsoleShell exposes active ratio marker');
has(consoleShell, '<ConsoleHeader', 'ConsoleShell owns ConsoleHeader placement');
has(consoleShell, '<AccountMenu', 'ConsoleShell owns shared AccountMenu placement');
has(consoleShell, 'displayName={accountName}', 'ConsoleShell passes profile display name to AccountMenu');
has(consoleShell, 'switchModeContract', 'ConsoleShell owns advanced switch mode intent logic');
has(consoleShell, 'data-console-mode-switch="sidebar-bottom"', 'ConsoleShell renders mode switch at sidebar bottom');
has(consoleShell, 'data-manager-switch-visible-slot="sidebar-bottom"', 'ConsoleShell exposes canonical switch only in sidebar bottom');
notHas(consoleShell, '<ManagerAccountMenu', 'ConsoleShell no longer mounts legacy ManagerAccountMenu');
notHas(consoleShell, 'action="/auth/sign-out"', 'ConsoleShell does not duplicate account actions');

has(consoleHeader, 'data-console-header="true"', 'ConsoleHeader exposes header marker');
has(consoleHeader, 'export type ConsoleHeaderProps', 'ConsoleHeader exports typed props');
has(accountMenu, 'data-console-account-menu="true"', 'AccountMenu exposes shared marker');
has(accountMenu, 'displayName?: string | null', 'AccountMenu accepts profile display name');
has(accountMenu, 'displayNameFromIdentity(displayName, email)', 'AccountMenu resolves display name from profile before email fallback');
has(accountMenu, 'data-manager-account-anchor="header-ratio-grid"', 'AccountMenu exposes header ratio anchor marker');
has(accountMenu, 'data-manager-account-popover-align="same-rail"', 'AccountMenu pins popover to same rail instead of dropdown');
has(accountMenu, 'manager-account-function-panel', 'AccountMenu exposes active account function panel');
has(accountMenu, 'manager-account-settings-form', 'AccountMenu exposes account settings form');
has(accountMenu, 'action="/api/account/profile"', 'AccountMenu updates active account settings through API');
has(accountMenu, 'data-account-rail-contract="true"', 'AccountMenu carries final rail contract');
notHas(accountMenu, 'Manage accounts', 'AccountMenu does not expose global shortcut links');
notHas(accountMenu, 'Reports', 'AccountMenu does not expose report shortcut links');
notHas(accountMenu, 'System health', 'AccountMenu does not expose system shortcut links');
notHas(accountMenu, 'data-manager-canonical-switch="true"', 'AccountMenu no longer exposes switch shortcut in account settings');
has(accountProfileRoute, 'upsert({ id: user.id', 'Account profile API upserts current profile');
has(accountProfileRoute, 'NextResponse.redirect(url, { status: 303 })', 'Account profile API uses POST-safe redirect');
has(accountProfileRoute, "revalidatePath('/', 'layout')", 'Account profile API revalidates layout after save');
has(accountProfileRoute, 'supabase.auth.updateUser', 'Account profile API syncs auth metadata');
has(finalAccountRailCss, 'data-manager-account-popover-align="same-rail"', 'Final account rail CSS anchors popover on same rail');
has(finalAccountRailCss, '.manager-account-settings-form', 'Final account rail CSS styles settings form');
has(finalAccountRailCss, '.manager-account-function-panel', 'Final account rail CSS styles account function panel');
has(finalAccountRailCss, '.console-sidebar-mode-switch', 'Final account rail CSS styles bottom sidebar mode switch');
has(finalAccountRailCss, 'margin-top: auto !important', 'Bottom sidebar switch is pinned to bottom of side navigation');
has(finalAccountRailCss, 'animation: consoleSwitchPulse', 'Bottom sidebar switch has visible pulse animation');
has(finalAccountRailCss, '@keyframes consoleSwitchPulse', 'Bottom sidebar switch animation keyframes exist');
has(managerAccountMenu, '<AccountMenu', 'compat ManagerAccountMenu forwards to shared AccountMenu');
has(managerShell, 'accountName?: string | null', 'Manager shell forwards account profile name');
has(adminPage, 'accountName={profile?.full_name', 'Admin page binds account settings to profile name');
has(managerWorkspacePage, 'accountName={session.profile?.full_name', 'Workspace page binds account settings to profile name');
has(renderDebugger, 'window.__xdisputerDebug', 'RenderDebugger exposes debug global');
has(renderDebugger, 'findShellElement', 'RenderDebugger retries shell lookup with fallback selectors');
has(renderDebugger, 'MutationObserver(sync)', 'RenderDebugger observes body for delayed shell mount');
has(renderDebugger, 'headerAccountWidthRatio', 'RenderDebugger reports real header/account width ratio');
has(renderDebugger, 'detectionMode', 'RenderDebugger reports canonical versus fallback detection');
has(renderDebugger, 'document.styleSheets', 'RenderDebugger inspects loaded CSS');
has(layout, '<RenderDebugger />', 'root layout mounts RenderDebugger');
has(layout, "import './console-debug-overlay.css';", 'root layout imports debugger CSS');
has(layout, "import './report-workbench-system.css';", 'root layout imports report workbench system after ratio CSS');
has(layout, "import './final-console-account-rail.css';", 'root layout imports final account rail CSS');
has(registry, 'UI_SHELL_ROUTE_EXPECTATIONS', 'UI shell registry exports route expectations');
has(registry, 'UI_SHELL_CANONICAL_COMPONENTS', 'UI shell registry exports canonical components');

notHas(adminLayout, 'ControlConsoleShell', 'admin layout must not wrap canonical pages in legacy control shell');
notHas(masterLayout, 'ControlConsoleShell', 'master layout must not wrap canonical pages in legacy control shell');
has(adminLayout, 'return <>{children}</>', 'admin layout is a pass-through role gate');
has(masterLayout, 'return <>{children}</>', 'master layout is a pass-through role gate');
notHas(controlShell, 'admin-monitor-account', 'legacy control shell has no duplicate sidebar account footer');

delegates('ManagerConsoleShell', managerShell);
delegates('/admin', adminPage);
delegates('/master', masterHome);
delegates('/master/accounts', masterAccounts);
delegates('/master/workspaces', masterWorkspaces);
delegates('/master/system', masterSystem);
delegates('/master/recovery', masterRecovery);
delegates('/admin/access', managerAccess);
delegates('/admin/clients', managerClients);
delegates('GenerationReportView', reportView);
delegates('AccessAuditView', accessAuditView);
has(reportView, 'header={{ eyebrow, title, description }}', 'Generation report uses canonical ConsoleHeader instead of custom overflowing header');
has(reportView, 'data-report-workbench="filters-activity-merged"', 'Generation report merges filters and activity into workbench card');
notHas(reportView, 'report-side-summary', 'Generation report no longer uses overlapping side summary inside header');
notHas(reportView, 'compact-report-hero', 'Generation report no longer uses custom compact report hero');

has(packageJson, '"ui-source:guard"', 'package defines ui-source:guard');
has(packageJson, '"ui-shell:registry"', 'package defines registry guard script');
has(packageJson, '"ui-shell:smoke"', 'package defines screenshot smoke audit script');
has(packageJson, '"mcoder:check"', 'package defines mcoder check script');
notHas(packageJson, 'apply-manager-workspace-nav-wiring.mjs', 'package no longer auto-runs workspace wiring');
notHas(packageJson, 'apply-user-error-flyout-wiring.mjs', 'package no longer auto-runs flyout wiring');
notHas(phase14, 'runSelfHealingScript(', 'phase14 no longer rewrites source');
has(phase14, 'verification-only mode', 'phase14 is verification-only');
has(shellCss, '.console-header-card', 'console shell CSS defines shared header card');
has(shellCss, '.console-header-secondary', 'console shell CSS defines secondary header slot');
has(ratioCss, "@import './console-shell-system.css';", 'Ratio CSS chains global console shell CSS');
has(ratioCss, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width)', 'Ratio CSS enforces 3fr/1fr header grid');
has(reportWorkbenchCss, '.report-workbench-card', 'Report workbench CSS defines merged card shell');
has(reportWorkbenchCss, '.report-workbench-grid', 'Report workbench CSS defines filters/activity split grid');
has(reportWorkbenchCss, '.report-workbench-event-list', 'Report workbench CSS defines scrollable activity list');
has(reportWorkbenchCss, '@media (max-width: 1060px)', 'Report workbench CSS collapses to one column on smaller screens');

has(mcoder, 'request_deployment_approval_service', 'MCoder CLI can request deployment approval');
has(mcoder, 'assert_deployment_approval_service', 'MCoder CLI can check approval');
has(mcoder, 'consume_deployment_approval_service', 'MCoder CLI can consume approval');
has(deploymentMigration, 'create table if not exists public.deployment_requests', 'MCoder migration creates deployment_requests table');
has(deploymentMigration, 'request_deployment_approval_service', 'MCoder migration creates request RPC');
has(deploymentMigration, 'consume_deployment_approval_service', 'MCoder migration creates consume RPC');
has(deployWorkflow, 'Deploy approved build', 'approved deploy workflow exists');
has(deployWorkflow, 'npm run mcoder:check', 'approved deploy workflow checks MCoder approval');
has(deployWorkflow, 'npm run mcoder:consume', 'approved deploy workflow consumes approval');
has(smokeSpec, 'window.__xdisputerDebug', 'smoke test reads render debugger');
has(smokeSpec, 'toHaveScreenshot', 'smoke test captures route screenshots');
has(playwrightConfig, 'defineConfig', 'Playwright config is present');

has(roadmap, 'Phase F — M-coder deployment gate | Implemented', 'roadmap tracks Phase F implemented');
has(roadmap, 'Phase G — Route screenshot smoke audit | Implemented', 'roadmap tracks Phase G implemented');

checks.forEach((check) => console.log(`${check.ok ? '✅' : '❌'} ${check.label}`));
const failed = checks.filter((check) => !check.ok);
if (failed.length) {
  console.error(`\nConsole shell contract guard failed: ${failed.length} check(s) failed.`);
  process.exit(1);
}
console.log(`\nConsole shell contract guard passed: ${checks.length} check(s).`);
