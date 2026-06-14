# TemplateExecution Orchestration Roadmap

## Goal

Make manager-owned templates the single execution source for client generation. The generation path must flow through one orchestrator:

```text
assigned manager template
→ active template asset
→ canonical source model
→ dynamic renderer v2 first
→ legacy adapter only as fallback
→ generation manifest
→ render debugger runtime proof
```

## Implemented phases

| Phase | Status | Source of truth | Guard |
| --- | --- | --- | --- |
| Phase 1 — Canonical source model | Implemented | `lib/template-execution/canonical-source-model.ts` | `scripts/template-execution-guard.mjs` |
| Phase 2 — Manager template resolver | Implemented | `lib/template-execution/manager-template-resolver.ts` | `scripts/template-execution-guard.mjs` |
| Phase 3 — Dynamic engine facade | Implemented | `lib/template-execution/dynamic-template-engine.ts` | `scripts/template-execution-guard.mjs` |
| Phase 4 — Legacy renderer adapter | Implemented | `lib/template-execution/legacy-renderer-adapter.ts` | `scripts/template-execution-guard.mjs` |
| Phase 5 — Template execution guards | Implemented | `lib/template-execution/template-execution-guards.ts` | `scripts/template-execution-guard.mjs` |
| Phase 6 — Orchestrator wiring | Implemented | `lib/template-execution/template-execution-orchestrator.ts` | `scripts/template-execution-guard.mjs` |
| Phase 7 — Client workspace cutover | Implemented | `components/LetterGeneratorWorkspaceV2.tsx` | `scripts/template-execution-guard.mjs` |
| Phase 8 — Runtime template debugger | Implemented | `components/console/RenderDebugger.tsx` | `scripts/ui-shell-registry-guard.mjs` |

## Active execution contract

The client workspace no longer owns renderer selection. It calls:

```ts
executeTemplateGeneration({
  round,
  source,
  normalized,
  parsed,
  routes,
  references,
  templates,
  registryAssets,
  managerTemplateScope,
  documentDate,
  cleanName,
  packetStepsForType
})
```

The orchestrator owns:

- manager template slot resolution
- local fallback gating
- generation readiness blocking
- dynamic renderer v2 attempt
- legacy renderer fallback
- FTC workflow routing
- affidavit routing
- runtime debug snapshot publishing

## Runtime proof

Open any generated workspace route with:

```text
?xdisputerDebug=1
```

Then inspect:

```js
window.__xdisputerTemplateExecution
```

Expected shape:

```js
{
  status: 'rendered',
  round: '1st Round',
  outputs: 4,
  warnings: 0,
  engines: ['dynamic-template-v2'],
  missingSlots: [],
  generatedAt: '...'
}
```

## Verification

```bash
npm run template-execution:guard
npm run ui-source:guard
npm run typecheck
npm run build
```

## Remaining improvement backlog

| Item | Why it remains | Recommended next step |
| --- | --- | --- |
| Server-side generation API | Current orchestrator runs in browser workspace | Add `/api/template-execution/generate` after client path is stable |
| Template manifest cache | Current asset API fetches per round | Add cache tag invalidation after upload/remove |
| Playwright authenticated smoke | Requires storage-state file | Generate and commit no secrets; store locally only |
| Full legacy renderer deletion | Fallback still needed during rollout | Remove after v2 passes real-template regression |
