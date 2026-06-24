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

has('app/master/MasterAccountTableV2.tsx', 'positiveValue(limit?.max_clients)', 'master account table must treat nonpositive manager caps as Default');
has('app/master/MasterAccountTableV2.tsx', 'positiveValue(limit?.default_client_output_limit)', 'master account table must treat nonpositive default output caps as Default');
has('app/master/MasterAccountTableV2.tsx', 'min="1"', 'master account limit inputs must reserve 0 for Default');
has('app/master/MasterAccountTableV2.tsx', 'Leave blank, type 0, or clear the field to use Default', 'master account limit form must explain Default behavior');
has('app/master-account-directory-polish.css', 'grid-template-areas:', 'master account rows must use named grid areas to prevent overlap');
has('app/master-account-directory-polish.css', 'grid-area: invite', 'master account row invite chip must have a dedicated area');
has('app/master-account-directory-polish.css', 'grid-area: updated', 'master account row updated chip must have a dedicated area');
has('app/api/master/entitlements/route.ts', 'if (parsed <= 0) return null;', 'master entitlement route must treat 0 as Default');
has('lib/saas/entitlement-limits.ts', 'positiveOrNull(row.effective_output_limit)', 'entitlement reader must normalize nonpositive caps as Default');
has('supabase/migrations/20260624120000_entitlement_default_zero_repair.sql', 'limit_input is null or limit_input <= 0', 'latest entitlement migration must repair 0 caps to Default');

if (failures.length) {
  console.error('Master workspace retirement guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Master workspace retirement guard passed.');
