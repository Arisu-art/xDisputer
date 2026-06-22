#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const mustNot = (source, text, label) => { if (source.includes(text)) failures.push(label); };

const layout = read('app/layout.tsx');
const generation = read('app/api/generation-runs/route.ts');
const clientWorkspace = read('components/LetterGeneratorWorkspaceV2.tsx');
const clientPayrollMount = read('components/client/ClientPayrollProfileSyncMount.tsx');
const clientPayrollRoute = read('app/api/client/payroll-profile/route.ts');
const clientPayrollMigration = read('supabase/migrations/20260622113000_client_payroll_profile_rpc.sql');
const clientPayrollCss = read('app/client-payroll-profile-flow.css');
const workspacePreferences = read('lib/workspace-preferences.ts');
const outputPage = read('app/admin/output-activity-v2/page.tsx');
const outputMigration = read('supabase/migrations/20260622102000_output_activity_per_output_flow.sql');
const unreadBadge = read('components/notifications/OutputActivityUnreadBadgeMount.tsx');
const unreadBadgeCss = read('app/output-activity-unread-badge.css');
const notificationDock = read('components/notifications/OwnedNotificationDock.tsx');
const notificationService = read('lib/notifications/notification-service.ts');
const notificationApiService = read('src/features/notifications/notification-api-service.ts');
const clearReadRoute = read('app/api/notifications/clear-read/route.ts');
const readService = notificationService;
const writeService = read('lib/notifications/notification-write-service.ts');
const decisionService = read('src/features/manager-output-activity/manager-output-decision-service.ts');
const outputService = read('lib/saas/manager-user-settings.ts');
const notificationUiContract = read('src/features/notifications/notification-ui-contract.ts');

must(layout, 'ClientPayrollProfileSyncMount', 'root layout must mount client payroll profile synchronizer');
must(layout, 'OutputActivityUnreadBadgeMount', 'root layout must mount output activity unread badge synchronizer');
must(layout, "import './client-payroll-profile-flow.css';", 'root layout must load client payroll profile CSS');
must(layout, "import './output-activity-unread-badge.css';", 'root layout must load output activity unread badge CSS');
must(generation, 'notifyManagerForGeneratedOutput', 'generation route must create output activity records');
must(generation, 'managerSettingIsOutputBased', 'generation route must inspect manager payroll profile');
must(generation, 'profileForcesPerOutput || input.perOutputPay === true', 'output-based profiles must force every generated output into per-output confirmation');
must(generation, "title: isPerOutput ?", 'generation route must notify manager for both per-output and fulltime output');
must(generation, "href: isPerOutput ? '/admin/output-activity-v2?filter=per_output' : '/admin/output-activity-v2?filter=not_per_output'", 'generation notifications must route manager to correct output filter');
must(generation, 'status: isPerOutput ? outputActivityContract.status.pending : outputActivityContract.status.recorded', 'generation route must only require manager confirmation for per-output items');
must(clientWorkspace, 'data-output-activity-client-intent="true"', 'client workspace must expose source-data per-output intent card');
must(clientWorkspace, 'perOutputPay: preferences.perOutputGenerationDefault', 'client generation payload must include per-output intent');
must(clientPayrollMount, '/api/client/payroll-profile', 'client payroll synchronizer must read payroll profile before generation');
must(clientPayrollMount, 'writePerOutputDefault(true)', 'client payroll synchronizer must persist per-output default for output-based profiles');
must(clientPayrollMount, 'input.disabled = true', 'client payroll synchronizer must disable per-output checkbox for output-based profiles');
must(clientPayrollMount, 'Per-output required', 'client payroll synchronizer must show required per-output copy');
must(clientPayrollMount, 'Make this packet per-output', 'full-time client must get optional per-output add-on control');
must(clientPayrollRoute, "supabase.rpc('client_payroll_profile_v1')", 'client payroll profile route must use client-visible RPC');
must(clientPayrollMigration, 'security definer', 'client payroll profile RPC must safely expose own payroll profile');
must(clientPayrollMigration, 'user_id = current_profile.id', 'client payroll profile RPC must only return current user payroll setting');
must(clientPayrollCss, '--client-payroll-profile-contract: output-based-forces-per-output-full-time-optional', 'client payroll profile CSS contract missing');
must(workspacePreferences, 'perOutputGenerationDefault', 'workspace preferences must persist per-output generation default');
must(outputPage, 'Fulltime Output', 'output activity page must rename generated-only to Fulltime Output');
must(outputPage, 'Client user / Disputer', 'output activity facts must show client user/disputer');
must(outputPage, 'Boss / Note', 'output activity facts must show boss note');
must(outputPage, 'Round selected', 'output activity facts must show selected round');
must(outputPage, 'Fulltime Output — no salary confirmation needed.', 'fulltime output must have no confirmation action');
must(outputPage, 'Confirm per-output', 'per-output output must have a confirmation action');
must(outputMigration, 'add column if not exists is_per_output boolean', 'output activity migration must add is_per_output');
must(outputService, 'approval.is_per_output &&', 'payroll summary must count only per-output approvals');
must(decisionService, 'existing.data.is_per_output !== true', 'manager decisions must reject generated-only records');
must(decisionService, 'createNotification', 'manager output confirmation must notify the client user');
must(unreadBadge, '/admin/output-activity-v2', 'output activity unread badge must count notifications linked to output activity');
must(unreadBadge, 'data-output-activity-unread-badge', 'output activity unread badge must render red badge marker');
must(unreadBadgeCss, '--output-activity-unread-badge-contract: notification-href-unread-count', 'output activity unread badge CSS contract missing');
must(notificationDock, 'Clear read only', 'notification dock must expose clear-read-only action');
must(notificationDock, 'Mark visible read', 'notification dock must separate mark-read from clear-read');
must(notificationService, 'clearDirectReadNotifications', 'notification service must clear only read direct notifications');
must(notificationService, ".not('read_at', 'is', null)", 'clear-read service must not clear unread notifications');
must(notificationApiService, 'clearReadNotificationsForCurrentUser', 'notification API service must expose clear-read action');
must(clearReadRoute, 'clearReadNotificationsForCurrentUser', 'clear-read route must call clear-read service');
must(readService, ".select('id,title,body,href,severity,read_at,created_at')", 'notification reads must use strict canonical columns');
must(writeService, "input.supabase.from('notifications').insert(record)", 'notification writes must use strict canonical insert');
must(notificationUiContract, 'strict-canonical-columns', 'notification UI contract must declare strict canonical schema mode');
mustNot(readService, 'missingOptionalColumn', 'notification reads must not keep optional column drift fallback');
mustNot(writeService, 'isMissingOptionalColumn', 'notification writes must not keep optional column drift fallback');

if (failures.length) {
  console.error(`notification-output-activity-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('notification-output-activity-guard: ok');
