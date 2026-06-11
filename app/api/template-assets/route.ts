import { NextResponse, type NextRequest } from 'next/server';
import { getSessionContext } from '../../../lib/saas/session';
import { inspectTemplateContract, type TemplateDocumentKind } from '../../../lib/template-contracts';
import type { ExhibitKind } from '../../../lib/template-exhibits';
import type { LetterType } from '../../../lib/letter-engine';
import type { Round } from '../../../lib/reference-store';
import { templateStoragePath } from '../../../lib/supabase/template-registry';

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const allowedLetterTypes = ['DISPUTE', 'LATE_PAYMENT'];
const allowedExhibitKinds = ['FCRA', 'AFFIDAVIT', 'ATTACHMENT', 'FTC'];

function redirectBack(request: NextRequest, status: 'ok' | 'error', message?: string) {
  const fallback = new URL('/system/templates', request.url);
  const referer = request.headers.get('referer');
  const target = referer ? new URL(referer) : fallback;
  target.searchParams.set('control', status);
  if (message) target.searchParams.set('message', message.slice(0, 220));
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

export async function GET(request: NextRequest) {
  const session = await getSessionContext();

  if (!session.user) {
    return NextResponse.json({ error: 'No authenticated user.' }, { status: 401 });
  }

  const round = request.nextUrl.searchParams.get('round');

  let query = session.supabase
    .from('template_assets')
    .select('*')
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
  try {
    const session = await getSessionContext();

    if (!session.user) return redirectBack(request, 'error', 'No authenticated user.');
    if (!session.isMaster) return redirectBack(request, 'error', 'Only the master account can upload template assets.');

    const formData = await request.formData();

    const round = String(formData.get('round') || '').trim() as Round;
    const templateKind = String(formData.get('templateKind') || '').trim();
    const letterType = String(formData.get('letterType') || '').trim() as LetterType;
    const exhibitKind = String(formData.get('exhibitKind') || '').trim() as ExhibitKind;
    const file = formData.get('file');

    if (!allowedRounds.includes(round)) return redirectBack(request, 'error', 'Invalid round.');
    if (templateKind !== 'LETTER' && templateKind !== 'EXHIBIT') return redirectBack(request, 'error', 'Invalid template kind.');

    const resolvedLetterType = templateKind === 'LETTER' ? letterType : null;
    const resolvedExhibitKind = templateKind === 'EXHIBIT' ? exhibitKind : null;

    if (templateKind === 'LETTER' && !allowedLetterTypes.includes(letterType)) return redirectBack(request, 'error', 'Invalid letter type.');
    if (templateKind === 'EXHIBIT' && !allowedExhibitKinds.includes(exhibitKind)) return redirectBack(request, 'error', 'Invalid exhibit kind.');
    if (!(file instanceof File) || file.size === 0) return redirectBack(request, 'error', 'Template file is required.');

    const kind = documentKind({ templateKind, letterType: resolvedLetterType, exhibitKind: resolvedExhibitKind });
    assertFileType(file, kind);

    const contract = await inspectTemplateContract(file, kind);
    const targetType = resolvedLetterType || resolvedExhibitKind;

    if (!targetType) return redirectBack(request, 'error', 'Template type is required.');

    const storagePath = templateStoragePath({
      userId: session.user.id,
      round,
      kind: templateKind,
      type: targetType,
      filename: file.name
    });

    const upload = await session.supabase.storage
      .from('template-assets')
      .upload(storagePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (upload.error) return redirectBack(request, 'error', upload.error.message);

    let latestQuery = session.supabase
      .from('template_assets')
      .select('version_number')
      .eq('owner_id', session.user.id)
      .eq('round_label', round)
      .eq('template_kind', templateKind)
      .order('version_number', { ascending: false })
      .limit(1);

    if (resolvedLetterType) latestQuery = latestQuery.eq('letter_type', resolvedLetterType);
    if (resolvedExhibitKind) latestQuery = latestQuery.eq('exhibit_kind', resolvedExhibitKind);

    const latest = await latestQuery.maybeSingle();
    const nextVersion = latest.data?.version_number ? latest.data.version_number + 1 : 1;

    let deactivateQuery = session.supabase
      .from('template_assets')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('owner_id', session.user.id)
      .eq('round_label', round)
      .eq('template_kind', templateKind)
      .eq('is_active', true);

    if (resolvedLetterType) deactivateQuery = deactivateQuery.eq('letter_type', resolvedLetterType);
    if (resolvedExhibitKind) deactivateQuery = deactivateQuery.eq('exhibit_kind', resolvedExhibitKind);

    const deactivate = await deactivateQuery;
    if (deactivate.error) return redirectBack(request, 'error', deactivate.error.message);

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
        rule_json: { round, templateKind, letterType: resolvedLetterType, exhibitKind: resolvedExhibitKind },
        version_number: nextVersion,
        is_active: true
      })
      .select('id')
      .single();

    if (insert.error) return redirectBack(request, 'error', insert.error.message);

    return redirectBack(request, 'ok', `${round} ${targetType} template uploaded.`);
  } catch (error) {
    return redirectBack(request, 'error', error instanceof Error ? error.message : 'Template upload failed.');
  }
}
