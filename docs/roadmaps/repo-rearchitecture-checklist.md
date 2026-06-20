# xDisputer Repo Re-architecture Checklist

## Top 6 active fixes

- [x] Fix 1 — stable cleanup entrypoint
  - File: `scripts/finalize-retired-surface-cleanup.mjs`
  - Goal: one deterministic local repair path, no giant pasted terminal code.

- [x] Fix 2 — route convention normalization
  - Files: `proxy.ts`, deprecated `middleware.ts` removed by cleanup
  - Goal: align with Next.js 16 proxy convention.

- [x] Fix 3 — client account CSS repair
  - Files: `app/client-account-popover-ratio.css`, `app/account-popover-compact-retirement.css`
  - Goal: valid client account dock CSS with no retired chip selectors.

- [x] Fix 4 — client layout CSS repair
  - File: `app/client-workspace-layout-lock.css`
  - Goal: valid layout CSS with owned dashboard geometry and no brace corruption.

- [x] Fix 5 — contract-driven guard alignment
  - Files: `scripts/assistant-chip-retirement-guard.mjs`, `scripts/client-account-popover-guard.mjs`, `scripts/client-critical-gaps-guard.mjs`, `scripts/css-ownership-guard.mjs`, `src/features/client-workspace/client-dashboard-surface.ts`, `src/features/client-workspace/client-css-ownership.ts`
  - Goal: guards verify current product truth instead of legacy hidden-chip behavior.

- [x] Fix 6 — roadmap + tracker enforcement
  - Files: `docs/roadmaps/repo-rearchitecture-checklist.md`, `scripts/repo-rearchitecture-roadmap-guard.mjs`
  - Goal: every cleanup phase is traceable and checkable.

## Next roadmap phases

- [ ] Phase 7 — root CSS import reduction
- [ ] Phase 8 — notification ownership isolation
- [ ] Phase 9 — backend route/service contract audit
- [ ] Phase 10 — delete temporary compatibility layers after verification
