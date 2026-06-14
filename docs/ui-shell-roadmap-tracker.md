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

## Implemented surfaces

| Surface | Status | Source |
| --- | --- | --- |
| Manager operations `/admin` | Implemented | `components/ManagerConsoleShell.tsx` |
| Manager workspace `/manager-workspace` | Implemented | `components/ManagerConsoleShell.tsx` + `components/ManagerTemplateWorkspaceClient.tsx` |
| Master home `/master` | Implemented | `app/master/MasterConsoleHome.tsx` |
| Master accounts `/master/accounts` | Implemented | `app/master/accounts/page.tsx` |
| Master workspaces `/master/workspaces` | Implemented | `app/master/workspaces/page.tsx` |

## Guarded contract

The active guard is:

```bash
node scripts/manager-visible-switch-contract-guard.mjs
```

It checks:

- account menu is inside the header-flow grid
- final ratio override stylesheet is imported
- header ratio override uses a real 3fr / 1fr layout
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
