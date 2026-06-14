# xDisputer active sync runbook

_Last updated: 2026-06-14_

This runbook is the current single path for syncing the active `Arisu-art/xDisputer` repository, Vercel production environment, and Supabase migration/RPC state.

## Active source of truth

- Repository: `Arisu-art/xDisputer`
- Branch: `main`
- Vercel target: production project connected to this repository
- Supabase target: project configured through `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Active runtime RPCs:
  - `public.access_workspace_account_summary_v1(uuid)`
  - `public.access_workspace_account_directory_v1(uuid, text, text, integer, integer)`
  - `public.access_workspace_attention_queue_v1(uuid, integer)`

## Normal Codespaces reset + sync

```bash
git fetch origin main --prune
git checkout main
git pull --rebase origin main
npm ci
npm run active:sync -- --reset-local --verify
```

## Full repo + Vercel + Supabase sync

Use this after reviewing pending migrations and when the Supabase project is the intended production/staging target.

```bash
git fetch origin main --prune
git checkout main
git pull --rebase origin main
npm ci
npm run active:sync -- --reset-local --sync-db --verify --strict-env
```

The shorter package script is also available:

```bash
npm run active:sync:db
```

## Production ship path

Use this only after the SQL validation passes.

```bash
npm run active:sync -- --reset-local --sync-db --verify --strict-env --ship
```

Expected result:

1. Local clone is on `main`.
2. Vercel production env is pulled.
3. Supabase migration list is shown.
4. `supabase db push` applies pending migrations when `--sync-db` is present.
5. `connections:doctor`, `typecheck`, and `build` pass.
6. With `--ship`, deploy guard passes and Vercel production status is verified.

## SQL validation after migration push

Run this in the Supabase SQL editor:

```sql
notify pgrst, 'reload schema';

select
  to_regprocedure('public.access_workspace_account_summary_v1(uuid)') as account_summary_rpc,
  to_regprocedure('public.access_workspace_account_directory_v1(uuid,text,text,integer,integer)') as account_directory_rpc,
  to_regprocedure('public.access_workspace_attention_queue_v1(uuid,integer)') as attention_queue_rpc;

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
4. Vercel deploy binding: `npm run vercel:status`.
5. Full guard: `npm run xdisputer:guard`.
