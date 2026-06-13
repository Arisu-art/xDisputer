# xDisputer active context binding

_Last updated: 2026-06-13_

## Active repository

- GitHub repository: `Arisu-art/xDisputer`
- User prompt alias observed: `Arisu-art/xDispute`
- Default branch: `main`
- Current deployment target: Vercel production through the repository integration and/or direct Vercel CLI sync.
- Database target: Supabase project connected through existing environment variables and migrations.

## Current active technical state

- App framework: Next.js with React.
- Supabase packages are installed through `@supabase/ssr` and `@supabase/supabase-js`.
- Vercel/sync scripts already exist in `package.json`:
  - `vercel:status`
  - `vercel:direct`
  - `verify:production`
  - `verify:production:wait`
  - `production:match`
- Deployment safety guard exists at `scripts/xdisputer-deploy-guard.mjs`.
- Safe ship workflow exists at `scripts/safe-ship.sh`.
- Connection initializer exists at `scripts/init-xdisputer-connections.sh`.

## Active Supabase/RPC layer

The active account directory flow is Supabase-backed and should continue through these read RPC contracts:

- `public.access_workspace_account_summary_v1(uuid)`
- `public.access_workspace_account_directory_v1(uuid, text, text, integer, integer)`
- `public.access_workspace_attention_queue_v1(uuid, integer)`

These contracts power:

- `getMasterAccountSummary`
- `listMasterAccountDirectory`
- `listMasterAttentionQueue`
- `getManagerClientSummary`
- `listManagerClientDirectory`
- `listManagerAttentionQueue`

## Non-negotiable behavior constraints

- Do not add manager output limits.
- Do not add client output limits.
- Do not add generation count limits.
- Do not add client usage-cap blocked UI state or usage-cap messaging.
- Keep Supabase migrations additive unless a root-cause fix explicitly requires controlled replacement of a broken function signature.
- Avoid destructive table changes unless the user explicitly approves a data migration plan.
- Use root-cause tracing before UI rewrites.

## Old UI / replacement annotation rule

When replacing a surface, leave a clear code comment or route-level redirect note that states:

1. Which old component/route is replaced.
2. Which current component/route is active.
3. Why the old path must not render in production.

This prevents stale backup panels from accidentally becoming visible again.

## Roadmap checkpoint

| Area | Current status | Next logical action |
| --- | --- | --- |
| Repository binding | Active repository identified as `Arisu-art/xDisputer`. | Run `npm run init:connections -- --reset-local --verify` in Codespaces. |
| Vercel | Scripts exist for status/direct sync. | Pull production env, verify commit status, then use direct sync only when Git auto-deploy is not enough. |
| Supabase | Multi-tenant workspace RPC migrations exist. | Run DB push/migration status and SQL validation. |
| Generation reliability | Workflow framework export is present. | Keep generation contract single-source and avoid duplicate packet order declarations. |
| Error prevention | Error ledger now exists. | Update it whenever a root cause is found, before applying another patch. |

## Required local sequence

```bash
git fetch origin main --prune
git checkout main
git pull --rebase origin main
npm ci
npm run init:connections -- --reset-local --verify
```

## Required database validation sequence

Run `docs/xdisputer-connection-validation.sql` in the Supabase SQL editor after migrations are pushed.
