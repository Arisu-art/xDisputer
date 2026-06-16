# Master UI/UX Switch Mode Workspace Canvas

## Title

**xDisputer Master UI/UX Switch Mode Workspace Canvas — Hologram Control Layer**

## Purpose

Create a master-only visual governance workspace that lets a master user preview the product as client, manager, or master, switch between control modes, reorder approved UI blocks, inspect role-scoped navigation, review theme tokens, and prepare safe publish proposals.

This implementation is intentionally guarded: the current phase gives master users a live visual control shell and local draft manipulation without publishing to all users until the backend persistence, RLS, audit, publish, and rollback layer is implemented.

## Existing logic merged

This workspace sits on top of existing xDisputer UI governance layers:

```text
app/ui-theme-contracts.css              = base product tokens
app/ui-theme-triad.css                  = Client/Auth Aurora, Manager Graphite, Master Executive
app/unified-surface-contracts.css       = shared sidebar/header/card/chip/table behavior
app/master-hologram-workspace.css       = master-only visual control workspace
app/instant-interaction-performance.css = fast hover/tap/loading feedback
app/ui-layout-contracts.css             = final geometry owner
```

Existing security is preserved through:

```text
requireRole('master') on app/master/ui-workspace/page.tsx
no arbitrary HTML injection
no browser service role key
no publish mutation in this phase
```

## 5W + HOW

### Who

- Master users can open and use the workspace.
- Client and manager users do not get editor controls.
- AI can propose future patches only after a safe proposal layer is added.

### What

The workspace currently provides:

- Live View
- Edit Canvas
- Navigation Builder
- Theme Studio
- Publish Center readiness view
- Role preview switch: client, manager, master
- Local drag/reorder of approved unlocked blocks
- Inspector panel for selected block metadata
- Five impact controls: Layout Builder, Navigation Builder, Theme Studio, Content + Context Editor, AI Proposal Gate

### When

Use this route when planning or previewing cross-role UI/UX changes before coding or publishing them.

### Where

```text
/master/ui-workspace
```

Implementation files:

```text
app/master/ui-workspace/page.tsx
app/master/ui-workspace/loading.tsx
components/master-ui-workspace/MasterHologramWorkspaceShell.tsx
lib/master-ui-workspace/model.ts
app/master-hologram-workspace.css
scripts/master-ui-workspace-guard.mjs
docs/master-ui-ux-switch-mode-workspace-canvas.md
```

### Why

A master workspace should control xDisputer UI/UX through structured, versioned, role-aware models rather than raw code injection. The workspace should feel like a hologram control layer over the website: it shows the shape of the product, what can move, what is locked, and what must pass guards before publishing.

### How

```text
master opens /master/ui-workspace
→ server runs requireRole('master')
→ ConsoleShell renders master governance surface
→ MasterHologramWorkspaceShell loads client-side local draft state
→ master switches modes
→ master previews as client, manager, or master
→ master can drag unlocked blocks in Edit Canvas mode
→ inspector shows metadata and guardrails
→ Publish Center shows guard commands and readiness state
→ future backend phase persists draft/publish/rollback/audit records
```

## Switch modes

### Live View

Read-only preview of the current role-scoped UI model.

### Edit Canvas

Drag/reorder approved blocks. Locked system blocks cannot be dragged.

### Navigation Builder

Inspect role-scoped navigation items and route destinations.

### Theme Studio

Inspect approved token controls for triad themes and global surface behavior.

### Publish Center

Show risk score, required guards, and the publish readiness model.

## Five customization features

1. **Visual Layout Builder** — move approved route blocks and sections.
2. **Navigation Builder** — inspect and plan role-scoped nav changes.
3. **Theme Studio** — tune token-based colors, radius, chips, and motion.
4. **Content + Context Editor** — future phase for titles, helper copy, empty states, and labels.
5. **AI Proposal Gate** — future phase where AI produces patch proposals, risk scores, and rollback metadata.

## What loads first

- ConsoleShell
- Master UI workspace shell
- Mode strip
- Role preview switch
- Local block model
- Inspector panel

## What loads later in future backend phase

- Published runtime UI version
- Draft route tree
- Navigation records
- Theme overrides
- Content overrides
- Publish events
- Audit logs
- AI proposal history

## What is cached

- Static CSS
- Static JS chunks
- Approved model metadata
- Role preview state in memory

## What is paginated in future backend phase

- Audit logs
- Change requests
- Version history
- AI proposals

## What should not happen

```text
Do not let master inject raw unsafe JavaScript.
Do not use dangerouslySetInnerHTML.
Do not let AI publish directly.
Do not expose service role keys in frontend.
Do not bypass RLS.
Do not persist drafts without audit logs.
Do not let a broken draft affect live users.
Do not reload the full page after every drag.
Do not animate layout-heavy properties during drag.
Do not remove existing theme, triad, surface, instant, or layout contracts.
```

## Backend phase still required

The current coded phase is a safe visual-control shell. Full production publishing still needs:

```text
Supabase tables
RLS policies
draft save endpoint
preview endpoint
publish endpoint
rollback endpoint
audit logs
runtime UI fetcher
component registry validation
```

## Definition of done for this phase

- `/master/ui-workspace` is master-only.
- The route renders inside the existing ConsoleShell.
- The route has an instant loading state.
- The shell has five switch modes.
- The shell previews client, manager, and master role surfaces.
- Unlocked blocks can be locally reordered in Edit Canvas mode.
- Locked blocks stay protected.
- Inspector explains selected block purpose and guardrails.
- Guards can validate the route, model, styling, and safety constraints.
