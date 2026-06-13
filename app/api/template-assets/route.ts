import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionContext } from '../../../lib/saas/session';
import { inspectTemplateContract, templateContractGateMessage, type TemplateContract, type TemplateDocumentKind } from '../../../lib/template-contracts';
import type { ExhibitKind } from '../../../lib/template-exhibits';
import type { LetterType } from '../../../lib/letter-engine';
import type { Round } from '../../../lib/reference-store';
import { templateStoragePath, type TemplateKind } from '../../../lib/supabase/template-registry';
import { workspaceAccessErrorResponse } from '../../../lib/saas/access-entitlement';

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const allowedLetterTypes = ['DISPUTE', 'LATE_PAYMENT'];
const allowedExhibitKinds = ['FCRA', 'AFFIDAVIT', 'ATTACHMENT', 'FTC'];

type SessionContext = Awaited<ReturnType<typeof getSessionContext>>;

type ExistingTemplateAsset = {
  id: string;
  storage_bucket: string;
  storage_path: string;
  version_number: number | null;
  is_active: boolean | null;
  content_hash: string | null;
};

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

function isMissingRpcError(message: string | undefined) {
  return Boolean(message && (
    message.includes('Could not find the function') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  ));
}

function sha256FromArrayBuffer(buffer: ArrayBuffer) {
  return createHash('sha256').update(Buffer.from(buffer)).digest('hex');
}

function buildValidationJson(contract: TemplateContract, input: {
  round: Round;
  templateKind: TemplateKind;
  letterType: LetterType | null;
  exhibitKind: ExhibitKind | null;
  contentHash: string;
}) {
  return {
    status: contract.validation.status,
    confidence: contract.validation.confidence,
    renderMode: contract.validation.renderMode,
    requiredFields: contract.validation.requiredFields,
    fulfilledFields: contract.validation.fulfilledFields,
    missingFields: contract.validation.missingFields,
    unknownRequiredFields: contract.validation.unknownRequiredFields,
    warnings: contract.validation.warnings,
    errors: contract.validation.errors,
    whatIfs: contract.validation.whatIfs,
    aliasesUsed: contract.validation.aliasesUsed,
    contentHash: input.contentHash,
    slot: {
      round: input.round,
      templateKind: input.templateKind,
      letterType: input.letterType,
      exhibitKind: input.exhibitKind
    },
    evaluatedAt: new Date().toISOString()
  };
}

async function findExistingAssets(session: SessionContext, input: {
  round: string;
  templateKind: string;
  letterType: string | null;
  exhibitKind: string | null;
}) {
  let query = session.supabase
    .from('template_assets')
    .select('id, storage_bucket, storage_path, version_number, is_active, content_hash')
    .eq('owner_id', session.user!.id)
    .eq('round_label', input.round)
    .eq('template_kind', input.templateKind)
    .order('version_number', { ascending: false });

  if (input.letterType) query = query.eq('letter_type', input.letterType);
  if (input.exhibitKind) query = query.eq('exhibit_kind', input.exhibitKind);

  return query;
}

async function archiveAssetRecords(session: SessionContext, assets: Array<{ id: string }>) {
  if (!assets.length) return { archived: 0, warning: null as string | null };

  const ids = assets.map((asset) => asset.id);
  const update = await session.supabase
    .from('template_assets')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('owner_id', session.user!.id)
    .in('id', ids);

  if (update.error) {
    return { archived: 0, warning: update.error.message };
  }

  return { archived: assets.length, warning: null };
}

async function activateInsertedTemplateAsset(session: SessionContext, input: {
  assetId: string;
  existingAssets: ExistingTemplateAsset[];
}) {
  const activation = await session.supabase.rpc('app_activate_template_asset_v1', {
    asset_id_input: input.assetId
  });

  if (!activation.error) {
    const row = Array.isArray(activation.data) ? activation.data[0] : null;
    return {
      archived: Number(row?.archived_count || 0),
      warning: null as string | null,
      mode: 'rpc' as const
    };
  }

  if (!isMissingRpcError(activation.error.message)) {
    return { archived: 0, warning: activation.error.message, mode: 'rpc' as const };
  }

  const activeAssets = input.existingAssets.filter((asset) => asset.is_active);
  const archive = await archiveAssetRecords(session, activeAssets);

  if (archive.warning) return { archived: archive.archived, warning: archive.warning, mode: 'fallback' as const };

  const activate = await session.supabase
    .from('template_assets')
    .update({ is_active: true, archived_at: null })
    .eq('owner_id', session.user!.id)
    .eq('id', input.assetId);

  if (activate.error) return { archived: archive.archived, warning: activate.error.message, mode: 'fallback' as const };

  return { archived: archive.archived, warning: null, mode: 'fallback' as const };
}

async function deleteAssetRecordsAndFiles(session: SessionContext, assets: Array<{
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
  const accessError = await workspaceAccessErrorResponse();
  if (accessError) return accessError;

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
  let insertedAssetId: string | null = null;

  try {
    const accessError = await workspaceAccessErrorResponse();
    if (accessError) return accessError;

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

    const fileBuffer = await file.arrayBuffer();
    const contentHash = sha256FromArrayBuffer(fileBuffer);
    const contract = await inspectTemplateContract(new File([fileBuffer], file.name, { type: file.type, lastModified: file.lastModified }), kind);
    const gateMessage = templateContractGateMessage(contract);

    if (gateMessage) {
      return respond(request, 'error', gateMessage, 422, { validation: contract.validation });
    }

    const existing = await findExistingAssets(session, {
      round,
      templateKind,
      letterType: resolvedLetterType,
      exhibitKind: resolvedExhibitKind
    });

    if (existing.error) return respond(request, 'error', existing.error.message, 500);

    const existingAssets = existing.data || [];
    const activeSameContent = existingAssets.find((asset) => asset.is_active && asset.content_hash === contentHash);

    if (activeSameContent) {
      return respond(
        request,
        'ok',
        `${round} ${targetType} template is already active with the same file content.`,
        200,
        { assetId: activeSameContent.id, duplicate: true, contentHash, validation: contract.validation }
      );
    }

    const nextVersion = existingAssets[0]?.version_number ? existingAssets[0].version_number + 1 : 1;
    const validationJson = buildValidationJson(contract, {
      round,
      templateKind: resolvedTemplateKind,
      letterType: resolvedLetterType,
      exhibitKind: resolvedExhibitKind,
      contentHash
    });

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
      .upload(storagePath, new Blob([fileBuffer], { type: file.type || 'application/octet-stream' }), {
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
        content_hash: contentHash,
        contract_json: contract,
        validation_json: validationJson,
        rule_json: {
          round,
          templateKind,
          letterType: resolvedLetterType,
          exhibitKind: resolvedExhibitKind,
          contractStatus: contract.validation.status,
          contractConfidence: contract.validation.confidence,
          activationPolicy: 'insert-inactive-activate-template-asset-rpc'
        },
        version_number: nextVersion,
        is_active: false,
        archived_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (insert.error) {
      await session.supabase.storage.from('template-assets').remove([storagePath]);
      return respond(request, 'error', insert.error.message, 500);
    }

    insertedAssetId = insert.data.id;

    const activation = await activateInsertedTemplateAsset(session, {
      assetId: insert.data.id,
      existingAssets
    });

    if (activation.warning) {
      await session.supabase.storage.from('template-assets').remove([storagePath]);
      await session.supabase
        .from('template_assets')
        .delete()
        .eq('owner_id', session.user.id)
        .eq('id', insert.data.id);
      return respond(request, 'error', activation.warning, 500);
    }

    uploadedPath = null;
    insertedAssetId = null;

    return respond(
      request,
      'ok',
      `${round} ${targetType} template saved as active version. ${activation.archived} previous active version(s) archived.`,
      200,
      { assetId: insert.data.id, archivedVersions: activation.archived, activationMode: activation.mode, contentHash, validation: contract.validation }
    );
  } catch (error) {
    try {
      const session = await getSessionContext();
      if (uploadedPath) {
        await session.supabase.storage.from('template-assets').remove([uploadedPath]);
      }
      if (insertedAssetId && session.user) {
        await session.supabase
          .from('template_assets')
          .delete()
          .eq('owner_id', session.user.id)
          .eq('id', insertedAssetId);
      }
    } catch {
      // Best effort cleanup only.
    }

    return respond(request, 'error', error instanceof Error ? error.message : 'Template upload failed.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const accessError = await workspaceAccessErrorResponse();
    if (accessError) return accessError;

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
