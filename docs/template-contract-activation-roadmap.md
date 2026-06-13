# Template Contract Activation Tracker

_Last updated: 2026-06-13 Asia/Manila_

## Goal

Preserve user-uploaded template layout while making generated output consistent through one canonical source-data and template-contract workflow.

## Current coded foundation

- `lib/template-contracts.ts` defines canonical fields, aliases, required fields by document kind, validation status, confidence, and what-if guidance.
- `lib/round-template-policy.ts` defines per-round intent, strictness, required letters, required exhibits, and packet order.
- `lib/preflight-validation.ts` blocks generation when source, routes, templates, evidence, affidavit data, or required custom fields are incomplete.
- `lib/supabase/template-registry.ts` models owner-scoped, round-scoped, versioned template assets.
- `app/api/template-assets/route.ts` now inspects uploaded template contracts, blocks `BLOCKED` contracts before storage, computes `content_hash`, stores `validation_json`, and detects duplicate active uploads.
- `app/api/template-assets/manifest/route.ts` exposes active template metadata for workspace hydration.

## Enhancement roadmap

| Step | Status | Target | Why |
| --- | --- | --- | --- |
| 1 | Coded | Template contract inspection | Let different layouts share the same canonical meaning. |
| 2 | Partially coded | Contract activation gate | Blocked templates now fail before storage; database-transaction activation is still pending. |
| 3 | Coded | Content hash on upload | Avoid duplicate active storage and improve traceability. |
| 4 | Coded | Validation JSON on asset row | Store why a template was accepted, warned, or blocked. |
| 5 | Existing, enhance | Latest-active slot resolver | Always use owner + round + slot + active version, never filename guessing. |
| 6 | Pending | Restore-window retention | Keep latest active and a small number of archived versions for free-tier storage control. |
| 7 | Existing, enhance | Preflight contract checks | Block generation if active templates are missing required canonical fields. |
| 8 | Existing, enhance | Generation manifest | Record source hash, template versions, template hashes, routes, and output summary. |

## Production rules

1. Templates may change wording, format, order, and sections.
2. Templates must preserve canonical anchors for required meaning.
3. Latest valid upload becomes active.
4. Invalid upload must not replace the previous active template.
5. User-owned templates must never bleed across users or rounds.
6. Generation should either produce deterministic output or block with a clear reason.
7. Storage should keep active template plus a small restore window, then remove older archived files.

## What-if matrix

| Scenario | Required behavior | Current state |
| --- | --- | --- |
| Wording changes but placeholders remain | Allow upload and preserve layout. | Supported by contract aliases/placeholders. |
| Section order changes but placeholders remain | Allow upload and preserve layout. | Supported by contract inspection. |
| Client name anchor is removed | Block activation. | Coded through `templateContractGateMessage`. |
| Account lines anchor is removed from dispute/late-payment letter | Block activation. | Coded through required canonical fields. |
| Alias changes from `client_name` to `consumer_name` | Allow if alias maps to `client.name`. | Supported by alias mapping. |
| Custom required field is added | Block generation until mapped or completed. | Upload contract detects; preflight custom readiness still handles workspace values. |
| Wrong file type is uploaded | Reject before storage. | Coded. |
| Duplicate active file is uploaded | Reuse active version metadata and avoid duplicate storage. | Coded when `content_hash` is present. |
| New upload is invalid | Keep previous active version. | Coded because invalid upload is blocked before storage/insert. |
| Many old versions exist | Keep restore window, clean older archived storage. | Pending because current route still removes previous versions after successful replacement. |

## Expected implementation outcome

The renderer remains dynamic-template-first, but every generation follows this path:

```text
canonical source packet
+ active template contract
+ round policy
+ preflight proof
+ generation manifest
= consistent output or clear blocker
```

## Next coding step

Add a Supabase RPC for atomic slot activation and archived-version retention. The app-level gate is already active, but database-level activation should be added before changing retention behavior so there is never a moment where an invalid or partial upload can replace the working active template.
