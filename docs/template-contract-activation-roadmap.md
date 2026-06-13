# Template Contract Activation Tracker

_Last updated: 2026-06-13 Asia/Manila_

## Goal

Preserve user-uploaded template layout while making generated output consistent through one canonical source-data and template-contract workflow.

## Current coded foundation

- `lib/template-contracts.ts` defines canonical fields, aliases, required fields by document kind, validation status, confidence, and what-if guidance.
- `lib/round-template-policy.ts` defines per-round intent, strictness, required letters, required exhibits, and packet order.
- `lib/preflight-validation.ts` blocks generation when source, routes, templates, evidence, affidavit data, or required custom fields are incomplete.
- `lib/supabase/template-registry.ts` models owner-scoped, round-scoped, versioned template assets and now exposes a latest-active slot resolver.
- `app/api/template-assets/route.ts` now inspects uploaded template contracts, blocks `BLOCKED` contracts before storage, computes `content_hash`, stores `validation_json`, detects duplicate active uploads, and archives superseded versions instead of immediately deleting them.
- `app/api/template-assets/manifest/route.ts` now resolves one latest active template per owner + round + slot and reports duplicate active slot diagnostics.

## Enhancement roadmap

| Step | Status | Target | Why |
| --- | --- | --- | --- |
| 1 | Coded | Template contract inspection | Let different layouts share the same canonical meaning. |
| 2 | Partially coded | Contract activation gate | Blocked templates now fail before storage; database-transaction activation is still pending. |
| 3 | Coded | Content hash on upload | Avoid duplicate active storage and improve traceability. |
| 4 | Coded | Validation JSON on asset row | Store why a template was accepted, warned, or blocked. |
| 5 | Coded | Latest-active slot resolver | Manifest hydration now selects the latest active asset per owner + round + slot. |
| 6 | Partially coded | Restore-window retention | Superseded versions are now archived instead of deleted; database cleanup policy is still pending. |
| 7 | Existing, enhance | Preflight contract checks | Block generation if active templates are missing required canonical fields. |
| 8 | Existing, enhance | Generation manifest | Record source hash, template versions, template hashes, routes, and output summary. |

## Production rules

1. Templates may change wording, format, order, and sections.
2. Templates must preserve canonical anchors for required meaning.
3. Latest valid upload becomes active.
4. Invalid upload must not replace the previous active template.
5. User-owned templates must never bleed across users or rounds.
6. Generation should either produce deterministic output or block with a clear reason.
7. Storage should keep active template plus archived metadata; destructive cleanup should run only through an explicit database-backed retention policy.

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
| Multiple active rows exist for one slot | Manifest chooses the latest active version by slot freshness and reports duplicate diagnostics. | Coded. |
| Many old versions exist | Archive superseded versions; cleanup later through explicit policy. | App-level archive coded; storage cleanup policy pending. |

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

Enhance preflight to read active template contract validation metadata from the resolved template assets and fail fast if any active template contract is `BLOCKED` or missing required canonical fields. Database-level activation and cleanup policy remain the next Supabase hardening step.
