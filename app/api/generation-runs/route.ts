import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { workspaceAccessErrorResponse } from '../../../lib/saas/access-entitlement';
import { recordGenerationIntegrity } from '../../../lib/saas/integrity-ledger';
import { logSystemEvent, requestIdFrom, safeErrorMessage } from '../../../lib/saas/system-observability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const allowedStatuses = ['generated', 'downloaded', 'failed'];

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function isMissingRpcError(message: string | undefined) {
  return Boolean(message && (
    message.includes('Could not find the function') ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  ));
}

function normalizeDailyEntitlement(row: any) {
  if (!row) return null;
  return {
    allowed: row.allowed !== false,
    outputLimit: typeof row.output_limit === 'number' ? row.output_limit : null,
    outputUsedToday: Number(row.output_used_today ?? row.output_used_this_month ?? 0),
    outputRemainingToday: typeof row.output_remaining_today === 'number'
      ? row.output_remaining_today
      : typeof row.output_remaining_this_month === 'number'
        ? row.output_remaining_this_month
        : null,
    resetAt: row.reset_at || null,
    resetSeconds: typeof row.reset_seconds === 'number' ? row.reset_seconds : null,
    message: row.message || null
  };
}

async function readDailyEntitlement(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, ownerId: string) {
  const daily = await supabase.rpc('access_client_daily_output_entitlement_v1', { owner_id_input: ownerId });

  if (!daily.error || !isMissingRpcError(daily.error.message)) return daily;

  return supabase.rpc('access_check_generation_output_limit_v1', { owner_id_input: ownerId });
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = requestIdFrom(request);
  const accessError = await workspaceAccessErrorResponse();
  if (accessError) return accessError;

  const supabase = await createSupabaseServerClient();

  try {
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult.user) {
      return noStoreJson({ error: userError?.message || 'No authenticated user.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('generation_runs')
      .select('id, client_name, round_label, output_status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    await logSystemEvent(supabase, {
      requestId,
      routePath: '/api/generation-runs',
      eventType: 'generation_runs_list',
      eventStatus: 'success',
      durationMs: Date.now() - startedAt,
      metadata: { count: Array.isArray(data) ? data.length : 0 }
    });

    return noStoreJson({ runs: data || [] });
  } catch (error) {
    await logSystemEvent(supabase, {
      requestId,
      routePath: '/api/generation-runs',
      eventType: 'generation_runs_list',
      eventStatus: 'error',
      durationMs: Date.now() - startedAt,
      safeMessage: safeErrorMessage(error)
    });

    return noStoreJson({ error: safeErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = requestIdFrom(request);
  const accessError = await workspaceAccessErrorResponse();
  if (accessError) return accessError;

  const supabase = await createSupabaseServerClient();

  try {
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult.user) {
      return noStoreJson({ error: userError?.message || 'No authenticated user.' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    const clientName = String(body?.clientName || '').trim() || 'Unknown client';
    const round = String(body?.round || '').trim();
    const status = String(body?.status || 'generated').trim();
    const manifest = body?.manifest;

    if (!allowedRounds.includes(round)) {
      return noStoreJson({ error: 'Invalid generation round.' }, { status: 400 });
    }

    if (!allowedStatuses.includes(status)) {
      return noStoreJson({ error: 'Invalid generation status.' }, { status: 400 });
    }

    if (!manifest || typeof manifest !== 'object') {
      return noStoreJson({ error: 'Generation manifest is required.' }, { status: 400 });
    }

    if (status !== 'failed') {
      const limitCheck = await readDailyEntitlement(supabase, userResult.user.id);

      if (limitCheck.error && !isMissingRpcError(limitCheck.error.message)) {
        throw limitCheck.error;
      }

      const limitRow = Array.isArray(limitCheck.data) ? limitCheck.data[0] : null;
      const entitlement = normalizeDailyEntitlement(limitRow);

      if (entitlement && entitlement.allowed === false) {
        await logSystemEvent(supabase, {
          requestId,
          routePath: '/api/generation-runs',
          eventType: 'generation_output_limit_blocked',
          eventStatus: 'warning',
          durationMs: Date.now() - startedAt,
          safeMessage: entitlement.message || 'Daily output limit reached.',
          metadata: entitlement
        });

        return noStoreJson({
          error: entitlement.message || 'Daily output limit reached.',
          entitlement
        }, { status: 403 });
      }
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

    if (error) throw error;

    const integrityError = await recordGenerationIntegrity(supabase, {
      generationRunId: data.id,
      eventType: 'generation_run_recorded',
      manifest,
      rules: {
        allowedRounds,
        allowedStatuses,
        selectedRound: round,
        selectedStatus: status
      },
      status: status === 'failed' ? 'failed' : 'recorded',
      metadata: { clientName, round, status }
    });

    await logSystemEvent(supabase, {
      requestId,
      routePath: '/api/generation-runs',
      eventType: 'generation_run_create',
      eventStatus: integrityError ? 'warning' : 'success',
      durationMs: Date.now() - startedAt,
      safeMessage: integrityError,
      metadata: { generationRunId: data.id, round, status }
    });

    const afterLimit = status === 'failed' ? null : await readDailyEntitlement(supabase, userResult.user.id);
    const entitlement = afterLimit && !afterLimit.error && Array.isArray(afterLimit.data)
      ? normalizeDailyEntitlement(afterLimit.data[0])
      : null;

    return noStoreJson({ run: data, entitlement });
  } catch (error) {
    await logSystemEvent(supabase, {
      requestId,
      routePath: '/api/generation-runs',
      eventType: 'generation_run_create',
      eventStatus: 'error',
      durationMs: Date.now() - startedAt,
      safeMessage: safeErrorMessage(error)
    });

    return noStoreJson({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
