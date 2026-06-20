#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, marker, label) => { if (!source.includes(marker)) failures.push(label); };
const mustNot = (source, marker, label) => { if (source.includes(marker)) failures.push(label); };

const canvas = read('docs/notification-ui-fbis-canvas.md');
const contract = read('src/features/notifications/notification-ui-contract.ts');
const service = read('lib/notifications/notification-service.ts');
const writer = read('lib/notifications/notification-write-service.ts');
const dock = read('components/notifications/NotificationDock.tsx');
const shell = read('components/console/ConsoleShell.tsx');
const accountMenu = read('components/console/AccountMenu.tsx');
const migration = read('supabase/migrations/20260620123000_notifications_recipient_role_safe_schema.sql');

must(canvas, 'Traceability Canvas', 'notification canvas must document traceability');
must(canvas, 'Behavior Control ECS', 'notification canvas must document ECS');
must(canvas, 'Impact Prediction CIG', 'notification canvas must document CIG');
must(canvas, 'Structure Isolation FBIS', 'notification canvas must document FBIS');
must(contract, 'missingRoleColumnFallback', 'notification contract must define missing role column fallback');
must(service, 'missingRoleColumn', 'notification read service must handle missing recipient_role');
must(service, 'roleWide.error && !missingRoleColumn', 'role-wide query error must be optional when recipient_role is missing');
must(writer, 'includeRole', 'notification write service must support role-column fallback');
must(writer, 'lastError?.includes(\'recipient_role\')', 'role-only insert must be non-fatal when role column is absent');
must(dock, 'data-notification-dock="true"', 'NotificationDock must keep ownership marker');
must(dock, '🔔', 'NotificationDock must use bell icon surface');
must(dock, '120_000', 'NotificationDock polling must stay throttled');
must(accountMenu, '<NotificationDock />', 'AccountMenu must own NotificationDock');
mustNot(shell, '<NotificationDock', 'ConsoleShell must not mount NotificationDock directly');
must(migration, 'add column if not exists recipient_role', 'recipient_role migration must be present');
must(migration, "notify pgrst, 'reload schema'", 'migration must reload schema cache');

if (failures.length) {
  console.error(`notification-ui-schema-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('notification-ui-schema-guard: ok');
