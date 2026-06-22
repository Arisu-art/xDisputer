#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const requiredMigrations = [
  {
    path: 'supabase/migrations/20260622121500_generation_output_activity_db_sync.sql',
    markers: ['sync_generation_output_activity_v1', 'generation_runs_sync_output_activity', 'per_output_pay']
  },
  {
    path: 'supabase/migrations/20260622130000_unified_generation_output_notification_sync.sql',
    markers: ['sync_generation_output_activity_v1', 'sync_manager_output_activity_notifications_v1', 'generation_runs_sync_output_activity']
  },
  {
    path: 'supabase/migrations/20260622134500_output_decision_client_notification_trigger.sql',
    markers: ['sync_output_activity_decision_notification_v1', 'manager_output_decision_notify_client', "new.status in ('approved', 'rejected')"]
  },
  {
    path: 'supabase/migrations/20260622135000_realtime_entitlement_refresh.sql',
    markers: ['client_entitlement_limits', 'generation_runs', 'supabase_realtime']
  }
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32', ...options });
  if (result.status !== 0) return false;
  return true;
}

function hasCommand(command) {
  const check = spawnSync(process.platform === 'win32' ? 'where' : 'command', process.platform === 'win32' ? [command] : ['-v', command], { stdio: 'ignore', shell: true });
  return check.status === 0;
}

function verifyRequiredMigrations() {
  for (const migration of requiredMigrations) {
    if (!existsSync(migration.path)) {
      console.error(`Missing required migration: ${migration.path}`);
      process.exit(1);
    }
    const sql = readFileSync(migration.path, 'utf8');
    for (const marker of migration.markers) {
      if (!sql.includes(marker)) {
        console.error(`Migration ${migration.path} is missing required marker: ${marker}`);
        process.exit(1);
      }
    }
  }
}

function printManualFallback() {
  console.error('\nDatabase push failed before all required migrations were confirmed.');
  console.error('Logical fallback: paste these SQL files into Supabase SQL Editor in this order:');
  for (const migration of requiredMigrations) console.error(`- ${migration.path}`);
  console.error('\nAfter applying them, rerun the SQL boolean check for sync RPCs/triggers.');
}

verifyRequiredMigrations();

const executable = hasCommand('supabase') ? 'supabase' : 'npx';
const baseArgs = executable === 'supabase' ? [] : ['--yes', 'supabase'];

console.log('Pushing Supabase migrations to the linked remote project.');
console.log('This intentionally does not run `supabase status` because that command inspects the local Docker stack and fails when local Supabase containers are not running.');

const ok = run(executable, [...baseArgs, 'db', 'push', '--linked', '--include-all']);
if (!ok) {
  printManualFallback();
  process.exit(1);
}

console.log('Supabase linked remote migration push completed.');
