# Manager Workspace Status

## Coded five-item roadmap

1. **No raw manager upload page**
   - `/manager-workspace` now uses `ManagerTemplateWorkspaceClient` and `TemplateProgressiveWorkspace`.
   - The manager upload experience follows the same round → packet → contextual card workflow as the client workspace.
   - Raw multipart upload cards are guarded against by `scripts/manager-template-roadmap-guard.mjs`.

2. **Shared manager shell**
   - `components/ManagerConsoleShell.tsx` owns the manager sidebar, switch-mode button, nav, account block, and content area.
   - `/manager-workspace` uses this shell directly.

3. **Connected manager/client template workflow**
   - `TemplatePacketConfigurator` now accepts `ManagerTemplateScopeUi`, `canManageTemplates`, and `managedExhibits` directly.
   - Managers can upload/replace/remove templates.
   - Clients see read-only manager-controlled template cards.

4. **Generation template resolver**
   - `lib/manager-template-file-resolver.ts` resolves the actual active manager DOCX/PDF file for generation.
   - Client generation should use manager assets first and should not use local browser fallback unless manager edit mode allows it.
   - `scripts/apply-manager-template-generation-wiring.mjs` wires the resolver into `LetterGeneratorWorkspaceV2` before dev/typecheck/build.

5. **Hard guard coverage**
   - `scripts/manager-template-roadmap-guard.mjs` verifies the shared shell, no raw upload cards, manager/client template UX, template resolver, and manager provenance source.

## UX model

`/admin` remains Operations Monitoring Console.

`/manager-workspace` is the relevant work environment for manager template defaults.

Managers upload templates once. Assigned clients use those active defaults and see read-only manager-controlled template state.
