import { NextResponse, type NextRequest } from 'next/server';
import { getSessionContext } from '../../../lib/saas/session';
import { inspectTemplateContract, type TemplateDocumentKind } from '../../../lib/template-contracts';
import type { ExhibitKind } from '../../../lib/template-exhibits';
import type { LetterType } from '../../../lib/letter-engine';
import type { Round } from '../../../lib/reference-store';
import { templateStoragePath, type TemplateKind } from '../../../lib/supabase/template-registry';

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const allowedLetterTypes = ['DISPUTE', 'LATE_PAYMENT'];
const allowedExhibitKinds = ['FCRA', 'AFFIDAVIT', 'ATTACHMENT', 'FTC'];

function wantsJson(request: NextRequest) {
  return request.headers.get('accept')?.includes('application/json')
    || request.headers.get('x-template-upload') === 'workspace';
}

function respond(request: NextRequest, status: 'ok' | 'error', message: string, code = status === 'ok' ? 200 : 400, extra: Record<string, unknown> = {}) {
  if (wantsJson(request)) {
    return NextResponse.json({ status, message, ...extra }, { status: code });
  }

  const fallback = new URL('/system/templates', request.url);
  const referer = request.headers.get('referer');
  const target = referer ? new URL(referer) : fallback;

  target.searchParams.set('control', status);
  target.searchParams.set('message', message.slice(0, 220));

  return NextResponse.redirect(target, 303);
}

function documentKind(input: {
  templateKind: string;
  letterType: string | null;
  exhibitKind: string | null;
}): TemplateDocumentKind {
  if (input.templateKind === 'LETTER') {
    return input.letterType === 'LATE_PAYMENT' ? 'LATE_PAYMENT_LETTER' : 'DISPUTE_LETTER';
  }

  return input.exhibitKind as TemplateDocumentKind;
}

function assertFileType(file: File, kind: TemplateDocumentKind) {
  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isDocx =
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx');

  if ((kind === 'FCRA' || kind === 'ATTACHMENT') && !isPdf) {
    throw new Error(`${kind} requires a PDF file.`);
  }

  if (kind !== 'FCRA' && kind !== 'ATTACHMENT' && !isDocx) {
    throw new Error(`${kind} requires a DOCX file.`);
  }
}

function validateSlot(input: {
  round: string;
  templateKind: string;
  letterType: string;
  exhibitKind: string;
}) {
  if (!allowedRounds.includes(input.round)) return 'Invalid round.';
  if (input.templateKind !== 'LETTER' && input.templateKind !== 'EXHIBIT') return 'Invalid template kind.';

  if (input.templateKind === 'LETTER' && !allowedLetterTypes.includes(input.letterType)) {
    return 'Invalid letter type.';
  }

  if (input.templateKind === 'EXHIBIT' && !allowedExhibitKinds.includes(input.exhibitKind)) {
    return 'Invalid exhibit kind.';
  }

  return null;
}

async function findExistingAssets(session: Awaited<ReturnType<typeof getSessionContext>>, input: {
  round: string;
  templateKind: string;
  letterType: string | null;
  exhibitKind: string | null;
}) {
  let query = session.supabase
    .from('template_assets')
    .select('id, storage_bucket, storage_path, version_number')
    .eq('owner_id', session.user!.id)
    .eq('round_label', input.round)
    .eq('template_kind', input.templateKind)
    .order('version_number', { ascending: false });

  if (input.letterType) query = query.eq('letter_type', input.letterType);
  if (input.exhibitKind) query = query.eq('exhibit_kind', input.exhibitKind);

  return query;
}

async function deleteAssetRecordsAndFiles(session: Awaited<ReturnType<typeof getSessionContext>>, assets: Array<{
  id: string;
  storage_bucket: string;
  storage_path: string;
}>) {
  if (!assets.length) return { deleted: 0, warning: null as string | null };

  const bucketGroups = new Map<string, string[]>();

  assets.forEach((asset) => {
    const bucket = asset.storage_bucket || 'template-assets';
    const paths = bucketGroups.get(bucket) || [];
    paths.push(asset.storage_path);
    bucketGroups.set(bucket, paths);
  });

  for (const [bucket, paths] of Array.from(bucketGroups.entries())) {
    const storageDelete = await session.supabase.storage.from(bucket).remove(paths);
    if (storageDelete.error) {
      return { deleted: 0, warning: storageDelete.error.message };
    }
  }

  const ids = assets.map((asset) => asset.id);
  const tableDelete = await session.supabase
    .from('template_assets')
    .delete()
    .eq('owner_id', session.user!.id)
    .in('id', ids);

  if (tableDelete.error) {
    return { deleted: 0, warning: tableDelete.error.message };
  }

  return { deleted: assets.length, warning: null };
}

export async function GET(request: NextRequest) {
  const session = await getSessionContext();

  if (!session.user) {
    return NextResponse.json({ error: 'No authenticated user.' }, { status: 401 });
  }

  const round = request.nextUrl.searchParams.get('round');

  let query = session.supabase
    .from('template_assets')
    .select('*')
    .eq('owner_id', session.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (round && allowedRounds.includes(round)) {
    query = query.eq('round_label', round);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ assets: data || [] });
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null;

  try {
    const session = await getSessionContext();

    if (!session.user) {
      return respond(request, 'error', 'No authenticated user.', 401);
    }

    const formData = await request.formData();

    const round = String(formData.get('round') || '').trim() as Round;
    const templateKind = String(formData.get('templateKind') || '').trim();
    const letterType = String(formData.get('letterType') || '').trim() as LetterType;
    const exhibitKind = String(formData.get('exhibitKind') || '').trim() as ExhibitKind;
    const file = formData.get('file');

    const validationError = validateSlot({ round, templateKind, letterType, exhibitKind });
    if (validationError) return respond(request, 'error', validationError);

    const resolvedTemplateKind = templateKind as TemplateKind;
    const resolvedLetterType = resolvedTemplateKind === 'LETTER' ? letterType : null;
    const resolvedExhibitKind = resolvedTemplateKind === 'EXHIBIT' ? exhibitKind : null;

    if (!(file instanceof File) || file.size === 0) {
      return respond(request, 'error', 'Template file is required.');
    }

    const kind = documentKind({
      templateKind,
      letterType: resolvedLetterType,
      exhibitKind: resolvedExhibitKind
    });

    assertFileType(file, kind);

    const targetType = resolvedLetterType || resolvedExhibitKind;
    if (!targetType) return respond(request, 'error', 'Template type is required.');

    const existing = await findExistingAssets(session, {
      round,
      templateKind,
      letterType: resolvedLetterType,
      exhibitKind: resolvedExhibitKind
    });

    if (existing.error) return respond(request, 'error', existing.error.message, 500);

    const existingAssets = existing.data || [];
    const nextVersion = existingAssets[0]?.version_number ? existingAssets[0].version_number + 1 : 1;

    const contract = await inspectTemplateContract(file, kind);

    const storagePath = templateStoragePath({
      userId: session.user.id,
      round,
      kind: resolvedTemplateKind,
      type: targetType,
      filename: file.name
    });

    uploadedPath = storagePath;

    const upload = await session.supabase.storage
      .from('template-assets')
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (upload.error) return respond(request, 'error', upload.error.message, 500);

    const insert = await session.supabase
      .from('template_assets')
      .insert({
        owner_id: session.user.id,
        round_label: round,
        template_kind: templateKind,
        letter_type: resolvedLetterType,
        exhibit_kind: resolvedExhibitKind,
        storage_bucket: 'template-assets',
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size,
        contract_json: contract,
        rule_json: {
          round,
          templateKind,
          letterType: resolvedLetterType,
          exhibitKind: resolvedExhibitKind
        },
        version_number: nextVersion,
        is_active: true
      })
      .select('id')
      .single();

    if (insert.error) {
      await session.supabase.storage.from('template-assets').remove([storagePath]);
      return respond(request, 'error', insert.error.message, 500);
    }

    const oldAssets = existingAssets.filter((asset) => asset.id !== insert.data.id);
    const cleanup = await deleteAssetRecordsAndFiles(session, oldAssets);

    if (cleanup.warning) {
      return respond(
        request,
        'ok',
        `${round} ${targetType} template saved. Cleanup warning: ${cleanup.warning}`,
        200,
        { assetId: insert.data.id, cleanupWarning: cleanup.warning }
      );
    }

    return respond(
      request,
      'ok',
      `${round} ${targetType} template saved. ${cleanup.deleted} old version(s) removed.`,
      200,
      { assetId: insert.data.id, oldVersionsRemoved: cleanup.deleted }
    );
  } catch (error) {
    try {
      if (uploadedPath) {
        const session = await getSessionContext();
        await session.supabase.storage.from('template-assets').remove([uploadedPath]);
      }
    } catch {
      // Best effort cleanup only.
    }

    return respond(request, 'error', error instanceof Error ? error.message : 'Template upload failed.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSessionContext();

    if (!session.user) {
      return respond(request, 'error', 'No authenticated user.', 401);
    }

    const body = await request.json().catch(() => ({}));

    const round = String(body?.round || request.nextUrl.searchParams.get('round') || '').trim();
    const templateKind = String(body?.templateKind || request.nextUrl.searchParams.get('templateKind') || '').trim();
    const letterType = String(body?.letterType || request.nextUrl.searchParams.get('letterType') || '').trim();
    const exhibitKind = String(body?.exhibitKind || request.nextUrl.searchParams.get('exhibitKind') || '').trim();

    const validationError = validateSlot({ round, templateKind, letterType, exhibitKind });
    if (validationError) return respond(request, 'error', validationError);

    const resolvedTemplateKind = templateKind as TemplateKind;
    const resolvedLetterType = resolvedTemplateKind === 'LETTER' ? letterType : null;
    const resolvedExhibitKind = resolvedTemplateKind === 'EXHIBIT' ? exhibitKind : null;

    const existing = await findExistingAssets(session, {
      round,
      templateKind,
      letterType: resolvedLetterType,
      exhibitKind: resolvedExhibitKind
    });

    if (existing.error) return respond(request, 'error', existing.error.message, 500);

    const cleanup = await deleteAssetRecordsAndFiles(session, existing.data || []);

    if (cleanup.warning) {
      return respond(request, 'error', cleanup.warning, 500);
    }

    return respond(request, 'ok', `${round} ${resolvedLetterType || resolvedExhibitKind} template removed from Supabase.`, 200, {
      deleted: cleanup.deleted
    });
  } catch (error) {
    return respond(request, 'error', error instanceof Error ? error.message : 'Template removal failed.', 500);
  }
}
