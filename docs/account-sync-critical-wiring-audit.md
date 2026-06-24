
## Critical Manager/Disputer sync audit
- Account authority must be owned by server/database rules, not duplicated in visible UI.
- Disputer must be the production label for all user-facing account screens.
- Manager-set limits must be reflected in Manager pages, Disputer pages, output entitlement, and generation save flow.
- Generation save must not silently drift from output entitlement/blocker state.

## Required source files
- OK: lib/saas/display-terminology.ts
- OK: lib/saas/account-directory.ts
- OK: lib/saas/account-limits.ts
- OK: lib/saas/entitlement-limits.ts
- OK: app/api/account-limits/route.ts
- OK: app/api/client/output-entitlement/route.ts
- OK: app/api/generation-runs/route.ts
- OK: components/ClientOutputLimitBoundary.tsx
- OK: components/LetterGeneratorWorkspaceV2.tsx
- OK: components/console/AccountMenu.tsx
- OK: app/master/accounts/page.tsx
- OK: app/admin/clients/page.tsx

## Terminology contract checks

## Manager/Disputer limit sync checks

## Generation run persistence checks

## Master account directory checks

## Database migration checks
- OK: supabase/migrations/20260612023000_phase_13_account_limits.sql
- OK: supabase/migrations/20260612023300_phase_13_daily_client_output_entitlement.sql

## Result
- FAILED: 2 critical issue(s).
- CRITICAL: app/api/account-limits/route.ts: account limit writes must require authenticated role authority
- CRITICAL: app/api/generation-runs/route.ts: generation run write must authenticate Disputer/Manager context
- WARNINGS: 2 improvement item(s).
- WARNING: app/api/account-limits/route.ts: account limit write/read responses should avoid stale cache
- WARNING: app/api/generation-runs/route.ts: generation run route should call the canonical output-count rule
