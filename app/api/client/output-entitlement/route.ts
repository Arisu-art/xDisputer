import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}

function isMissingRpc(message: string | undefined) {
  return Boolean(message && (
    message.includes('Could not find the function') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  ));
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return noStoreJson({ error: userError?.message || 'No authenticated user.' }, { status: 401 });
  }

  const { data, error } = await supabase.rpc('access_client_daily_output_entitlement_v1', {
    owner_id_input: userResult.user.id
  });

  if (error) {
    if (isMissingRpc(error.message)) {
      return noStoreJson({
        entitlement: {
          outputLimit: null,
          outputUsedToday: 0,
          outputRemainingToday: null,
          resetAt: null,
          resetSeconds: null,
          allowed: true,
          message: null
        }
      });
    }

    return noStoreJson({ error: error.message }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : null;

  return noStoreJson({
    entitlement: {
      outputLimit: typeof row?.output_limit === 'number' ? row.output_limit : null,
      outputUsedToday: Number(row?.output_used_today || 0),
      outputRemainingToday: typeof row?.output_remaining_today === 'number' ? row.output_remaining_today : null,
      resetAt: row?.reset_at || null,
      resetSeconds: typeof row?.reset_seconds === 'number' ? row.reset_seconds : null,
      allowed: row?.allowed !== false,
      message: row?.message || null
    }
  });
}
