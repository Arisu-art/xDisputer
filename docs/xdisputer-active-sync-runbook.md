# xDisputer active sync runbook

_Last updated: 2026-06-15_

This runbook is the current single path for syncing the active `Arisu-art/xDisputer` repository and validating Supabase migration/RPC state while deployment automation is paused.

## Active source of truth

- Repository: `Arisu-art/xDisputer`
- Branch: `main`
- Deployment target: paused / out of scope for current changes
- Supabase target: project configured through `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Active runtime RPCs:
  - `public.access_workspace_account_summary_v1(uuid)`
  - `public.access_workspace_account_directory_v1(uuid, text, text, integer, integer)`
  - `public.access_workspace_attention_queue_v1(uuid, integer)`

## Supabase-only normal Codespaces reset + sync

Use this when you want local Codespaces to match `main` and preserve the current Supabase-first workflow.

```bash
git fetch origin main --prune
git checkout main
git pull --rebase origin main
npm ci
npm run connections:doctor
npm run typecheck
npm run build
```

## Explicit local reset command

Run this only when you want to discard local uncommitted modifications and generated caches.

```bash
git restore --source=HEAD --staged --worktree .
git clean -fd -- .next .turbo node_modules/.cache .local-backups
```

Expected result:

1. Local clone is clean.
2. Local clone is on `main`.
3. Dependencies are installed from `package-lock.json` through `npm ci`.
4. `connections:doctor`, `typecheck`, and `build` pass.
5. Supabase schema validation is ready to run in SQL Editor.

## Supabase migration sync

Use this after reviewing pending migrations and when the connected Supabase project is the intended target.

```bash
supabase status
supabase migration list
supabase db push
npm run connections:doctor
npm run typecheck
npm run build
```

The shorter package script remains available as a guard-only check while database pushes stay explicit:

```bash
npm run active:sync:db
```

## SQL validation after migration push

Run this in the Supabase SQL Editor:

```sql
notify pgrst, 'reload schema';

select
  to_regprocedure('public.access_workspace_account_summary_v1(uuid)') as account_summary_rpc,
  to_regprocedure('public.access_workspace_account_directory_v1(uuid,text,text,integer,integer)') as account_directory_rpc,
  to_regprocedure('public.access_workspace_attention_queue_v1(uuid,integer)') as attention_queue_rpc,
  to_regprocedure('public.access_workspace_manager_control_v1(uuid,text)') as manager_control_rpc,
  to_regprocedure('public.access_workspace_master_control_v1(uuid,text)') as master_control_rpc;

select
  to_regclass('public.profiles') as profiles_table,
  to_regclass('public.workspaces') as workspaces_table,
  to_regclass('public.workspace_members') as workspace_members_table,
  to_regclass('public.client_manager_assignments') as client_manager_assignments_table,
  to_regclass('public.client_assignment_events') as client_assignment_events_table,
  to_regclass('public.template_assets') as template_assets_table,
  to_regclass('public.generation_runs') as generation_runs_table;
```

Expected result: every column returns a non-null `public.*` object name.

## Root-cause order

When something fails, do not patch UI first. Use this order:

1. Repo binding: `git remote get-url origin` must end with `Arisu-art/xDisputer.git`.
2. Source contract: `npm run connections:doctor`.
3. Supabase schema: run the SQL validation above.
4. Local TypeScript/build: `npm run typecheck` then `npm run build`.
5. Full guard: `npm run xdisputer:guard`.
