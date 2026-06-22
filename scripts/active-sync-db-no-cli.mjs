#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}

function hasCommand(command) {
  const check = spawnSync(process.platform === 'win32' ? 'where' : 'command', process.platform === 'win32' ? [command] : ['-v', command], { stdio: 'ignore', shell: true });
  return check.status === 0;
}

const sqlPath = 'supabase/migrations/20260622121500_generation_output_activity_db_sync.sql';
if (!existsSync(sqlPath)) {
  console.error(`Missing required migration: ${sqlPath}`);
  process.exit(1);
}

const sql = readFileSync(sqlPath, 'utf8');
for (const marker of ['sync_generation_output_activity_v1', 'generation_runs_sync_output_activity', 'per_output_pay']) {
  if (!sql.includes(marker)) {
    console.error(`Migration is missing required marker: ${marker}`);
    process.exit(1);
  }
}

if (hasCommand('supabase')) {
  run('supabase', ['status']);
  run('supabase', ['migration', 'list']);
  run('supabase', ['db', 'push']);
} else {
  console.log('Supabase CLI is not installed globally. Falling back to npx supabase db push.');
  run('npx', ['--yes', 'supabase', 'status']);
  run('npx', ['--yes', 'supabase', 'migration', 'list']);
  run('npx', ['--yes', 'supabase', 'db', 'push']);
}
