import { NextResponse, type NextRequest } from 'next/server';
import { getSessionContext } from '../../../../lib/saas/session';
import { workspaceAccessErrorResponse } from '../../../../lib/saas/access-entitlement';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Vary', 'Cookie, Authorization');
  return response;
}

function assetFileUrl(asset: {
  round_label: string;
  template_kind: string;
  letter_type: string | null;
  exhibit_kind: string | null;
}) {
  const params = new URLSearchParams();
  params.set('round', asset.round_label);
  params.set('templateKind', asset.template_kind);

  if (asset.template_kind === 'LETTER' && asset.letter_type) {
    params.set('letterType', asset.letter_type);
  }

  if (asset.template_kind === 'EXHIBIT' && asset.exhibit_kind) {
    params.set('exhibitKind', asset.exhibit_kind);
  }

  return `/api/template-assets/file?${params.toString()}`;
}

function slotKey(asset: {
  round_label: string;
  template_kind: string;
  letter_type: string | null;
  exhibit_kind: string | null;
}) {
  return [
    asset.round_label,
    asset.template_kind,
    asset.letter_type || asset.exhibit_kind || 'UNKNOWN'
  ].join('::');
}

export async function GET(request: NextRequest) {
  const accessError = await workspaceAccessErrorResponse();
  if (accessError) return accessError;

  const session = await getSessionContext();

  if (!session.user) {
    return noStoreJson({ error: 'No authenticated user.' }, { status: 401 });
  }

  const round = request.nextUrl.searchParams.get('round');

  if (round && !allowedRounds.includes(round)) {
    return noStoreJson({ error: 'Invalid round.' }, { status: 400 });
  }

  let query = session.supabase
    .from('template_assets')
    .select('id, round_label, template_kind, letter_type, exhibit_kind, original_filename, mime_type, file_size, contract_json, version_number, updated_at, created_at')
    .eq('owner_id', session.user.id)
    .eq('is_active', true)
    .order('round_label', { ascending: true })
    .order('template_kind', { ascending: true })
    .order('version_number', { ascending: false });

  if (round) query = query.eq('round_label', round);

  const { data, error } = await query;

  if (error) return noStoreJson({ error: error.message }, { status: 500 });

  const assets = (data || []).map((asset) => ({
    ...asset,
    cache_key: `${asset.id}:${asset.version_number || 0}:${asset.updated_at || asset.created_at || ''}`,
    slot_key: slotKey(asset),
    file_url: assetFileUrl(asset)
  }));

  const slots = assets.reduce<Record<string, (typeof assets)[number]>>((accumulator, asset) => {
    accumulator[asset.slot_key] = asset;
    return accumulator;
  }, {});

  return noStoreJson({
    manifest: {
      ownerId: session.user.id,
      round: round || null,
      generatedAt: new Date().toISOString(),
      assets,
      slots
    },
    assets
  });
}
