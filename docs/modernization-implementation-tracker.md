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
| Zod-ready validation adapter | coded | `src/server/contracts/validated-input.ts` |
| Modernization readiness contract | coded | `src/server/contracts/modernization-readiness.ts` |
| HTTP response helper | coded | `src/server/http/api-response.ts` |
| Modernization status service | coded | `src/server/services/modernization-status.ts` |
| Auth boundary note | coded | `src/server/auth/README.md` |
| Data access boundary note | coded | `src/server/repositories/README.md` |
| Service boundary note | coded | `src/server/services/README.md` |
| Policy boundary note | coded | `src/server/policies/README.md` |
| Dependency sync tool | coded | `scripts/modernization-dependency-sync.mjs` |
| Modernization guard | coded | `scripts/modernization-boundary-guard.mjs` |
| Runtime readiness endpoint | coded | `app/api/system/modernization/route.ts` |
| Admin server-state loader | coded | `src/features/admin/modernization-status-client.ts` |
| Generation workflow rail | coded | `src/features/generation/components/WorkflowRail.tsx` |
| Source-data/generation UI wire-up | coded | `components/GuidedSourceDataFlow.tsx`, `app/source-progressive-studio.css` |

## Not coded yet

| Area | Status | Reason |
| --- | --- | --- |
| Tailwind v4 package installation | not coded | Add after package-lock is repaired and existing CSS guards pass. |
| shadcn/ui primitives | not coded | Requires Tailwind and component path setup first. |
| Full `src/app` migration | not coded | High-risk move; should happen route group by route group. |
| Root CSS reduction | not coded | Needs inventory and surface-by-surface migration. |
| Large component full split | partially coded | Workflow rail moved into feature ownership; remaining split must happen slice by slice. |
| API route service refactor | partially coded | Modernization endpoint converted to service-layer pattern; production routes still need route-by-route migration. |
| Zod dependency install | prepared | `scripts/modernization-dependency-sync.mjs` adds it after local lock sync. |
| TanStack Query dependency install | prepared | `scripts/modernization-dependency-sync.mjs` adds it after local lock sync; first server-state loader is ready. |

## Next safe coding order

1. Run `node scripts/modernization-dependency-sync.mjs` locally to sync `package.json` and `package-lock.json`.
2. Run `npm install`, then `npm run typecheck` and `npm run build`.
3. Convert one production API route to the service-result + validation adapter pattern.
4. Wrap the admin modernization status loader with TanStack Query after dependency install succeeds.
5. Continue splitting `GuidedSourceDataFlow` into feature-owned source-data and generation components.

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
