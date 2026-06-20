import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : (failures.push(`Missing ${path}`), '');
const has = (path, text, message) => { if (!read(path).includes(text)) failures.push(message); };
const not = (path, text, message) => { if (read(path).includes(text)) failures.push(message); };

has('package.json', '"master-ui-workspace:guard"', 'package.json must keep retired master workspace guard wired');
has('components/console/ConsoleShell.tsx', 'resolvedSwitchTarget', 'ConsoleShell must own switch target resolution');
has('components/console/ConsoleShell.tsx', 'return fallback', 'ConsoleShell must not override master switch target to a retired workspace route');
has('components/console/ConsoleShell.tsx', 'Master governance console', 'ConsoleShell must use non-workspace master switch copy');
not('components/console/ConsoleShell.tsx', "return '/master/ui-workspace'", 'master operations switch must not target retired UI workspace');
not('components/console/ConsoleShell.tsx', 'Switch to UI workspace', 'master switch card must not advertise UI workspace');
not('components/console/ConsoleShell.tsx', 'Master Console ⇄ UI Workspace', 'master shell must not expose UI workspace contract copy');
not('components/console/ConsoleShell.tsx', 'data-master-console-ui-workspace=', 'master shell must not expose UI workspace data marker');

has('app/master/ui-workspace/page.tsx', "redirect('/master')", 'retired master UI workspace route must redirect to /master');
has('app/master/ui-workspace/page.tsx', "requireRole('master')", 'retired master UI workspace route must remain role-gated before redirect');
has('app/master/workspaces/page.tsx', "redirect('/master/accounts')", 'retired master workspaces route must redirect to /master/accounts');
has('app/master/workspaces/page.tsx', "requireRole('master')", 'retired master workspaces route must remain role-gated before redirect');

not('app/master/MasterConsoleHome.tsx', "'/master/ui-workspace'", 'master home navigation must not include UI workspace');
not('app/master/MasterConsoleHome.tsx', "'/master/workspaces'", 'master home navigation must not include Workspaces');
not('app/master/MasterConsoleHome.tsx', 'UI workspace', 'master home copy must not mention UI workspace');
not('app/master/MasterConsoleHome.tsx', 'Workspaces', 'master home nav must not mention Workspaces');
not('app/master/accounts/page.tsx', "'/master/ui-workspace'", 'master accounts navigation must not include UI workspace');
not('app/master/accounts/page.tsx', "'/master/workspaces'", 'master accounts page must not link to Workspaces');
not('app/master/accounts/page.tsx', 'UI workspace', 'master accounts copy must not mention UI workspace');
not('app/master/accounts/page.tsx', 'Workspaces', 'master accounts copy must not mention Workspaces');

if (failures.length) {
  console.error('Master workspace retirement guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Master workspace retirement guard passed.');
