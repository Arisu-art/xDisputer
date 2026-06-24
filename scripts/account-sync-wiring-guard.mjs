#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const failures = [];
const warnings = [];
const report = [];

function file(rel) {
  return path.join(ROOT, rel);
}

function read(rel) {
  const target = file(rel);
  if (!existsSync(target)) {
    failures.push(`Missing required file: ${rel}`);
    return '';
  }
  return readFileSync(target, 'utf8');
}

function must(rel, marker, message) {
  const source = read(rel);
  if (!source.includes(marker)) failures.push(`${rel}: ${message}`);
}

function should(rel, marker, message) {
  const source = read(rel);
  if (!source.includes(marker)) warnings.push(`${rel}: ${message}`);
}

function mustNot(rel, marker, message) {
  const source = read(rel);
  if (source.includes(marker)) failures.push(`${rel}: ${message}`);
}

function section(title) {
  report.push(`\n## ${title}`);
}

function bullet(value) {
  report.push(`- ${value}`);
}

section('Critical Manager/Disputer sync audit');

bullet('Account authority must be owned by server/database rules, not duplicated in visible UI.');
bullet('Disputer must be the production label for all user-facing account screens.');
bullet('Manager-set limits must be reflected in Manager pages, Disputer pages, output entitlement, and generation save flow.');
bullet('Generation save must not silently drift from output entitlement/blocker state.');

section('Required source files');
[
  'lib/saas/display-terminology.ts',
  'lib/saas/account-directory.ts',
  'lib/saas/account-limits.ts',
  'lib/saas/entitlement-limits.ts',
  'app/api/account-limits/route.ts',
  'app/api/client/output-entitlement/route.ts',
  'app/api/generation-runs/route.ts',
  'components/ClientOutputLimitBoundary.tsx',
  'components/LetterGeneratorWorkspaceV2.tsx',
  'components/console/AccountMenu.tsx',
  'app/master/accounts/page.tsx',
  'app/admin/clients/page.tsx'
].forEach((rel) => {
  if (existsSync(file(rel))) bullet(`OK: ${rel}`);
  else {
    failures.push(`Missing required sync file: ${rel}`);
    bullet(`MISSING: ${rel}`);
  }
});

section('Terminology contract checks');

must('lib/saas/display-terminology.ts', 'Disputer', 'central terminology must include Disputer');
should('lib/saas/display-terminology.ts', 'productionFriendlyAccountText', 'add productionFriendlyAccountText helper to hide backend/frontend/API/SQL wording');
must('components/console/AccountMenu.tsx', 'Disputer workspace account', 'account popover must label client role as Disputer workspace account');
must('components/console/AccountMenu.tsx', 'Account type', 'account popover must show Account type instead of raw role/access role');
mustNot('components/console/AccountMenu.tsx', 'Client workspace account', 'old Client workspace account label leaked');
mustNot('components/console/AccountMenu.tsx', 'Client packet workspace', 'old Client packet workspace label leaked');

must('app/admin/clients/page.tsx', 'Disputer', 'manager assigned accounts page must use Disputer user-facing copy');
mustNot('app/admin/clients/page.tsx', 'Assigned clients', 'manager page still says Assigned clients');
mustNot('app/admin/clients/page.tsx', 'Client records', 'manager page still says Client records');
mustNot('app/admin/clients/page.tsx', '<th>Client</th>', 'manager table header still says Client');

should('components/WorkspaceSettingsPanel.tsx', 'Disputer-safe settings only', 'settings page should use Disputer-safe production copy');
mustNot('components/WorkspaceSettingsPanel.tsx', 'backend role', 'settings page exposes backend role wording');
mustNot('components/WorkspaceSettingsPanel.tsx', 'backend access', 'settings page exposes backend access wording');

section('Manager/Disputer limit sync checks');

must('app/api/account-limits/route.ts', 'requireRole', 'account limit writes must require authenticated role authority');
must('app/api/account-limits/route.ts', 'manager', 'account limit route must handle manager authority');
must('app/api/account-limits/route.ts', 'client', 'account limit route must handle Disputer/client internal role');
should('app/api/account-limits/route.ts', 'no-store', 'account limit write/read responses should avoid stale cache');

must('app/api/client/output-entitlement/route.ts', 'force-dynamic', 'output entitlement route must be dynamic');
should('app/api/client/output-entitlement/route.ts', 'no-store', 'output entitlement route should return no-store headers');
must('components/ClientOutputLimitBoundary.tsx', 'xdisputer:output-entitlement-updated', 'Disputer blocker must listen for entitlement refresh events');
must('components/ClientOutputLimitBoundary.tsx', 'AbortController', 'entitlement fetch must abort stuck requests');

section('Generation run persistence checks');

must('components/LetterGeneratorWorkspaceV2.tsx', '/api/generation-runs', 'Disputer generation must save through generation-runs route');
must('components/LetterGeneratorWorkspaceV2.tsx', 'xdisputer:output-entitlement-updated', 'generation save must publish entitlement refresh event');
must('app/api/generation-runs/route.ts', 'requireRole', 'generation run write must authenticate Disputer/Manager context');
should('app/api/generation-runs/route.ts', 'entitlement', 'generation-runs route should return updated entitlement after write');
should('app/api/generation-runs/route.ts', 'access_generation_run_counts_as_output', 'generation run route should call the canonical output-count rule');

section('Master account directory checks');

must('app/master/accounts/page.tsx', "dynamic = 'force-dynamic'", 'master account page must be force-dynamic');
must('app/master/accounts/page.tsx', 'revalidate = 0', 'master account page must avoid stale manager/disputer state');
must('app/master/accounts/page.tsx', 'listEntitlementLimits', 'master account page must load entitlement limits with directory accounts');
must('app/master/accounts/page.tsx', 'Disputer', 'master account page must use Disputer user-facing labels');

section('Database migration checks');

const migrationNames = [
  'supabase/migrations/20260612023000_phase_13_account_limits.sql',
  'supabase/migrations/20260612023300_phase_13_daily_client_output_entitlement.sql'
];

for (const rel of migrationNames) {
  if (!existsSync(file(rel))) {
    failures.push(`Missing expected migration: ${rel}`);
    continue;
  }
  bullet(`OK: ${rel}`);
}

const migrationsDir = file('supabase/migrations');
if (existsSync(migrationsDir)) {
  const allSql = Array.from(await import('node:fs').then((fs) => fs.readdirSync(migrationsDir)))
    .filter((name) => name.endsWith('.sql'))
    .map((name) => readFileSync(path.join(migrationsDir, name), 'utf8'))
    .join('\n\n');

  if (!allSql.includes('access_generation_run_counts_as_output')) {
    failures.push('Database migrations do not define access_generation_run_counts_as_output; generated output counting can fail.');
  }

  if (!allSql.includes('output_entitlement') && !allSql.includes('daily_client_output_entitlement')) {
    warnings.push('No clear output entitlement database rule found in migrations.');
  }
}

section('Result');
if (failures.length) {
  bullet(`FAILED: ${failures.length} critical issue(s).`);
  for (const failure of failures) bullet(`CRITICAL: ${failure}`);
} else {
  bullet('PASSED: no critical wiring gaps detected by this guard.');
}

if (warnings.length) {
  bullet(`WARNINGS: ${warnings.length} improvement item(s).`);
  for (const warning of warnings) bullet(`WARNING: ${warning}`);
}

mkdirSync(file('docs'), { recursive: true });
writeFileSync(file('docs/account-sync-critical-wiring-audit.md'), `${report.join('\n')}\n`, 'utf8');

if (failures.length) {
  console.error(`account-sync-wiring-guard failed: ${failures.length} critical issue(s).`);
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Report written: docs/account-sync-critical-wiring-audit.md');
  process.exit(1);
}

for (const warning of warnings) console.warn(`warning: ${warning}`);
console.log('account-sync-wiring-guard: ok');
console.log('Report written: docs/account-sync-critical-wiring-audit.md');
