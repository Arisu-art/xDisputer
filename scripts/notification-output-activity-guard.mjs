#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const mustNot = (source, text, label) => { if (source.includes(text)) failures.push(label); };
const mustPass = (condition, label) => { if (!condition) failures.push(label); };

const generation = read('app/api/generation-runs/route.ts');
const readService = read('lib/notifications/notification-service.ts');
const writeService = read('lib/notifications/notification-write-service.ts');
const dock = read('components/notifications/NotificationDock.tsx');
const ownedDock = read('components/notifications/OwnedNotificationDock.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const shell = read('components/console/ConsoleShell.tsx');
const decisionRoute = read('app/api/manager-output-decision/route.ts');
const decisionService = read('src/features/manager-output-activity/manager-output-decision-service.ts');
const outputContract = read('src/features/manager-output-activity/output-activity-contract.ts');
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
  return [
    'id uuid primary key',
    'recipient_user_id uuid',
    'recipient_role text',
    'title text not null',
    'body text',
    'href text',
    'severity text not null',
    'read_at timestamptz',
    'created_at timestamptz not null',
    'created_by uuid',
    'notifications_recipient_role_created_idx'
  ].every((marker) => joined.includes(marker));
}

must(generation, 'notifyManagerForGeneratedOutput', 'generation route must create output activity notification');
must(generation, 'manager_disputer_output_approvals', 'generation route must create pending output activity');
must(generation, 'outputActivityContract.defaultRateAmount', 'generation route must use default output activity rate contract');
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
must(canvas, 'Precision Change Control Canvas', 'precision change canvas missing');

if (failures.length) {
  console.error(`notification-output-activity-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('notification-output-activity-guard: ok');
