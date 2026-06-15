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
const managerAccountMenu = read('components/ManagerAccountMenu.tsx');
const renderDebugger = read('components/console/RenderDebugger.tsx');
const registry = read('components/console/ui-shell-registry.ts');
const managerShell = read('components/ManagerConsoleShell.tsx');
const masterHome = read('app/master/MasterConsoleHome.tsx');
const masterAccounts = read('app/master/accounts/page.tsx');
const masterWorkspaces = read('app/master/workspaces/page.tsx');
const masterSystem = read('app/master/system/page.tsx');
const masterRecovery = read('app/master/recovery/page.tsx');
const managerAccess = read('app/admin/access/page.tsx');
const managerClients = read('app/admin/clients/page.tsx');
const reportView = read('components/GenerationReportView.tsx');
const accessAuditView = read('components/AccessAuditView.tsx');
const layout = read('app/layout.tsx');
const packageJson = read('package.json');
const phase14 = read('scripts/phase14-local-safety-check.mjs');
const shellCss = read('app/console-shell-system.css');
const ratioCss = read('app/account-menu-ratio-system.css');
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
notHas(consoleShell, '<ManagerAccountMenu', 'ConsoleShell no longer mounts legacy ManagerAccountMenu');
notHas(consoleShell, 'action="/auth/sign-out"', 'ConsoleShell does not duplicate account actions');

has(consoleHeader, 'data-console-header="true"', 'ConsoleHeader exposes header marker');
has(consoleHeader, 'export type ConsoleHeaderProps', 'ConsoleHeader exports typed props');
has(accountMenu, 'data-console-account-menu="true"', 'AccountMenu exposes shared marker');
has(accountMenu, 'data-manager-account-anchor="header-ratio-grid"', 'AccountMenu exposes header ratio anchor marker');
has(accountMenu, 'data-manager-account-popover-align="below-right"', 'AccountMenu exposes responsive popover alignment marker');
has(accountMenu, "role === 'master'", 'AccountMenu supports master role behavior');
has(accountMenu, 'data-manager-canonical-switch="true"', 'AccountMenu keeps canonical switch contract');
has(managerAccountMenu, '<AccountMenu', 'compat ManagerAccountMenu forwards to shared AccountMenu');
has(renderDebugger, 'window.__xdisputerDebug', 'RenderDebugger exposes debug global');
has(renderDebugger, 'document.styleSheets', 'RenderDebugger inspects loaded CSS');
has(layout, '<RenderDebugger />', 'root layout mounts RenderDebugger');
has(layout, "import './console-debug-overlay.css';", 'root layout imports debugger CSS');
has(registry, 'UI_SHELL_ROUTE_EXPECTATIONS', 'UI shell registry exports route expectations');
has(registry, 'UI_SHELL_CANONICAL_COMPONENTS', 'UI shell registry exports canonical components');

delegates('ManagerConsoleShell', managerShell);
delegates('/master', masterHome);
delegates('/master/accounts', masterAccounts);
delegates('/master/workspaces', masterWorkspaces);
delegates('/master/system', masterSystem);
delegates('/master/recovery', masterRecovery);
delegates('/admin/access', managerAccess);
delegates('/admin/clients', managerClients);
delegates('GenerationReportView', reportView);
delegates('AccessAuditView', accessAuditView);

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
has(ratioCss, '--account-dock-width: minmax(220px, 1fr)', 'Ratio CSS keeps 75/25 account column contract');
has(ratioCss, 'grid-template-columns: minmax(0, 3fr) var(--account-dock-width)', 'Ratio CSS enforces 3fr/1fr header grid');
has(ratioCss, '--account-popover-top: calc(100% + clamp(.55rem, .9vw, .8rem))', 'Ratio CSS anchors popover below header dock');
has(ratioCss, 'data-manager-account-popover-align="below-right"', 'Ratio CSS targets explicit popover alignment marker');
has(ratioCss, '@media (max-width: 760px)', 'Ratio CSS has mobile alignment breakpoint');
has(ratioCss, '@media (max-width: 480px)', 'Ratio CSS has small-screen alignment breakpoint');

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
