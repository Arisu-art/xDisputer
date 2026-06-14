# Manager Workspace Status

## Roadmap status: coded

The manager-template ownership model is coded for local development and production deploy once the required environment variables are present.

## Coded five-item roadmap

1. **No raw manager upload page**
   - `/manager-workspace` uses `ManagerTemplateWorkspaceClient` and `TemplateProgressiveWorkspace`.
   - The manager upload experience follows the same round → packet → contextual card workflow as the client workspace.
   - Raw multipart upload cards are guarded against by `scripts/manager-template-roadmap-guard.mjs`.

2. **Shared manager shell**
   - `components/ManagerConsoleShell.tsx` owns the manager sidebar, switch-mode button, nav, account block, and content area.
   - `/manager-workspace` uses this shell directly.
   - Operations pages keep direct switch rendering until all legacy manager pages are migrated into the shared shell.

3. **Connected manager/client template workflow**
   - `TemplatePacketConfigurator` accepts `ManagerTemplateScopeUi`, `canManageTemplates`, and `managedExhibits` directly.
   - Managers can upload, replace, and remove templates.
   - Clients see read-only manager-controlled template cards.

4. **Generation template resolver**
   - `lib/manager-template-file-resolver.ts` resolves the actual active manager DOCX/PDF file for generation.
   - Client generation uses manager assets first and does not use local browser fallback unless manager edit mode allows it.
   - `scripts/apply-manager-template-generation-wiring.mjs` wires the resolver into `LetterGeneratorWorkspaceV2` before dev/typecheck/build.

5. **Hard guard coverage**
   - `scripts/manager-template-roadmap-guard.mjs` verifies shared shell, no raw upload cards, manager/client template UX, template resolver, and manager provenance source.
   - `scripts/manager-workspace-guard.mjs` verifies switch mode across manager console pages.
   - `scripts/manager-local-dev-ready-guard.mjs` is the local readiness check for `/admin` and `/manager-workspace`.

## UX model

`/admin` remains Operations Monitoring Console.

`/manager-workspace` is the relevant work environment for manager template defaults.

Managers upload templates once. Assigned clients use those active defaults and see read-only manager-controlled template state.

## Local verification

After pulling latest code, run `node scripts/manager-local-dev-ready-guard.mjs`, restart dev, and open `/admin`. The manager console should show the switch-mode button to Manager Workspace, and `/manager-workspace` should show the client-style progressive template upload workflow.
