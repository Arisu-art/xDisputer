# Responsive Layout and Stability Canvas

## Goal

Make xDisputer responsive and stable on narrow phones, normal laptops, Codespace preview windows, and wide monitors. Layouts must not depend on one fixed desktop width. Loading states must not stay on screen forever.

## Priority order

1. Stabilize flicker and cold loading states.
2. Give each feature one final layout owner.
3. Make center workspaces content-first.
4. Stack complex panels on narrow screens.
5. Add guards so the same regressions do not return.

## Root causes

### Competing layout ownership

Some feature pages have multiple CSS files changing the same grid, width, max-width, and sticky behavior. That makes the result depend on load order and viewport size.

### Center canvas is not always prioritized

Supporting Documents has three zones: documents, page, and controls. The page preview must receive the maximum safe width first. Side panels should compress before the page becomes small.

### Cold entitlement checks can appear stuck

The Disputer workspace waits for daily allowance before showing controls. A cold fetch needs a timeout and retry state so the screen does not stay at `Checking daily output allowance` forever.

### Fixed widths break different screens

Fixed widths work in one screenshot and fail in another. The safer layout language is `clamp()`, `minmax(0, 1fr)`, `width: min(100%, max)`, and documented breakpoints.

## Global responsive contract

### Normal cards and rows

Use flexible grids:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: clamp(10px, 1.2vw, 18px);
}
```

### Three-panel editors

Use compact side columns and a flexible center:

```css
.editor {
  display: grid;
  grid-template-columns: minmax(150px, 220px) minmax(0, 1fr) minmax(164px, 240px);
  grid-template-areas: "documents page controls";
}

@media (max-width: 1100px) {
  .editor {
    grid-template-columns: 1fr;
    grid-template-areas: "documents" "page" "controls";
  }
}
```

### Text safety

Every grid or flex row with names, emails, filenames, or client labels must use `min-width: 0` and controlled overflow. Compact chips should use ellipsis. Long IDs should use `overflow-wrap: anywhere`.

### Modal safety

Modals should mount to `document.body`, use `position: fixed`, and avoid transformed ancestors.

## Flicker prevention contract

Each page should have one route refresh owner. Realtime hooks can update local state, but they should not cause multiple route refreshes. Preserve last stable data during transient refetches.

Cold checks need a timeout pattern:

```ts
const controller = new AbortController();
const timeout = window.setTimeout(() => controller.abort(), 8000);
try {
  await fetch(url, { signal: controller.signal });
} finally {
  window.clearTimeout(timeout);
}
```

## Supporting Documents contract

### Wide desktop

- Three columns: files, page, controls.
- Center page fills the available middle column.
- Side panels are compact and secondary.

### Laptop

- Side panels compress.
- Center page remains readable.
- Sticky panels remain only while there is enough screen space.

### Narrow screen

- Stack as documents, page, controls.
- Page preview uses the full available width.
- No horizontal overflow.

## Implemented markers

- `app/supporting-documents-runtime-wide-fix.css` is the final Supporting Documents layout owner.
- It uses `--support-runtime-page-max` for maximum page size.
- It keeps `grid-template-areas: "documents page controls"` on wide screens.
- It stacks to `"documents" "page" "controls"` on narrow screens.
- It disables animation and blur in the editor to reduce preview flicker.
- `components/ClientOutputLimitBoundary.tsx` uses `ENTITLEMENT_FETCH_TIMEOUT_MS` to avoid an infinite cold loading card.

## Roadmap

### Phase 1

Stabilize refresh owners, add timeouts, and preserve last known data.

### Phase 2

Make one CSS owner per major feature and move final overrides into that owner.

### Phase 3

Replace fixed desktop grids with responsive contracts.

### Phase 4

Add guards for center-priority Supporting Documents, entitlement timeout, no permanent refresh loops, and safe Supabase channel cleanup.

## Acceptance checklist

- Supporting Documents center page is large on wide screens.
- Supporting Documents stacks cleanly on narrow screens.
- Side panels do not shrink the page first.
- No text overlap in cards, rows, or tables.
- No raw unstyled flicker during normal use.
- No endless daily allowance checking screen.
