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

has('app/master/MasterAccountTableV2.tsx', 'Needs Master limit', 'master account table must show missing manager limits as needing Master setup');
has('app/master/MasterAccountTableV2.tsx', 'Manager cap not set', 'master account table must show missing output caps as not configured');
has('app/master/MasterAccountTableV2.tsx', 'required defaultValue={positiveValue(limit?.max_clients)', 'manager Disputer limit input must be required');
has('app/master/MasterAccountTableV2.tsx', 'required defaultValue={positiveValue(limit?.default_client_output_limit)', 'manager default output input must be required');
has('app/master/MasterAccountTableV2.tsx', 'Master must set both manager limits', 'master account limit form must explain required Master authority');
not('app/master/MasterAccountTableV2.tsx', 'unlimited', 'master account table must not advertise unlimited limits');
has('app/master-account-directory-polish.css', 'grid-template-areas:', 'master account rows must use named grid areas to prevent overlap');
has('app/master-account-directory-polish.css', 'grid-area: invite', 'master account row invite chip must have a dedicated area');
has('app/master-account-directory-polish.css', 'grid-area: updated', 'master account row updated chip must have a dedicated area');
has('app/api/master/entitlements/route.ts', 'parsePositiveLimit(cleanValue(formData, \'maxClients\')', 'master entitlement route must require manager Disputer limit');
has('app/api/master/entitlements/route.ts', 'parsePositiveLimit(cleanValue(formData, \'defaultClientOutputLimit\')', 'master entitlement route must require manager output limit');
has('app/api/master/entitlements/route.ts', 'parseOptionalOverrideLimit', 'master entitlement route must allow optional Disputer-specific override only');
not('app/api/master/entitlements/route.ts', 'return null;\n  const parsed', 'master entitlement route must not treat manager blank as Default');
has('lib/saas/entitlement-limits.ts', 'const effectiveLimit = positiveOrNull(row.effective_output_limit)', 'entitlement reader must expose missing caps as not configured');
has('supabase/migrations/20260624123000_master_authority_required_limits.sql', 'access_positive_limit_required_v1', 'latest entitlement migration must require positive manager limits');
has('supabase/migrations/20260624123000_master_authority_required_limits.sql', 'Master must set this manager daily output limit', 'latest entitlement migration must block Disputer generation when master cap is missing');
has('supabase/migrations/20260624123000_master_authority_required_limits.sql', 'Master must set this manager Disputer limit', 'latest entitlement migration must block manager assignments when master seat limit is missing');

if (failures.length) {
  console.error('Master workspace retirement guard failed.');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Master workspace retirement guard passed.');
