#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'app/api/template-assets/route.ts';
let source = readFileSync(file, 'utf8');

const before = `    const oldAssets = existingAssets.filter((asset) => asset.id !== insert.data.id);
    const cleanup = await deleteAssetRecordsAndFiles(session, oldAssets);

    if (cleanup.warning) {
      return respond(
        request,
        'ok',
        \`${'${round}'} ${'${targetType}'} template saved. Cleanup warning: ${'${cleanup.warning}'}\`,
        200,
        { assetId: insert.data.id, cleanupWarning: cleanup.warning }
      );
    }

    return respond(
      request,
      'ok',
      \`${'${round}'} ${'${targetType}'} template saved. ${'${cleanup.deleted}'} old version(s) removed.\`,
      200,
      { assetId: insert.data.id, oldVersionsRemoved: cleanup.deleted }
    );`;

const after = `    const oldAssets = existingAssets.filter((asset) => asset.id !== insert.data.id);
    if (oldAssets.length) {
      void session.supabase
        .from('template_assets')
        .update({ is_active: false })
        .eq('owner_id', session.user.id)
        .in('id', oldAssets.map((asset) => asset.id));
    }

    return respond(
      request,
      'ok',
      \`${'${round}'} ${'${targetType}'} template saved. Previous version cleanup is running in the background.\`,
      200,
      { assetId: insert.data.id, oldVersionsArchived: oldAssets.length }
    );`;

if (!source.includes(before)) {
  console.log('Fast template asset route repair not needed or route has already changed.');
  process.exit(0);
}

source = source.replace(before, after);
writeFileSync(file, source);
console.log('Repaired template upload route to respond before slow storage cleanup.');
