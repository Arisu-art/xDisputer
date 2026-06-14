#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function writeIfChanged(path, before, after) {
  if (before === after) {
    console.log(`Manager template storage wiring already present: ${path}`);
    return;
  }

  writeFileSync(path, after);
  console.log(`Applied manager template storage wiring: ${path}`);
}

function ensureImport(source, anchor, importLine) {
  if (source.includes(importLine)) return source;
  return source.replace(anchor, `${anchor}\n${importLine}`);
}

function normalizeTemplateStoragePayload(source) {
  const duplicateGet = "managerTemplateScope: managerTemplateScopePayload(scope), templateStorage: { mode: managerTemplateStorageMode() }, dynamicTemplateEngineV2: { rendererMode, autoBackfilled: autoBackfill.backfilledCount, warnings: autoBackfill.warnings }, templateStorage: { mode: managerTemplateStorageMode() }";
  const canonicalGet = "managerTemplateScope: managerTemplateScopePayload(scope), templateStorage: { mode: managerTemplateStorageMode() }, dynamicTemplateEngineV2: { rendererMode, autoBackfilled: autoBackfill.backfilledCount, warnings: autoBackfill.warnings }";
  source = source.replaceAll(duplicateGet, canonicalGet);

  source = source.replace(
    "managerTemplateScope: managerTemplateScopePayload(scope), dynamicTemplateEngineV2",
    "managerTemplateScope: managerTemplateScopePayload(scope), templateStorage: { mode: managerTemplateStorageMode() }, dynamicTemplateEngineV2"
  );

  source = source.replaceAll(duplicateGet, canonicalGet);
  return source;
}

function patchTemplateAssetsRoute() {
  const path = 'app/api/template-assets/route.ts';
  if (!existsSync(path)) return;

  const before = readFileSync(path, 'utf8');
  let source = before;

  source = ensureImport(
    source,
    "import { assertCanManageManagerTemplates, managerTemplateScopePayload, resolveManagerTemplateScope, ManagerTemplateScopeError } from '../../../lib/manager-template-scope';",
    "import { downloadManagerTemplateObject, managerTemplateStorageMode, removeManagerTemplateObjects, uploadManagerTemplateObject } from '../../../lib/supabase/template-storage-service';"
  );

  source = source.replace(
    /input\.session\.supabase\.storage\.from\(asset\.storage_bucket \|\| 'template-assets'\)\.download\(asset\.storage_path\)/g,
    "downloadManagerTemplateObject({ sessionSupabase: input.session.supabase, bucket: asset.storage_bucket || 'template-assets', path: asset.storage_path })"
  );

  source = source.replace(
    /session\.supabase\.storage\.from\('template-assets'\)\.upload\(storagePath, new Blob\(\[fileBuffer\], \{ type: file\.type \|\| 'application\/octet-stream' \}\), \{ contentType: file\.type \|\| 'application\/octet-stream', upsert: false \}\)/g,
    "uploadManagerTemplateObject({ sessionSupabase: session.supabase, bucket: 'template-assets', path: storagePath, body: new Blob([fileBuffer], { type: file.type || 'application/octet-stream' }), contentType: file.type || 'application/octet-stream', upsert: false })"
  );

  source = source.replace(
    /session\.supabase\.storage\.from\('template-assets'\)\.remove\(\[storagePath\]\)/g,
    "removeManagerTemplateObjects({ sessionSupabase: session.supabase, bucket: 'template-assets', paths: [storagePath] })"
  );

  source = source.replace(
    /session\.supabase\.storage\.from\(bucket\)\.remove\(paths\)/g,
    "removeManagerTemplateObjects({ sessionSupabase: session.supabase, bucket, paths })"
  );

  source = normalizeTemplateStoragePayload(source);

  source = source.replace(
    /managerTemplateScope: managerTemplateScopePayload\(scope\), validation: contract\.validation/g,
    "managerTemplateScope: managerTemplateScopePayload(scope), templateStorage: { mode: managerTemplateStorageMode() }, validation: contract.validation"
  );

  source = source.replace(
    /managerTemplateScope: managerTemplateScopePayload\(scope\) \}\);/g,
    "managerTemplateScope: managerTemplateScopePayload(scope), templateStorage: { mode: managerTemplateStorageMode() } });"
  );

  source = normalizeTemplateStoragePayload(source);

  writeIfChanged(path, before, source);
}

function patchTemplateFileRoute() {
  const path = 'app/api/template-assets/file/route.ts';
  if (!existsSync(path)) return;

  const before = readFileSync(path, 'utf8');
  let source = before;

  source = ensureImport(
    source,
    "import { managerTemplateScopePayload, resolveManagerTemplateScope, ManagerTemplateScopeError } from '../../../../lib/manager-template-scope';",
    "import { downloadManagerTemplateObject } from '../../../../lib/supabase/template-storage-service';"
  );

  source = source.replace(
    "function privateTemplateCacheHeaders(input: { etag: string; filename: string; mimeType: string | null; managerUserId: string }) {",
    "function privateTemplateCacheHeaders(input: { etag: string; filename: string; mimeType: string | null; managerUserId: string }): Record<string, string> {"
  );

  source = source.replace(
    /const download = await session\.supabase\.storage\.from\(asset\.storage_bucket\)\.download\(asset\.storage_path\);\n  if \(download\.error\) return NextResponse\.json\(\{ error: download\.error\.message \}, \{ status: 500 \}\);\n\n  return new Response\(download\.data, \{ headers \}\);/g,
    "const download = await downloadManagerTemplateObject({ sessionSupabase: session.supabase, bucket: asset.storage_bucket || 'template-assets', path: asset.storage_path });\n  if (download.error || !download.data) return NextResponse.json({ error: download.error?.message || 'Template file could not be loaded.', category: 'MANAGER_TEMPLATE' }, { status: 500 });\n  headers['x-template-storage-mode'] = download.mode;\n\n  return new Response(download.data, { headers });"
  );

  writeIfChanged(path, before, source);
}

patchTemplateAssetsRoute();
patchTemplateFileRoute();
