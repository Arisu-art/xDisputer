import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { workspaceAccessErrorResponse } from '../../../lib/saas/access-entitlement';

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const allowedStatuses = ['generated', 'downloaded', 'failed'];

export async function GET() {
  const accessError = await workspaceAccessErrorResponse();
  if (accessError) return accessError;

  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return NextResponse.json({ error: userError?.message || 'No authenticated user.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('generation_runs')
    .select('id, client_name, round_label, output_status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ runs: data || [] });
}

export async function POST(request: NextRequest) {
  const accessError = await workspaceAccessErrorResponse();
  if (accessError) return accessError;

  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return NextResponse.json({ error: userError?.message || 'No authenticated user.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const clientName = String(body?.clientName || '').trim() || 'Unknown client';
  const round = String(body?.round || '').trim();
  const status = String(body?.status || 'generated').trim();
  const manifest = body?.manifest;

  if (!allowedRounds.includes(round)) {
    return NextResponse.json({ error: 'Invalid generation round.' }, { status: 400 });
  }

  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid generation status.' }, { status: 400 });
  }

  if (!manifest || typeof manifest !== 'object') {
    return NextResponse.json({ error: 'Generation manifest is required.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('generation_runs')
    .insert({
      owner_id: userResult.user.id,
      client_name: clientName,
      round_label: round,
      manifest_json: manifest,
      output_status: status
    })
    .select('id, client_name, round_label, output_status, created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ run: data });
}
