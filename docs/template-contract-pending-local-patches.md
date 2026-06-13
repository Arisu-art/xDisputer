# Pending Template Provenance Local Patch Notes

_Last updated: 2026-06-13 Asia/Manila_

## Why this file exists

The template contract workflow is mostly wired, but one browser workspace patch remains safer to apply locally because `components/LetterGeneratorWorkspaceV2.tsx` is large and single-line-heavy in its JSX return.

## Pending browser workspace wiring

Target file:

```text
components/LetterGeneratorWorkspaceV2.tsx
```

Required changes:

1. Extend `RegistryTemplateAsset` with:

```ts
validation_json?: Record<string, unknown> | null;
content_hash?: string | null;
version_number?: number | null;
```

2. When converting a Supabase letter asset into an effective letter reference, add:

```ts
assetId: registryAsset.id,
source: 'SUPABASE_TEMPLATE_ASSET',
versionNumber: registryAsset.version_number || null,
contentHash: registryAsset.content_hash || null,
validationJson: registryAsset.validation_json || null
```

3. When converting a Supabase exhibit asset into an effective exhibit template, add the same metadata fields.

4. In both `buildGenerationManifest(...)` calls, pass:

```ts
references: effectiveRefs,
templates: effectiveTemplates,
```

instead of:

```ts
references: refs,
templates,
```

## Why this matters

`lib/generation-manifest.ts` already supports source hash, source summary, template provenance, asset ID, version, content hash, and validation status. The remaining workspace patch makes the browser-created `generation-manifest.json` include the same Supabase-backed template proof already available to the UI.

## Validation after patch

```bash
npm run typecheck
npm run build
npm run xdisputer:guard
```

Then generate a packet and inspect `generation-manifest.json` for:

```text
Source Hash:
Templates:
asset
version
hash
status
```
