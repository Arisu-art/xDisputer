#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const warnings = [];

const EXCLUDED_DIRS = new Set([
  '.git',
  '.next',
  '.xdisputer-cache',
  'node_modules',
  'coverage',
  'dist',
  'build'
]);

const TEXT_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.md', '.sql'
]);

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function file(pathname) {
  const full = path.join(root, pathname);
  if (!existsSync(full)) {
    fail(`missing required file: ${pathname}`);
    return '';
  }
  return readFileSync(full, 'utf8');
}

function assertIncludes(source, marker, message) {
  if (!source.includes(marker)) fail(message);
}

function assertNotIncludes(source, marker, message) {
  if (source.includes(marker)) fail(message);
}

function assertBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex >= secondIndex) fail(message);
}

function walk(dir, output = []) {
  if (!existsSync(dir)) return output;
  for (const entry of readdirSync(dir)) {
    const absolute = path.join(dir, entry);
    const relative = path.relative(root, absolute).replaceAll('\\', '/');
    const stat = statSync(absolute);
    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry)) walk(absolute, output);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(entry))) continue;
    output.push(relative);
  }
  return output;
}

function readMany(files) {
  return Object.fromEntries(files.map((name) => [name, file(name)]));
}

function sourceFilesForGlobalScan() {
  const roots = ['app', 'components', 'src', 'lib'];
  return roots.flatMap((dir) => walk(path.join(root, dir))).filter((name) => !name.endsWith('.md'));
}

function hasForbiddenRouterRefreshInterval(source) {
  return /setInterval\s*\([\s\S]{0,240}router\.refresh\s*\(/m.test(source)
    || /setInterval\s*\([\s\S]{0,240}refresh\s*\(/m.test(source) && source.includes("from 'next/navigation'");
}

function hasBroadPanelButtonCss(source) {
  return /(^|[}\n]\s*)\.panel\s+button\s*[{,]/m.test(source)
    || /(^|[}\n]\s*)button\s*[{,]/m.test(source);
}

function countOccurrences(source, marker) {
  return source.split(marker).length - 1;
}

const required = readMany([
  'docs/website-stability-cleanup-canvas.md',
  'app/layout.tsx',
  'package.json',
  'scripts/guard-bundle-runner.mjs',
  'src/features/notifications/useOwnedNotifications.ts',
  'components/notifications/OwnedNotificationDock.tsx',
  'components/notifications/OutputActivityUnreadBadgeMount.tsx',
  'components/notifications/OutputActivityRealtimeRefreshMount.tsx',
  'components/console/AutoRouteRefresh.tsx',
  'lib/notifications/notification-service.ts',
  'src/features/notifications/notification-api-service.ts',
  'src/features/notifications/bell-notification-repair-service.ts',
  'app/admin/output-activity-v2/page.tsx',
  'app/api/manager/output-activity/route.ts',
  'app/api/manager/output-activity/clear/route.ts',
  'src/features/manager-output-activity/manager-output-clear-service.ts',
  'components/SupportingDocumentsSetup.tsx',
  'components/SupportingDocumentsLayoutEditor.tsx',
  'components/TemplateProgressiveWorkspace.tsx',
  'app/workflow-header-slim.css',
  'app/supporting-documents-layout-polish.css',
  'app/supporting-documents-wide-stage.css'
]);

// Canvas contract must document the exact stability risks this guard enforces.
assertIncludes(required['docs/website-stability-cleanup-canvas.md'], 'Architecture rule: one owner per state', 'stability canvas must document one-owner state rule');
assertIncludes(required['docs/website-stability-cleanup-canvas.md'], 'No removeAllChannels', 'stability canvas must document channel cleanup guard');
assertIncludes(required['docs/website-stability-cleanup-canvas.md'], 'scripts/website-stability-guard.mjs', 'stability canvas must name website-stability guard script');
assertIncludes(required['docs/website-stability-cleanup-canvas.md'], 'No native file input visible inside Supporting Documents upload cards', 'stability canvas must protect Supporting Documents upload UX');

// Package and bundle wiring.
assertIncludes(required['package.json'], 'website-stability:guard', 'package.json must expose website-stability:guard');
assertIncludes(required['package.json'], 'scripts/website-stability-guard.mjs', 'package.json website-stability script must run the guard file');
assertIncludes(required['scripts/guard-bundle-runner.mjs'], 'scripts/website-stability-guard.mjs', 'guard bundle runner must include website-stability guard');
assertBefore(required['app/layout.tsx'], "./workflow-header-slim.css", "./supporting-documents-layout-polish.css", 'layout must load workflow header slim before Supporting Documents polish');
assertBefore(required['app/layout.tsx'], "./supporting-documents-layout-polish.css", "./supporting-documents-wide-stage.css", 'layout must load wide Supporting Documents stage after base Supporting Documents polish');
assertIncludes(required['app/layout.tsx'], "./supporting-documents-wide-stage.css", 'layout must import wide Supporting Documents stage CSS');

// Notification stability and ownership.
assertIncludes(required['src/features/notifications/useOwnedNotifications.ts'], 'useSyncExternalStore', 'notification hook must own one external store');
assertIncludes(required['src/features/notifications/useOwnedNotifications.ts'], 'onAuthStateChange', 'notification hook must reset on auth user changes');
assertIncludes(required['src/features/notifications/useOwnedNotifications.ts'], 'removeChannel(owned)', 'notification hook must remove only its own realtime channel');
assertIncludes(required['src/features/notifications/useOwnedNotifications.ts'], 'manager_disputer_output_approvals', 'notification hook must listen to Output Activity changes');
assertIncludes(required['src/features/notifications/useOwnedNotifications.ts'], 'xdisputer-notification-state-v2', 'notification local state must be versioned and user scoped');
assertIncludes(required['src/features/notifications/useOwnedNotifications.ts'], "${STORAGE_PREFIX}:${userId || 'anonymous'}", 'notification storage key must include current user id');
assertIncludes(required['src/features/notifications/useOwnedNotifications.ts'], 'applyLocalState', 'notification hook must bridge read/clear state for virtual rows');
assertIncludes(required['src/features/notifications/useOwnedNotifications.ts'], 'clearLocalReadOnly', 'notification hook must locally clear read virtual rows');
assertIncludes(required['components/notifications/OwnedNotificationDock.tsx'], 'useOwnedNotifications', 'notification dock must consume owned notification hook');
assertIncludes(required['components/notifications/OwnedNotificationDock.tsx'], 'useRouter', 'notification dock Open/Review must use router navigation');
assertIncludes(required['components/notifications/OwnedNotificationDock.tsx'], 'notification-dock-detail-backdrop', 'notification dock must use lightweight detail flyover');
assertIncludes(required['components/notifications/OwnedNotificationDock.tsx'], '×', 'notification flyover/popover must expose X close controls');
assertIncludes(required['components/notifications/OutputActivityUnreadBadgeMount.tsx'], 'useOwnedNotifications', 'Output Activity unread badge must consume owned notification hook');
assertIncludes(required['components/notifications/OutputActivityRealtimeRefreshMount.tsx'], 'removeChannel(channel)', 'Output Activity refresh bridge must remove only its own channel');
assertIncludes(required['components/console/AutoRouteRefresh.tsx'], 'xdisputer:notifications-refreshed', 'AutoRouteRefresh must be event-driven from notification state');
assertNotIncludes(required['components/console/AutoRouteRefresh.tsx'], 'setInterval', 'AutoRouteRefresh must not run a permanent interval');

// Notification API must be fetch-first and self-healing.
assertIncludes(required['src/features/notifications/notification-api-service.ts'], 'repairBellNotificationsForUser', 'notification API must repair bell rows before reading');
assertIncludes(required['src/features/notifications/notification-api-service.ts'], 'listNotifications', 'notification API must read through canonical notification service');
assertIncludes(required['lib/notifications/notification-service.ts'], 'outputActivityFallbackNotifications', 'notification service must bridge Output Activity fallback rows');
assertIncludes(required['lib/notifications/notification-service.ts'], 'virtualManagerNotification', 'notification service must create manager virtual rows from Output Activity');
assertIncludes(required['lib/notifications/notification-service.ts'], 'virtualClientNotification', 'notification service must create client virtual rows from Output Activity');
assertIncludes(required['src/features/notifications/bell-notification-repair-service.ts'], 'hrefExists', 'bell repair must dedupe by href before inserting');
assertIncludes(required['src/features/notifications/bell-notification-repair-service.ts'], 'manager_disputer_output_approvals', 'bell repair must source rows from Output Activity table');

// Output Activity page and clear history stability.
assertIncludes(required['app/admin/output-activity-v2/page.tsx'], 'OutputActivityToolbar', 'Output Activity page must expose clear-history toolbar');
assertIncludes(required['app/admin/output-activity-v2/page.tsx'], 'formatPHDateTime', 'Output Activity page must show PH generation time');
assertIncludes(required['app/admin/output-activity-v2/page.tsx'], 'listManagerOutputApprovals(supabase, user.id, [], filter)', 'Output Activity page must read all manager rows, not active-client page ids');
assertIncludes(required['app/api/manager/output-activity/route.ts'], 'listManagerOutputApprovals(supabase, user.id, [], filter)', 'Output Activity JSON route must read all manager rows');
assertIncludes(required['app/api/manager/output-activity/clear/route.ts'], 'clearManagerOutputHistory', 'Output Activity clear route must use clear service');
assertIncludes(required['src/features/manager-output-activity/manager-output-clear-service.ts'], "row.is_per_output === true && row.status === 'pending'", 'clear service must preserve pending per-output rows');
assertIncludes(required['src/features/manager-output-activity/manager-output-clear-service.ts'], "from('notifications').delete()", 'clear service must clean related notification rows');

// Supporting Documents layout and copy stability.
assertIncludes(required['components/SupportingDocumentsSetup.tsx'], 'Supporting Documents ready for layout', 'Supporting Documents ready copy must replace Evidence wording');
assertIncludes(required['components/SupportingDocumentsSetup.tsx'], 'Upload supporting documents', 'Supporting Documents upload copy must replace Evidence wording');
assertIncludes(required['components/SupportingDocumentsSetup.tsx'], 'supporting-documents-panel-v2', 'Supporting Documents setup must expose scoped layout hook classes');
assertIncludes(required['app/supporting-documents-layout-polish.css'], 'Supporting Documents layout polish', 'Supporting Documents polish CSS must declare ownership in header');
assertIncludes(required['app/supporting-documents-layout-polish.css'], "input[type='file']", 'Supporting Documents polish must hide native file input UI');
assertIncludes(required['app/supporting-documents-wide-stage.css'], '--support-doc-page-max: 1120px', 'wide stage must expand center white canvas to 1120px default');
assertIncludes(required['app/supporting-documents-wide-stage.css'], '--support-doc-shell-max: 1920px', 'wide stage must allow wide editor shell');
assertIncludes(required['app/supporting-documents-wide-stage.css'], 'supportHeaderReadyGlow', 'wide stage must include subtle visible sticky-header animation');
assertIncludes(required['app/supporting-documents-wide-stage.css'], 'prefers-reduced-motion', 'sticky-header animation must respect reduced motion');
assertIncludes(required['app/supporting-documents-wide-stage.css'], 'grid-template-areas: "documents page controls"', 'Supporting Documents wide stage must use left-center-right grid');
assertIncludes(required['app/supporting-documents-wide-stage.css'], 'var(--support-doc-page-max)', 'Supporting Documents canvas must be driven by page max variable');

// Template/source headers must use compact command classes and shorter source-data copy.
assertIncludes(required['components/TemplateProgressiveWorkspace.tsx'], 'compact-command-header', 'template workflow must use compact command header class');
assertIncludes(required['components/TemplateProgressiveWorkspace.tsx'], 'compact-workflow-copy', 'template workflow must use compact workflow text class');
assertIncludes(required['components/TemplateProgressiveWorkspace.tsx'], 'Use for Source Data', 'template handoff button must use short stable copy');
assertIncludes(required['app/workflow-header-slim.css'], 'Final workflow header slim layer', 'workflow header CSS must declare final slim ownership');
assertIncludes(required['app/workflow-header-slim.css'], '-webkit-line-clamp', 'workflow header CSS must clamp long descriptions');
assertIncludes(required['app/workflow-header-slim.css'], 'compact-command-actions', 'workflow header CSS must handle compact action rows');

// Global scans for known instability patterns.
const globalFiles = sourceFilesForGlobalScan();
for (const pathname of globalFiles) {
  const source = readFileSync(path.join(root, pathname), 'utf8');
  if (source.includes('removeAllChannels')) fail(`forbidden removeAllChannels in ${pathname}`);
  if (hasForbiddenRouterRefreshInterval(source)) fail(`forbidden permanent router.refresh interval in ${pathname}`);
  if (/\.from\('notifications'\)\.insert/.test(source) && !pathname.endsWith('bell-notification-repair-service.ts') && !pathname.includes('notification-write-service')) {
    fail(`manual notification insert outside approved services: ${pathname}`);
  }
}

// CSS broad selector scan only for recovery/stability layers loaded near the end. Legacy files may still be retired later.
const protectedCssFiles = [
  'app/workflow-header-slim.css',
  'app/supporting-documents-layout-polish.css',
  'app/supporting-documents-wide-stage.css',
  'app/output-activity-flow.css',
  'app/output-activity-unread-badge.css'
];
for (const pathname of protectedCssFiles) {
  const source = required[pathname] || file(pathname);
  if (hasBroadPanelButtonCss(source)) fail(`broad button selector in protected CSS layer: ${pathname}`);
  if (!source.includes('!important')) warn(`protected CSS layer has no override markers; verify import order manually: ${pathname}`);
}

// Tight-loop fetch guard: owned notifications may warm up + slow fallback, but no other client should poll /api/notifications.
const notificationFetchFiles = globalFiles.filter((pathname) => {
  const source = readFileSync(path.join(root, pathname), 'utf8');
  return source.includes('/api/notifications') || source.includes('api/notifications');
});
for (const pathname of notificationFetchFiles) {
  const allowed = pathname === 'src/features/notifications/useOwnedNotifications.ts'
    || pathname === 'src/features/notifications/notification-ownership-contract.ts'
    || pathname.startsWith('app/api/notifications');
  if (!allowed) fail(`notification fetch must be owned by useOwnedNotifications/API only: ${pathname}`);
}

// Avoid excessive uncontrolled mutation observers. Allow known bounded DOM bridges.
const mutationObserverFiles = globalFiles.filter((pathname) => readFileSync(path.join(root, pathname), 'utf8').includes('MutationObserver'));
for (const pathname of mutationObserverFiles) {
  const source = readFileSync(path.join(root, pathname), 'utf8');
  const bounded = source.includes('requestAnimationFrame') && (source.includes('addedNodes') || source.includes('attributeFilter'));
  if (!bounded) fail(`MutationObserver must be frame-bounded and scoped: ${pathname}`);
}

// Sanity: guard should not become too weak.
if (countOccurrences(required['scripts/guard-bundle-runner.mjs'], 'website-stability-guard.mjs') < 1) {
  fail('website-stability guard must be wired into guard bundle runner');
}

if (warnings.length) {
  console.warn(`website-stability-guard warnings: ${warnings.length}`);
  for (const message of warnings) console.warn(`- ${message}`);
}

if (failures.length) {
  console.error(`website-stability-guard failed: ${failures.length} check(s).`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('website-stability-guard: ok');
