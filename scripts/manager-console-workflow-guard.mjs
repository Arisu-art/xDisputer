#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`missing ${path}`), '');
const must = (source, text, label) => { if (!source.includes(text)) failures.push(label); };
const mustNot = (source, text, label) => { if (source.includes(text)) failures.push(label); };

const admin = read('app/admin/page.tsx');
const panels = read('lib/manager-console/manager-operations-panels.ts');
const css = read('app/manager-console-workflow.css');
const layout = read('app/layout.tsx');
const payrollRoute = read('app/api/manager-console/payroll/route.ts');
const settings = read('lib/saas/manager-user-settings.ts');
const accountRoute = read('app/api/account/profile/route.ts');
const accountMenu = read('components/console/AccountMenu.tsx');

for (const label of ['Monitoring', 'Access control of user', 'Report', 'Output Activity', 'Request']) {
  must(panels, label, `manager panel missing: ${label}`);
}

for (const marker of ['MonitoringPanel', 'AccessPanel', 'ReportPanel', 'OutputActivityPanel', 'RequestsPanel']) {
  must(admin, marker, `manager console section missing: ${marker}`);
}

must(panels, "'output_activity'", 'manager panel id must use output_activity');
must(panels, "panel === 'payroll'", 'legacy payroll query alias must stay backward compatible');
must(admin, "activePanel === 'output_activity'", 'manager page must render Output Activity by output_activity id');
mustNot(admin, 'function PayrollPanel', 'manager page must not expose PayrollPanel UI owner');
mustNot(admin, "activePanel === 'payroll'", 'manager page must not render payroll panel id directly');
must(admin, 'intent="clear_manager"', 'manager access must expose unlink action');
must(admin, 'intent="suspend"', 'manager access must expose pause action');
must(admin, 'manager-user-settings-form', 'manager access must expose user metadata form');
must(admin, 'payrollAmount', 'manager output activity must compute from settings and output count');
must(settings, 'manager_user_settings', 'manager user settings helper missing table contract');
must(payrollRoute, 'manager_user_settings', 'payroll route must save manager metadata');
must(css, 'manager-console-kpi-grid', 'manager console CSS missing KPI layout');
must(layout, "import './manager-console-workflow.css';", 'root layout must load manager console workflow CSS');
must(accountRoute, 'account_settings_name', 'account profile route must carry saved display name for immediate UI refresh');
must(accountRoute, "revalidatePath('/workspace')", 'account profile route must revalidate client workspace');
must(accountRoute, "revalidatePath('/admin')", 'account profile route must revalidate manager console');
must(accountMenu, 'displayNameFromUrl', 'account menu must read saved display name from redirect state');
must(accountMenu, 'setLocalDisplayName(savedName)', 'account menu must update display name immediately');

if (failures.length) {
  console.error(`manager-console-workflow-guard failed: ${failures.length} check(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('manager-console-workflow-guard: ok');
