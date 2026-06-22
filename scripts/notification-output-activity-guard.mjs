#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const mustNot = (source, text, label) => { if (source.includes(text)) failures.push(label); };
const mustPass = (condition, label) => { if (!condition) failures.push(label); };

const generation = read('app/api/generation-runs/route.ts');
const clientWorkspace = read('components/LetterGeneratorWorkspaceV2.tsx');
const clientIntentCard = read('components/ClientPerOutputIntentCard.tsx');
const clientPayrollMount = read('components/client/ClientPayrollProfileSyncMount.tsx');
const clientPayrollRoute = read('app/api/client/payroll-profile/route.ts');
const clientPayrollMigration = read('supabase/migrations/20260622113000_client_payroll_profile_rpc.sql');
const workspacePreferences = read('lib/workspace-preferences.ts');
const outputPage = read('app/admin/output-activity-v2/page.tsx');
const outputMigration = read('supabase/migrations/20260622102000_output_activity_per_output_flow.sql');
const readService = read('lib/notifications/notification-service.ts');
const writeService = read('lib/notifications/notification-write-service.ts');
const dock = read('components/notifications/NotificationDock.tsx');
const ownedDock = read('components/notifications/OwnedNotificationDock.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const shell = read('components/console/ConsoleShell.tsx');
const decisionRoute = read('app/api/manager-output-decision/route.ts');
const decisionService = read('src/features/manager-output-activity/manager-output-decision-service.ts');
const outputContract = read('src/features/manager-output-activity/output-activity-contract.ts');
const outputService = read('lib/saas/manager-user-settings.ts');
const notificationUiContract = read('src/features/notifications/notification-ui-contract.ts');
const canonicalMigration = read('supabase/migrations/20260617133000_create_notifications.sql');
const roleMigration = read('supabase/migrations/20260620123000_notifications_recipient_role_safe_schema.sql');
const canvas = read('docs/precision-change-control-canvas.md');

function hasStrictCanonicalNotificationRead(source) {
  return source.includes(".select('id,title,body,href,severity,read_at,created_at')")
    && source.includes("column: 'recipient_user_id'")
    && source.includes("column: 'recipient_role'")
    && source.includes('.order(')
    && source.includes('.limit(')
    && !source.includes('missingOptionalColumn')
    && !source.includes('fallbackSelect')
    && !source.includes('MinimalNotificationRow');
}

function hasStrictCanonicalNotificationWrite(source) {
  return source.includes('recipient_user_id: input.recipientUserId || null')
    && source.includes('recipient_role: input.recipientRole || null')
    && source.includes('title: input.title.trim().slice(0, 140)')
    && source.includes('body: input.body ? input.body.trim().slice(0, 500) : null')
    && source.includes("severity: input.severity || 'info'")
    && source.includes("input.supabase.from('notifications').insert(record)")
    && !source.includes('isMissingOptionalColumn')
    && !source.includes('includeRole')
    && !source.includes('attempts = [');
}

function hasCanonicalNotificationSchema(...sources) {
  const joined = sources.join('\n');
  return ['id uuid primary key', 'recipient_user_id uuid', 'recipient_role text', 'title text not null', 'body text', 'href text', 'severity text not null', 'read_at timestamptz', 'created_at timestamptz not null', 'created_by uuid', 'notifications_recipient_role_created_idx'].every((marker) => joined.includes(marker));
}

must(generation, 'notifyManagerForGeneratedOutput', 'generation route must create output activity records');
must(generation, 'perOutputPay', 'generation route must accept client per-output intent');
must(generation, 'managerSettingIsOutputBased', 'generation route must inspect manager payroll profile');
must(generation, 'profileForcesPerOutput || input.perOutputPay === true', 'output-based profiles must force every generated output into per-output confirmation');
must(generation, "profileForcesPerOutput ? 'Client profile is per-output", 'generation route must explain forced per-output profile rule');
must(generation, 'outputActivityContract.sourceGeneratedPayable', 'generation route must mark payable generated outputs');
must(generation, 'outputActivityContract.sourceGeneratedRecorded', 'generation route must mark generated-only outputs');
must(generation, 'status: isPerOutput ? outputActivityContract.status.pending : outputActivityContract.status.recorded', 'generation route must only require manager confirmation for per-output items');
must(clientWorkspace, 'ClientPerOutputIntentCard', 'client workspace must use payroll-aware per-output intent card');
must(clientWorkspace, 'perOutputPay: preferences.perOutputGenerationDefault', 'client generation payload must include per-output intent');
must(clientIntentCard, '/api/client/payroll-profile', 'client per-output intent card must read payroll profile before generation');
must(clientIntentCard, 'next.isOutputBased && preferences.perOutputGenerationDefault !== true', 'client per-output intent card must force default on for output-based profiles');
must(clientIntentCard, 'Per-output required', 'client per-output intent card must lock output-based profile copy');
must(clientIntentCard, 'Make this packet per-output', 'full-time client must get optional per-output add-on control');
must(clientPayrollMount, 'data-output-activity-client-intent="true"', 'client payroll mount must sync rendered source-data intent card');
must(clientPayrollMount, 'writePerOutputDefault(true)', 'client payroll mount must persist per-output default for output-based profiles');
must(clientPayrollMount, 'input.disabled = true', 'client payroll mount must disable per-output checkbox for output-based profiles');
must(clientPayrollRoute, "supabase.rpc('client_payroll_profile_v1')", 'client payroll profile route must use client-visible RPC');
must(clientPayrollMigration, 'security definer', 'client payroll profile RPC must safely expose own payroll profile');
must(clientPayrollMigration, 'grant execute on function public.client_payroll_profile_v1() to authenticated', 'client payroll profile RPC must be callable by authenticated clients');
must(clientPayrollMigration, 'user_id = current_profile.id', 'client payroll profile RPC must only return current user payroll setting');
must(workspacePreferences, 'perOutputGenerationDefault', 'workspace preferences must persist per-output generation default');
must(outputPage, 'FilterTabs', 'manager output activity page must expose all/per-output/generated-only filters');
must(outputPage, 'normalizeOutputActivityFilter', 'manager output activity page must normalize output filter');
must(outputPage, 'Generated only — no salary confirmation needed.', 'generated-only output must have no confirmation action');
must(outputPage, 'Confirm per-output', 'per-output output must have a confirmation action');
must(outputMigration, 'add column if not exists is_per_output boolean', 'output activity migration must add is_per_output');
must(outputMigration, "status in ('recorded', 'pending', 'approved', 'rejected', 'paid')", 'output activity migration must allow recorded status');
must(outputService, 'OutputActivityFilter', 'output activity service must support filter mode');
must(outputService, 'recordedCount', 'output activity service must summarize generated-only rows');
must(outputService, 'approval.is_per_output &&', 'payroll summary must count only per-output approvals');
must(decisionService, 'existing.data.is_per_output !== true', 'manager decisions must reject generated-only records');
must(decisionService, 'Only pending per-output items can be confirmed or returned.', 'manager decisions must confirm only pending per-output records');

mustPass(hasStrictCanonicalNotificationRead(readService), 'notification reads must use strict canonical columns');
mustPass(hasStrictCanonicalNotificationWrite(writeService), 'notification writes must use strict canonical columns');
must(notificationUiContract, 'strict-canonical-columns', 'notification UI contract must declare strict canonical schema mode');
mustPass(hasCanonicalNotificationSchema(canonicalMigration, roleMigration), 'notification migrations must provide canonical schema columns and role index');
mustNot(readService, 'missingOptionalColumn', 'notification reads must not keep optional column drift fallback');
mustNot(writeService, 'isMissingOptionalColumn', 'notification writes must not keep optional column drift fallback');

const hasStableDockExport = dock.includes("export { default } from './OwnedNotificationDock';");
const hasDetachedPopover = ownedDock.includes('notification-dock-popover') && ownedDock.includes('position: absolute;');
if (!hasStableDockExport) failures.push('missing components/notifications/NotificationDock.tsx');
if (!hasDetachedPopover) failures.push('notification dock must be out of normal page flow');

must(accountMenu, '<NotificationDock />', 'account menu rail must own notification dock');
must(shell, '<AccountMenu', 'console shell must delegate account rail to AccountMenu');

const updatesOutputActivity = decisionRoute.includes('applyManagerOutputDecision') || decisionService.includes('manager_disputer_output_approvals');
if (!updatesOutputActivity) failures.push('manager decision route must update output activity');

const notifiesDisputer = decisionRoute.includes('applyManagerOutputDecision') || decisionService.includes('createNotification');
if (!notifiesDisputer) failures.push('manager decision route must notify disputer');

const usesCentralizedDecisionStatus = decisionRoute.includes('applyManagerOutputDecision') || decisionService.includes('decisionStatus');
if (!usesCentralizedDecisionStatus) failures.push('manager decision route must use centralized decision status mapping');

must(outputContract, 'defaultRateAmount: 0', 'output activity contract must default extra rate to zero');
must(outputContract, 'sourceGeneratedPayable', 'output activity contract must define payable source');
must(outputContract, 'sourceGeneratedRecorded', 'output activity contract must define generated-only source');
must(canvas, 'Precision Change Control Canvas', 'precision change canvas missing');

if (failures.length) {
  console.error(`notification-output-activity-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('notification-output-activity-guard: ok');
