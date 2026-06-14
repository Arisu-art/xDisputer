import { createHash } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { getSessionContext } from '../../../lib/saas/session';
import { inspectTemplateContract, templateContractGateMessage, type TemplateContract, type TemplateDocumentKind } from '../../../lib/template-contracts';
import type { ExhibitKind } from '../../../lib/template-exhibits';
import type { LetterType } from '../../../lib/letter-engine';
import type { Round } from '../../../lib/reference-store';
import { templateStoragePath, type TemplateKind } from '../../../lib/supabase/template-registry';
import { workspaceAccessErrorResponse } from '../../../lib/saas/access-entitlement';
import { inspectDynamicTemplateContractV2, dynamicTemplateContractV2Summary, type DynamicTemplateContractV2 } from '../../../lib/dynamic-template/contract-v2';
import { dynamicRendererModePolicy, resolveDynamicTemplateRendererMode, type DynamicTemplateRendererMode } from '../../../lib/dynamic-template/renderer-mode';
import { assertCanManageManagerTemplates, managerTemplateScopePayload, resolveManagerTemplateScope, ManagerTemplateScopeError } from '../../../lib/manager-template-scope';

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const allowedLetterTypes = ['DISPUTE', 'LATE_PAYMENT'];
const allowedExhibitKinds = ['FCRA', 'AFFIDAVIT', 'ATTACHMENT', 'FTC'];
const AUTO_V2_BACKFILL_LIMIT = 12;

type SessionContext = Awaited<ReturnType<typeof getSessionContext>>;
type DynamicRendererPolicy = ReturnType<typeof dynamicRendererModePolicy>;

type ExistingTemplateAsset = { id: string; storage_bucket: string; storage_path: string; version_number: number | null; is_active: boolean | null; content_hash: string | null };
type ActiveTemplateAsset = ExistingTemplateAsset & { round_label: Round; template_kind: TemplateKind; letter_type: LetterType | null; exhibit_kind: ExhibitKind | null; original_filename: string; mime_type: string | null; validation_json: Record<string, unknown> | null; rule_json: Record<string, unknown> | null };

function wantsJson(request: NextRequest) { return request.headers.get('accept')?.includes('application/json') || request.headers.get('x-template-upload') === 'workspace'; }
function respond(request: NextRequest, status: 'ok' | 'error', message: string, code = status === 'ok' ? 200 : 400, extra: Record<string, unknown> = {}) {
  if (wantsJson(request)) return NextResponse.json({ status, message, ...extra }, { status: code });
  const fallback = new URL('/system/templates', request.url);
  const referer = request.headers.get('referer');
  const target = referer ? new URL(referer) : fallback;
  target.searchParams.set('control', status);
  target.searchParams.set('message', message.slice(0, 220));
  return NextResponse.redirect(target, 303);
}
function managerScopeFailure(request: NextRequest, error: ManagerTemplateScopeError) { return respond(request, 'error', error.message, error.code === 'NO_AUTH' ? 401 : 403, { code: error.code, category: 'MANAGER_TEMPLATE' }); }
function managerScopeJsonError(error: unknown) {
  if (error instanceof ManagerTemplateScopeError) return NextResponse.json({ error: error.message, code: error.code, category: 'MANAGER_TEMPLATE' }, { status: error.code === 'NO_AUTH' ? 401 : 403 });
  return NextResponse.json({ error: 'Could not resolve manager template scope.', category: 'MANAGER_TEMPLATE' }, { status: 500 });
}
function documentKind(input: { templateKind: string; letterType: string | null; exhibitKind: string | null }): TemplateDocumentKind { return input.templateKind === 'LETTER' ? input.letterType === 'LATE_PAYMENT' ? 'LATE_PAYMENT_LETTER' : 'DISPUTE_LETTER' : input.exhibitKind as TemplateDocumentKind; }
function assertFileType(file: File, kind: TemplateDocumentKind) {
  const name = file.name.toLowerCase();
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf');
  const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || name.endsWith('.docx');
  if ((kind === 'FCRA' || kind === 'ATTACHMENT') && !isPdf) throw new Error(`${kind} requires a PDF file.`);
  if (kind !== 'FCRA' && kind !== 'ATTACHMENT' && !isDocx) throw new Error(`${kind} requires a DOCX file.`);
}
function validateSlot(input: { round: string; templateKind: string; letterType: string; exhibitKind: string }) {
  if (!allowedRounds.includes(input.round)) return 'Invalid round.';
  if (input.templateKind !== 'LETTER' && input.templateKind !== 'EXHIBIT') return 'Invalid template kind.';
  if (input.templateKind === 'LETTER' && !allowedLetterTypes.includes(input.letterType)) return 'Invalid letter type.';
  if (input.templateKind === 'EXHIBIT' && !allowedExhibitKinds.includes(input.exhibitKind)) return 'Invalid exhibit kind.';
  return null;
}
function isMissingRpcError(message: string | undefined) { return Boolean(message && (message.includes('Could not find the function') || message.includes('does not exist') || message.includes('schema cache'))); }
function sha256FromArrayBuffer(buffer: ArrayBuffer) { return createHash('sha256').update(Buffer.from(buffer)).digest('hex'); }
function safeErrorMessage(error: unknown) { return error instanceof Error ? error.message : 'Unknown error'; }
async function inspectDynamicContractV2Safely(input: { file: File; kind: TemplateDocumentKind; round: Round; rendererPolicy: DynamicRendererPolicy }) {
  if (!input.rendererPolicy.collectContractV2Diagnostics) return { contract: null as DynamicTemplateContractV2 | null, warning: null as string | null };
  try { return { contract: await inspectDynamicTemplateContractV2(input.file, input.kind, input.round), warning: null as string | null }; }
  catch (error) { return { contract: null as DynamicTemplateContractV2 | null, warning: `Dynamic template v2 diagnostics failed but stable upload validation continued: ${safeErrorMessage(error)}` }; }
}
function dynamicContractSummary(contract: DynamicTemplateContractV2 | null) { return contract ? dynamicTemplateContractV2Summary(contract) : null; }
function buildValidationJson(contract: TemplateContract, input: { round: Round; templateKind: TemplateKind; letterType: LetterType | null; exhibitKind: ExhibitKind | null; contentHash: string; rendererMode: DynamicTemplateRendererMode; rendererPolicy: DynamicRendererPolicy; dynamicContractV2: DynamicTemplateContractV2 | null; dynamicContractV2Warning: string | null; managerUserId: string; uploadedByUserId: string }) { return { status: contract.validation.status, confidence: contract.validation.confidence, renderMode: contract.validation.renderMode, requiredFields: contract.validation.requiredFields, fulfilledFields: contract.validation.fulfilledFields, missingFields: contract.validation.missingFields, unknownRequiredFields: contract.validation.unknownRequiredFields, warnings: contract.validation.warnings, errors: contract.validation.errors, whatIfs: contract.validation.whatIfs, aliasesUsed: contract.validation.aliasesUsed, contentHash: input.contentHash, templateScope: 'MANAGER_TEMPLATE_ASSET', managerUserId: input.managerUserId, uploadedByUserId: input.uploadedByUserId, slot: { round: input.round, templateKind: input.templateKind, letterType: input.letterType, exhibitKind: input.exhibitKind }, dynamicTemplateEngineV2: { rendererMode: input.rendererMode, rendererPolicy: input.rendererPolicy, diagnosticsWarning: input.dynamicContractV2Warning, contract: dynamicContractSummary(input.dynamicContractV2) }, evaluatedAt: new Date().toISOString() }; }
function hasDynamicTemplateV2Metadata(asset: ActiveTemplateAsset) { const validation = asset.validation_json; if (!validation || typeof validation !== 'object') return false; const dynamic = validation.dynamicTemplateEngineV2; return Boolean(dynamic && typeof dynamic === 'object' && (dynamic as { contract?: unknown }).contract); }
function mergeDynamicTemplateV2Validation(input: { current: Record<string, unknown> | null; rendererMode: DynamicTemplateRendererMode; rendererPolicy: DynamicRendererPolicy; dynamicContractV2: DynamicTemplateContractV2 | null; warning: string | null }) { return { ...(input.current || {}), dynamicTemplateEngineV2: { rendererMode: input.rendererMode, rendererPolicy: input.rendererPolicy, diagnosticsWarning: input.warning, contract: dynamicContractSummary(input.dynamicContractV2), autoBackfilledAt: new Date().toISOString() } }; }
function mergeDynamicTemplateV2RuleJson(input: { current: Record<string, unknown> | null; rendererMode: DynamicTemplateRendererMode; dynamicContractV2: DynamicTemplateContractV2 | null; warning: string | null }) { return { ...(input.current || {}), dynamicTemplateEngineV2: { rendererMode: input.rendererMode, status: input.dynamicContractV2?.status || null, confidence: input.dynamicContractV2?.confidence || null, diagnosticsWarning: input.warning, autoBackfilledAt: new Date().toISOString() } }; }
async function fileFromStoredBlob(blob: Blob, asset: ActiveTemplateAsset) { const buffer = await blob.arrayBuffer(); return new File([buffer], asset.original_filename, { type: asset.mime_type || blob.type || 'application/octet-stream', lastModified: Date.now() }); }
async function autoBackfillDynamicTemplateV2(input: { session: SessionContext; managerUserId: string; assets: ActiveTemplateAsset[]; rendererMode: DynamicTemplateRendererMode; rendererPolicy: DynamicRendererPolicy }) {
  const warnings: string[] = []; let backfilledCount = 0; const candidates = input.assets.filter((asset) => !hasDynamicTemplateV2Metadata(asset)).slice(0, AUTO_V2_BACKFILL_LIMIT);
  for (const asset of candidates) { try { const kind = documentKind({ templateKind: asset.template_kind, letterType: asset.letter_type, exhibitKind: asset.exhibit_kind }); const download = await input.session.supabase.storage.from(asset.storage_bucket || 'template-assets').download(asset.storage_path); if (download.error || !download.data) { warnings.push(`${asset.original_filename}: ${download.error?.message || 'storage download failed'}`); continue; } const file = await fileFromStoredBlob(download.data, asset); const dynamicV2 = await inspectDynamicContractV2Safely({ file, kind, round: asset.round_label, rendererPolicy: input.rendererPolicy }); const validationJson = mergeDynamicTemplateV2Validation({ current: asset.validation_json, rendererMode: input.rendererMode, rendererPolicy: input.rendererPolicy, dynamicContractV2: dynamicV2.contract, warning: dynamicV2.warning }); const ruleJson = mergeDynamicTemplateV2RuleJson({ current: asset.rule_json, rendererMode: input.rendererMode, dynamicContractV2: dynamicV2.contract, warning: dynamicV2.warning }); const update = await input.session.supabase.from('template_assets').update({ validation_json: validationJson, rule_json: ruleJson }).eq('manager_user_id', input.managerUserId).eq('id', asset.id); if (update.error) { warnings.push(`${asset.original_filename}: ${update.error.message}`); continue; } asset.validation_json = validationJson; asset.rule_json = ruleJson; backfilledCount += 1; } catch (error) { warnings.push(`${asset.original_filename}: ${safeErrorMessage(error)}`); } }
  return { assets: input.assets, backfilledCount, warnings };
}
async function findExistingAssets(session: SessionContext, managerUserId: string, input: { round: string; templateKind: string; letterType: string | null; exhibitKind: string | null }) { let query = session.supabase.from('template_assets').select('id, storage_bucket, storage_path, version_number, is_active, content_hash').eq('manager_user_id', managerUserId).eq('round_label', input.round).eq('template_kind', input.templateKind).order('version_number', { ascending: false }); if (input.letterType) query = query.eq('letter_type', input.letterType); if (input.exhibitKind) query = query.eq('exhibit_kind', input.exhibitKind); return query; }
async function archiveAssetRecords(session: SessionContext, managerUserId: string, assets: Array<{ id: string }>) { if (!assets.length) return { archived: 0, warning: null as string | null }; const ids = assets.map((asset) => asset.id); const update = await session.supabase.from('template_assets').update({ is_active: false, archived_at: new Date().toISOString() }).eq('manager_user_id', managerUserId).in('id', ids); if (update.error) return { archived: 0, warning: update.error.message }; return { archived: assets.length, warning: null }; }
async function activateInsertedTemplateAsset(session: SessionContext, managerUserId: string, input: { assetId: string; existingAssets: ExistingTemplateAsset[] }) { const activation = await session.supabase.rpc('app_activate_manager_template_asset_v1', { asset_id_input: input.assetId }); if (!activation.error) { const row = Array.isArray(activation.data) ? activation.data[0] : null; return { archived: Number(row?.archived_count || 0), warning: null as string | null, mode: 'manager-rpc' as const }; } if (!isMissingRpcError(activation.error.message)) return { archived: 0, warning: activation.error.message, mode: 'manager-rpc' as const }; const activeAssets = input.existingAssets.filter((asset) => asset.is_active); const archive = await archiveAssetRecords(session, managerUserId, activeAssets); if (archive.warning) return { archived: archive.archived, warning: archive.warning, mode: 'manager-fallback' as const }; const activate = await session.supabase.from('template_assets').update({ is_active: true, archived_at: null }).eq('manager_user_id', managerUserId).eq('id', input.assetId); if (activate.error) return { archived: archive.archived, warning: activate.error.message, mode: 'manager-fallback' as const }; return { archived: archive.archived, warning: null, mode: 'manager-fallback' as const }; }
async function deleteAssetRecordsAndFiles(session: SessionContext, managerUserId: string, assets: Array<{ id: string; storage_bucket: string; storage_path: string }>) { if (!assets.length) return { deleted: 0, warning: null as string | null }; const bucketGroups = new Map<string, string[]>(); assets.forEach((asset) => { const bucket = asset.storage_bucket || 'template-assets'; const paths = bucketGroups.get(bucket) || []; paths.push(asset.storage_path); bucketGroups.set(bucket, paths); }); for (const [bucket, paths] of Array.from(bucketGroups.entries())) { const storageDelete = await session.supabase.storage.from(bucket).remove(paths); if (storageDelete.error) return { deleted: 0, warning: storageDelete.error.message }; } const ids = assets.map((asset) => asset.id); const tableDelete = await session.supabase.from('template_assets').delete().eq('manager_user_id', managerUserId).in('id', ids); if (tableDelete.error) return { deleted: 0, warning: tableDelete.error.message }; return { deleted: assets.length, warning: null }; }

export async function GET(request: NextRequest) {
  const accessError = await workspaceAccessErrorResponse(); if (accessError) return accessError;
  const session = await getSessionContext();
  if (!session.user) return NextResponse.json({ error: 'No authenticated user.' }, { status: 401 });
  let scope;
  try { scope = await resolveManagerTemplateScope(session); } catch (error) { return managerScopeJsonError(error); }
  const round = request.nextUrl.searchParams.get('round');
  const rendererMode = resolveDynamicTemplateRendererMode({ requestHeader: request.headers.get('x-dynamic-template-renderer-mode') });
  const rendererPolicy = dynamicRendererModePolicy(rendererMode);
  let query = session.supabase.from('template_assets').select('*').eq('manager_user_id', scope.managerUserId).eq('is_active', true).order('created_at', { ascending: false });
  if (round && allowedRounds.includes(round)) query = query.eq('round_label', round);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const autoBackfill = scope.canManageTemplates ? await autoBackfillDynamicTemplateV2({ session, managerUserId: scope.managerUserId, assets: (data || []) as ActiveTemplateAsset[], rendererMode, rendererPolicy }) : { assets: (data || []) as ActiveTemplateAsset[], backfilledCount: 0, warnings: [] as string[] };
  return NextResponse.json({ assets: autoBackfill.assets, managerTemplateScope: managerTemplateScopePayload(scope), dynamicTemplateEngineV2: { rendererMode, autoBackfilled: autoBackfill.backfilledCount, warnings: autoBackfill.warnings } });
}

export async function POST(request: NextRequest) {
  let uploadedPath: string | null = null; let insertedAssetId: string | null = null;
  try {
    const accessError = await workspaceAccessErrorResponse(); if (accessError) return accessError;
    const session = await getSessionContext();
    if (!session.user) return respond(request, 'error', 'No authenticated user.', 401);
    const scope = await resolveManagerTemplateScope(session); assertCanManageManagerTemplates(scope);
    const rendererMode = resolveDynamicTemplateRendererMode({ requestHeader: request.headers.get('x-dynamic-template-renderer-mode') }); const rendererPolicy = dynamicRendererModePolicy(rendererMode);
    const formData = await request.formData();
    const round = String(formData.get('round') || '').trim() as Round; const templateKind = String(formData.get('templateKind') || '').trim(); const letterType = String(formData.get('letterType') || '').trim() as LetterType; const exhibitKind = String(formData.get('exhibitKind') || '').trim() as ExhibitKind; const file = formData.get('file');
    const validationError = validateSlot({ round, templateKind, letterType, exhibitKind }); if (validationError) return respond(request, 'error', validationError);
    const resolvedTemplateKind = templateKind as TemplateKind; const resolvedLetterType = resolvedTemplateKind === 'LETTER' ? letterType : null; const resolvedExhibitKind = resolvedTemplateKind === 'EXHIBIT' ? exhibitKind : null;
    if (!(file instanceof File) || file.size === 0) return respond(request, 'error', 'Template file is required.');
    const kind = documentKind({ templateKind, letterType: resolvedLetterType, exhibitKind: resolvedExhibitKind }); assertFileType(file, kind);
    const targetType = resolvedLetterType || resolvedExhibitKind; if (!targetType) return respond(request, 'error', 'Template type is required.');
    const fileBuffer = await file.arrayBuffer(); const contentHash = sha256FromArrayBuffer(fileBuffer); const templateFile = new File([fileBuffer], file.name, { type: file.type, lastModified: file.lastModified }); const dynamicV2 = await inspectDynamicContractV2Safely({ file: templateFile, kind, round, rendererPolicy }); const contract = await inspectTemplateContract(templateFile, kind); const gateMessage = templateContractGateMessage(contract);
    if (gateMessage) return respond(request, 'error', gateMessage, 422, { validation: contract.validation, dynamicTemplateEngineV2: { rendererMode, diagnosticsWarning: dynamicV2.warning, contract: dynamicContractSummary(dynamicV2.contract) } });
    const existing = await findExistingAssets(session, scope.managerUserId, { round, templateKind, letterType: resolvedLetterType, exhibitKind: resolvedExhibitKind }); if (existing.error) return respond(request, 'error', existing.error.message, 500);
    const existingAssets = existing.data || []; const activeSameContent = existingAssets.find((asset) => asset.is_active && asset.content_hash === contentHash);
    if (activeSameContent) return respond(request, 'ok', `${round} ${targetType} manager template is already active with the same file content.`, 200, { assetId: activeSameContent.id, duplicate: true, contentHash, managerTemplateScope: managerTemplateScopePayload(scope), validation: contract.validation, dynamicTemplateEngineV2: { rendererMode, diagnosticsWarning: dynamicV2.warning, contract: dynamicContractSummary(dynamicV2.contract) } });
    const nextVersion = existingAssets[0]?.version_number ? existingAssets[0].version_number + 1 : 1; const validationJson = buildValidationJson(contract, { round, templateKind: resolvedTemplateKind, letterType: resolvedLetterType, exhibitKind: resolvedExhibitKind, contentHash, rendererMode, rendererPolicy, dynamicContractV2: dynamicV2.contract, dynamicContractV2Warning: dynamicV2.warning, managerUserId: scope.managerUserId, uploadedByUserId: session.user.id });
    const storagePath = templateStoragePath({ managerUserId: scope.managerUserId, round, kind: resolvedTemplateKind, type: targetType, filename: file.name }); uploadedPath = storagePath;
    const upload = await session.supabase.storage.from('template-assets').upload(storagePath, new Blob([fileBuffer], { type: file.type || 'application/octet-stream' }), { contentType: file.type || 'application/octet-stream', upsert: false }); if (upload.error) return respond(request, 'error', upload.error.message, 500);
    const insert = await session.supabase.from('template_assets').insert({ owner_id: scope.managerUserId, manager_user_id: scope.managerUserId, uploaded_by_user_id: session.user.id, template_scope: 'MANAGER', round_label: round, template_kind: templateKind, letter_type: resolvedLetterType, exhibit_kind: resolvedExhibitKind, storage_bucket: 'template-assets', storage_path: storagePath, original_filename: file.name, mime_type: file.type || 'application/octet-stream', file_size: file.size, content_hash: contentHash, contract_json: contract, validation_json: validationJson, rule_json: { round, templateKind, letterType: resolvedLetterType, exhibitKind: resolvedExhibitKind, templateScope: 'MANAGER_TEMPLATE_ASSET', managerUserId: scope.managerUserId, uploadedByUserId: session.user.id, contractStatus: contract.validation.status, contractConfidence: contract.validation.confidence, activationPolicy: 'insert-inactive-activate-manager-template-asset-rpc', dynamicTemplateEngineV2: { rendererMode, status: dynamicV2.contract?.status || null, confidence: dynamicV2.contract?.confidence || null, diagnosticsWarning: dynamicV2.warning } }, version_number: nextVersion, is_active: false, archived_at: new Date().toISOString() }).select('id').single();
    if (insert.error) { await session.supabase.storage.from('template-assets').remove([storagePath]); return respond(request, 'error', insert.error.message, 500); }
    insertedAssetId = insert.data.id;
    const activation = await activateInsertedTemplateAsset(session, scope.managerUserId, { assetId: insert.data.id, existingAssets });
    if (activation.warning) { await session.supabase.storage.from('template-assets').remove([storagePath]); await session.supabase.from('template_assets').delete().eq('manager_user_id', scope.managerUserId).eq('id', insert.data.id); return respond(request, 'error', activation.warning, 500); }
    uploadedPath = null; insertedAssetId = null;
    return respond(request, 'ok', `${round} ${targetType} manager template saved as active version. ${activation.archived} previous active version(s) archived.`, 200, { assetId: insert.data.id, archivedVersions: activation.archived, activationMode: activation.mode, contentHash, managerTemplateScope: managerTemplateScopePayload(scope), validation: contract.validation, dynamicTemplateEngineV2: { rendererMode, diagnosticsWarning: dynamicV2.warning, contract: dynamicContractSummary(dynamicV2.contract) } });
  } catch (error) {
    try { const session = await getSessionContext(); if (uploadedPath) await session.supabase.storage.from('template-assets').remove([uploadedPath]); if (insertedAssetId && session.user) await session.supabase.from('template_assets').delete().eq('id', insertedAssetId); } catch {}
    if (error instanceof ManagerTemplateScopeError) return managerScopeFailure(request, error);
    return respond(request, 'error', error instanceof Error ? error.message : 'Template upload failed.', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const accessError = await workspaceAccessErrorResponse(); if (accessError) return accessError;
    const session = await getSessionContext(); if (!session.user) return respond(request, 'error', 'No authenticated user.', 401);
    const scope = await resolveManagerTemplateScope(session); assertCanManageManagerTemplates(scope);
    const body = await request.json().catch(() => ({}));
    const round = String(body?.round || request.nextUrl.searchParams.get('round') || '').trim(); const templateKind = String(body?.templateKind || request.nextUrl.searchParams.get('templateKind') || '').trim(); const letterType = String(body?.letterType || request.nextUrl.searchParams.get('letterType') || '').trim(); const exhibitKind = String(body?.exhibitKind || request.nextUrl.searchParams.get('exhibitKind') || '').trim();
    const validationError = validateSlot({ round, templateKind, letterType, exhibitKind }); if (validationError) return respond(request, 'error', validationError);
    const resolvedTemplateKind = templateKind as TemplateKind; const resolvedLetterType = resolvedTemplateKind === 'LETTER' ? letterType : null; const resolvedExhibitKind = resolvedTemplateKind === 'EXHIBIT' ? exhibitKind : null;
    const existing = await findExistingAssets(session, scope.managerUserId, { round, templateKind, letterType: resolvedLetterType, exhibitKind: resolvedExhibitKind }); if (existing.error) return respond(request, 'error', existing.error.message, 500);
    const cleanup = await deleteAssetRecordsAndFiles(session, scope.managerUserId, existing.data || []); if (cleanup.warning) return respond(request, 'error', cleanup.warning, 500);
    return respond(request, 'ok', `${round} ${resolvedLetterType || resolvedExhibitKind} manager template removed from Supabase.`, 200, { deleted: cleanup.deleted, managerTemplateScope: managerTemplateScopePayload(scope) });
  } catch (error) {
    if (error instanceof ManagerTemplateScopeError) return managerScopeFailure(request, error);
    return respond(request, 'error', error instanceof Error ? error.message : 'Template removal failed.', 500);
  }
}
