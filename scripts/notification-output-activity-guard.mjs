#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };

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
const canvas = read('docs/precision-change-control-canvas.md');

must(generation, 'notifyManagerForGeneratedOutput', 'generation route must create output activity notification');
must(generation, 'manager_disputer_output_approvals', 'generation route must create pending output activity');
must(generation, 'outputActivityContract.defaultRateAmount', 'generation route must use default output activity rate contract');
must(readService, 'missingOptionalColumn', 'notification reads must tolerate optional column drift');
must(writeService, 'isMissingOptionalColumn', 'notification writes must tolerate optional column drift');

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
