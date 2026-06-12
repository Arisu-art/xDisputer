import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type EntitlementRow = {
  allowed?: boolean;
  output_limit?: number | null;
  output_used_today?: number | null;
  output_remaining_today?: number | null;
  output_used_this_month?: number | null;
  output_remaining_this_month?: number | null;
  reset_at?: string | null;
  reset_seconds?: number | null;
  message?: string | null;
};

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

function nextUsEasternReset(now = new Date()) {
  const easternParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now);
  const year = Number(easternParts.find((part) => part.type === 'year')?.value || now.getUTCFullYear());
  const month = Number(easternParts.find((part) => part.type === 'month')?.value || now.getUTCMonth() + 1);
  const day = Number(easternParts.find((part) => part.type === 'day')?.value || now.getUTCDate());
  const noonUtc = new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
  const resetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(noonUtc);
  const resetYear = Number(resetParts.find((part) => part.type === 'year')?.value || year);
  const resetMonth = Number(resetParts.find((part) => part.type === 'month')?.value || month);
  const resetDay = Number(resetParts.find((part) => part.type === 'day')?.value || day + 1);
  const resetHour = Number(resetParts.find((part) => part.type === 'hour')?.value || 0);
  const resetMinute = Number(resetParts.find((part) => part.type === 'minute')?.value || 0);
  const resetSecond = Number(resetParts.find((part) => part.type === 'second')?.value || 0);
  const offsetMs = ((12 - resetHour) * 60 * 60 + (0 - resetMinute) * 60 + (0 - resetSecond)) * 1000;
  const resetAt = new Date(noonUtc.getTime() + offsetMs);
  return {
    resetAt: resetAt.toISOString(),
    resetSeconds: Math.max(0, Math.floor((resetAt.getTime() - now.getTime()) / 1000))
  };
}

function normalizeEntitlement(row: EntitlementRow | null, source: 'daily' | 'fallback' | 'none') {
  const reset = nextUsEasternReset();
  const outputLimit = typeof row?.output_limit === 'number' ? row.output_limit : null;
  const used = Number(row?.output_used_today ?? row?.output_used_this_month ?? 0);
  const remaining = typeof row?.output_remaining_today === 'number'
    ? row.output_remaining_today
    : typeof row?.output_remaining_this_month === 'number'
      ? row.output_remaining_this_month
      : outputLimit === null
        ? null
        : Math.max(outputLimit - used, 0);

  return {
    outputLimit,
    outputUsedToday: used,
    outputRemainingToday: remaining,
    resetAt: row?.reset_at || reset.resetAt,
    resetSeconds: typeof row?.reset_seconds === 'number' ? row.reset_seconds : reset.resetSeconds,
    allowed: row?.allowed !== false,
    message: row?.message || (source === 'fallback' ? 'Using configured output limit fallback. Apply the daily entitlement SQL migration for exact daily usage.' : null),
    source
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult, error: userError } = await supabase.auth.getUser();

  if (userError || !userResult.user) {
    return noStoreJson({ error: userError?.message || 'No authenticated user.' }, { status: 401 });
  }

  const daily = await supabase.rpc('access_client_daily_output_entitlement_v1', {
    owner_id_input: userResult.user.id
  });

  if (!daily.error) {
    const row = Array.isArray(daily.data) ? daily.data[0] : null;
    return noStoreJson({ entitlement: normalizeEntitlement(row, 'daily') });
  }

  if (!isMissingRpc(daily.error.message)) {
    return noStoreJson({ error: daily.error.message }, { status: 500 });
  }

  const fallback = await supabase.rpc('access_check_generation_output_limit_v1', {
    owner_id_input: userResult.user.id
  });

  if (!fallback.error) {
    const row = Array.isArray(fallback.data) ? fallback.data[0] : null;
    return noStoreJson({ entitlement: normalizeEntitlement(row, 'fallback') });
  }

  if (!isMissingRpc(fallback.error.message)) {
    return noStoreJson({ error: fallback.error.message }, { status: 500 });
  }

  return noStoreJson({ entitlement: normalizeEntitlement(null, 'none') });
}
