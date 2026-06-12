import { NextResponse, type NextRequest } from 'next/server';
import { getSessionContext } from '../../../../lib/saas/session';
import { workspaceAccessErrorResponse } from '../../../../lib/saas/access-entitlement';

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const allowedLetterTypes = ['DISPUTE', 'LATE_PAYMENT'];
const allowedExhibitKinds = ['FCRA', 'AFFIDAVIT', 'ATTACHMENT', 'FTC'];

function privateTemplateCacheHeaders(input: {
  etag: string;
  filename: string;
  mimeType: string | null;
}) {
  return {
    'Content-Type': input.mimeType || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${input.filename.replace(/"/g, '')}"`,
    'x-template-file-name': input.filename,
    'ETag': input.etag,
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=300'
  };
}

export async function GET(request: NextRequest) {
  const accessError = await workspaceAccessErrorResponse();
  if (accessError) return accessError;

  const session = await getSessionContext();

  if (!session.user) {
    return NextResponse.json({ error: 'No authenticated user.' }, { status: 401 });
  }

  const round = request.nextUrl.searchParams.get('round') || '';
  const templateKind = request.nextUrl.searchParams.get('templateKind') || '';
  const letterType = request.nextUrl.searchParams.get('letterType') || '';
  const exhibitKind = request.nextUrl.searchParams.get('exhibitKind') || '';

  if (!allowedRounds.includes(round)) {
    return NextResponse.json({ error: 'Invalid round.' }, { status: 400 });
  }

  let query = session.supabase
    .from('template_assets')
    .select('*')
    .eq('owner_id', session.user.id)
    .eq('round_label', round)
    .eq('template_kind', templateKind)
    .eq('is_active', true)
    .order('version_number', { ascending: false })
    .limit(1);

  if (templateKind === 'LETTER') {
    if (!allowedLetterTypes.includes(letterType)) return NextResponse.json({ error: 'Invalid letter type.' }, { status: 400 });
    query = query.eq('letter_type', letterType);
  } else if (templateKind === 'EXHIBIT') {
    if (!allowedExhibitKinds.includes(exhibitKind)) return NextResponse.json({ error: 'Invalid exhibit kind.' }, { status: 400 });
    query = query.eq('exhibit_kind', exhibitKind);
  } else {
    return NextResponse.json({ error: 'Invalid template kind.' }, { status: 400 });
  }

  const { data: asset, error } = await query.maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!asset) return NextResponse.json({ error: 'No active template found.' }, { status: 404 });

  const etag = `"template-${asset.id}-${asset.version_number}-${asset.updated_at}"`;
  const headers = privateTemplateCacheHeaders({
    etag,
    filename: asset.original_filename,
    mimeType: asset.mime_type
  });

  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }

  const download = await session.supabase.storage
    .from(asset.storage_bucket)
    .download(asset.storage_path);

  if (download.error) {
    return NextResponse.json({ error: download.error.message }, { status: 500 });
  }

  return new Response(download.data, { headers });
}
