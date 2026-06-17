# Master Console ⇄ UI Workspace Code Canvas

## Status

Implemented foundation for the latest master bottom switch mode label.

## Active switch contract

```text
Master Console ⇄ UI Workspace
```

The master console shell owns the canonical route switch:

```text
/master              -> /master/ui-workspace
/master/ui-workspace -> /master
```

## Coded now

- `components/console/ConsoleShell.tsx` exposes the new master switch copy through the visible bottom switch and data markers.
- `lib/workspace/master-console-ui-workspace.ts` defines the canonical label, routes, mode names, region names, and registry contract for future workspace wiring.

## Implementation model

The workspace should continue to use the existing master-only implementation:

```text
ConsoleShell
  -> sidebar navigation
  -> sidebar bottom switch
  -> master UI workspace route
  -> MasterHologramWorkspaceShell
  -> mode strip / live canvas / inspector
```

## Next coding rank

1. Import the new registry into `ConsoleShell` after the guard is updated to read the shared registry.
2. Rename master route nav labels to `Master Console` and `UI Workspace` consistently.
3. Add a topbar action cluster for client popover, notifications, and account avatar.
4. Add a notification table and read APIs.
5. Move global UI controls into typed registries with scoped overrides.

## Acceptance commands

```bash
npm run master-ui-workspace:guard
npm run console-shell:guard
npm run typecheck
npm run build
```

## Expected result

A master user sees one clear bottom switch mode, `Master Console ⇄ UI Workspace`, while the existing master-only workspace keeps its drag/edit/preview/inspector behavior.
