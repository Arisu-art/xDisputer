# Manager Workspace Status

## Coded

- `/manager-workspace` is a dedicated manager environment separate from `/admin` Operations.
- Managers and masters can access it; clients are redirected by route protection.
- The page has a manager-focused sidebar, switch links, round upload cards, active template metrics, and active/history table.
- Upload forms post to `/api/template-assets`, which is already manager-scoped and blocks client mutation.
- `scripts/apply-manager-workspace-nav-wiring.mjs` adds a switch link from Operations to Manager Workspace.
- `scripts/manager-workspace-guard.mjs` verifies route, upload API wiring, protected route, and Operations navigation.

## UX model

`/admin` remains Operations Monitoring Console.

`/manager-workspace` is the relevant work environment for manager template defaults.

Managers upload templates once. Assigned clients use those active defaults and see read-only manager-controlled template state.
