#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, marker, label) => { if (!source.includes(marker)) failures.push(label); };

const canvas = read('docs/notification-ui-fbis-canvas.md');
const css = read('app/notification-account-rail.css');
const layout = read('app/layout.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const dock = read('components/notifications/NotificationDock.tsx');
const shell = read('components/console/ConsoleShell.tsx');
const service = read('lib/notifications/notification-service.ts');

must(canvas, 'Structure Isolation FBIS', 'notification canvas must document FBIS');
must(layout, "import './notification-account-rail.css';", 'layout must load notification account rail CSS');
must(css, 'order: 1', 'notification bell must be ordered before avatar');
must(css, 'order: 2', 'avatar must be ordered after bell');
must(accountMenu, '<NotificationDock />', 'AccountMenu must own NotificationDock');
must(dock, 'data-notification-dock="true"', 'NotificationDock must keep marker');
must(service, 'missingRoleColumn', 'notification service must tolerate missing recipient_role');
if (shell.includes('<NotificationDock')) failures.push('ConsoleShell must not mount NotificationDock directly');

if (failures.length) {
  console.error(`notification-ui-frontend-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('notification-ui-frontend-guard: ok');
