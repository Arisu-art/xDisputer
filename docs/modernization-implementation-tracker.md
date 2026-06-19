# xDisputer 10x Modernization Implementation Tracker

Source canvas: `x_disputer_10_x_modernization_instruction_canvas.md` and `X Disputer 10x Modernization Instruction Canvas.pdf`.

## Current modernization rule

Modernize boundaries first. Do not rewrite the domain workflow first. Keep current dispute generation, DOCX, PDF, Supabase, and account behavior stable while adding a standard modular structure beside the existing implementation.

## Coded in this pass

| Area | Status | Files |
| --- | --- | --- |
| Modernization tracker | coded | `docs/modernization-implementation-tracker.md` |
| Boundary contract | coded | `docs/modernization-boundary-contract.md` |
| Modular feature root | coded | `src/features/README.md` |
| Feature ownership stubs | coded | `src/features/auth/README.md`, `src/features/accounts/README.md`, `src/features/templates/README.md`, `src/features/source-data/README.md`, `src/features/generation/README.md`, `src/features/outputs/README.md`, `src/features/evidence/README.md`, `src/features/notifications/README.md`, `src/features/admin/README.md` |
| Server boundary root | coded | `src/server/README.md` |
| Server result contract | coded | `src/server/contracts/service-result.ts` |
| HTTP response helper | coded | `src/server/http/api-response.ts` |
| Auth boundary note | coded | `src/server/auth/README.md` |
| Data access boundary note | coded | `src/server/repositories/README.md` |
| Service boundary note | coded | `src/server/services/README.md` |
| Policy boundary note | coded | `src/server/policies/README.md` |
| Modernization guard | coded | `scripts/modernization-boundary-guard.mjs` |
| Runtime readiness endpoint | coded | `app/api/system/modernization/route.ts` |

## Not coded yet

| Area | Status | Reason |
| --- | --- | --- |
| Tailwind v4 package installation | not coded | Package lock is currently unstable. Add after lockfile is repaired. |
| shadcn/ui primitives | not coded | Requires Tailwind and component path setup first. |
| TanStack Query | not coded | Add after package lock repair and first server-state target is selected. |
| Zod package installation | not coded | Add after package lock repair; contracts are prepared as zod-ready boundaries. |
| Full `src/app` migration | not coded | High-risk move; should happen route group by route group. |
| Root CSS reduction | not coded | Needs inventory and surface-by-surface migration. |
| Large component split | not coded | Requires one feature target at a time, starting with generation/source-data. |
| API route service refactor | not coded | Requires route-by-route service extraction. |

## Next safe coding order

1. Repair and commit `package-lock.json` so dependency changes become reliable.
2. Add `zod` first, then convert one API route contract.
3. Add `@tanstack/react-query` only when the first server-state screen is selected.
4. Add Tailwind v4 and shadcn/ui only after current CSS guards pass cleanly.
5. Convert one visible UI surface to consume `lib/frontend-control` and the new `src/features` ownership model.

## Current verification commands

```bash
node scripts/frontend-control-guard.mjs
node scripts/modernization-boundary-guard.mjs
npm run layout:guard
npm run ui-source:guard
npm run typecheck
npm run build
```

## Tracking rule

Every modernization patch must update this tracker with:

- coded files
- not-coded items
- reason for deferral
- next safe action
