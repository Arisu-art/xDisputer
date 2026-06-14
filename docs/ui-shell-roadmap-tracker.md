# UI Shell Roadmap Tracker

Active mode: GitHub repo + Codespaces + Supabase only. Deployment integrations are not part of the current validation path.

## Current objective

Keep every console surface on the same header-shell model:

- left content/header area uses the 75% grid span
- right account/avatar dock uses the 25% grid span
- both header cards stretch to the same height
- account menu opens from the same dock position, not as a dropped panel below the header
- old sidebar account footer and sign-out duplicates are removed
- compact template summary chips remain removed

## Phase roadmap

| Phase | Status | Source of truth | Guard |
| --- | --- | --- | --- |
| Phase 0 — Shell surface inventory | Implemented | This tracker | `scripts/console-shell-contract-guard.mjs` |
| Phase 1 — Global shell contract | Implemented | `components/console/ConsoleShell.tsx` | `scripts/console-shell-contract-guard.mjs` |
| Phase 2 — Global layout tokens | Implemented | `app/console-shell-system.css` | `scripts/console-shell-contract-guard.mjs` |
| Phase 3 — Shared avatar account dock | Implemented | `components/ManagerAccountMenu.tsx` + `app/account-menu-ratio-system.css` | `scripts/manager-visible-switch-contract-guard.mjs` |
| Phase 4 — Remaining master secondary pages | Pending | `/master/reports`, `/master/audit`, `/master/system`, `/master/recovery` | pending |
| Phase 5 — Remaining manager secondary pages | Pending | `/admin/access`, reports, audit if they bypass `ManagerConsoleShell` | pending |

## Implemented surfaces

| Surface | Status | Shell source | Header ratio | Avatar menu | Old account footer removed |
| --- | --- | --- | --- | --- | --- |
| Manager operations `/admin` | Implemented | `components/ManagerConsoleShell.tsx` → `components/console/ConsoleShell.tsx` | Implemented | Implemented | Implemented |
| Manager workspace `/manager-workspace` | Implemented | `components/ManagerConsoleShell.tsx` → `components/console/ConsoleShell.tsx` | Implemented | Implemented | Implemented |
| Master home `/master` | Implemented | `components/console/ConsoleShell.tsx` | Implemented | Implemented | Implemented |
| Master accounts `/master/accounts` | Implemented | `components/console/ConsoleShell.tsx` | Implemented | Implemented | Implemented |
| Master workspaces `/master/workspaces` | Implemented | `components/console/ConsoleShell.tsx` | Implemented | Implemented | Implemented |

## Guarded contract

The active guards are:

```bash
node scripts/console-shell-contract-guard.mjs
node scripts/manager-visible-switch-contract-guard.mjs
```

They check:

- all migrated pages delegate sidebar/main/header ownership to `ConsoleShell`
- account menu is inside the header-flow grid
- final ratio override stylesheet is imported through the active account menu CSS chain
- header ratio uses a real 3fr / 1fr layout
- account dock and header cards stretch to the same height
- account dock is relative and header-flow, not fixed
- account popover opens from the same header position
- template summary chips are removed
- old sidebar account footer is removed

## Verification command

```bash
npm run xdisputer:guard
```

## Manual runtime test

```bash
npm run codespace:dev
```

Then inspect:

- `/admin`
- `/manager-workspace`
- `/master`
- `/master/accounts`
- `/master/workspaces`
