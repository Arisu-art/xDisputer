import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { createSupabaseAdminClient } from '../../../lib/supabase/admin';
import { workspaceAccessErrorResponse } from '../../../lib/saas/access-entitlement';
import { recordGenerationIntegrity } from '../../../lib/saas/integrity-ledger';
import { logSystemEvent, requestIdFrom, safeErrorMessage } from '../../../lib/saas/system-observability';
import { createNotification } from '../../../lib/notifications/notification-write-service';
import { outputActivityContract } from '../../../src/features/manager-output-activity/output-activity-contract';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedRounds = ['1st Round', '2nd Round', '3rd Round', 'Final'];
const allowedStatuses = ['generated', 'downloaded', 'failed'];

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function noStoreJson(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function isMissingRpcError(message: string | undefined) {
  return Boolean(message && (message.includes('Could not find the function') || message.includes('does not exist') || message.includes('schema cache')));
}

function normalizeDailyEntitlement(row: any) {
  if (!row) return null;
  return {
    allowed: row.allowed !== false,
    outputLimit: typeof row.output_limit === 'number' ? row.output_limit : null,
    outputUsedToday: Number(row.output_used_today ?? row.output_used_this_month ?? 0),
    outputRemainingToday: typeof row.output_remaining_today === 'number' ? row.output_remaining_today : typeof row.output_remaining_this_month === 'number' ? row.output_remaining_this_month : null,
    resetAt: row.reset_at || null,
    resetSeconds: typeof row.reset_seconds === 'number' ? row.reset_seconds : null,
    message: row.message || null
  };
}

async function readDailyEntitlement(supabase: SupabaseServerClient, ownerId: string) {
  const daily = await supabase.rpc('access_client_daily_output_entitlement_v1', { owner_id_input: ownerId });
  if (!daily.error || !isMissingRpcError(daily.error.message)) return daily;
  return supabase.rpc('access_check_generation_output_limit_v1', { owner_id_input: ownerId });
}

function outputCountFromManifest(manifest: any) {
  const outputs = Array.isArray(manifest?.outputs) ? manifest.outputs : [];
  return Math.max(1, outputs.length || Number(manifest?.outputCount || 1));
}

function routeSummaryFromManifest(manifest: any) {
  const outputs = Array.isArray(manifest?.outputs) ? manifest.outputs : [];
  const routes = outputs.map((item: any) => [item?.bureau, item?.type].filter(Boolean).join(' ')).filter(Boolean);
  return Array.from(new Set(routes)).slice(0, 6).join(', ') || null;
}

function managerSettingIsOutputBased(row: any) {
  return row?.employment_type === 'output_based' || row?.is_regular === false;
}

function managerSettingRate(row: any) {
  const parsed = Number(row?.per_output_rate ?? row?.rate ?? 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function managerSettingNote(row: any) {
  return String(row?.notes || '').trim().replace(/\s+/g, ' ').slice(0, 300);
}

async function notifyManagerForGeneratedOutput(input: {
  generationRunId: string;
  disputerId: string;
  clientName: string;
  round: string;
  manifest: unknown;
  perOutputPay: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const profile = await admin
    .from('profiles')
    .select('manager_id, full_name, email')
    .eq('id', input.disputerId)
    .maybeSingle();

  if (profile.error) throw new Error(profile.error.message);

  const managerId = profile.data?.manager_id;
  if (!managerId) return { activityId: null as string | null, notification: 'no-manager' as const, errorMessage: 'Disputer has no manager_id assigned.' };

  const managerSetting = await admin
    .from('manager_user_settings')
    .select('employment_type,is_regular,per_output_rate,rate,notes')
    .eq('manager_id', managerId)
    .eq('user_id', input.disputerId)
    .maybeSingle();

  if (managerSetting.error) throw new Error(managerSetting.error.message);

  const profileForcesPerOutput = managerSettingIsOutputBased(managerSetting.data);
  const isPerOutput = profileForcesPerOutput || input.perOutputPay === true;
  const outputCount = outputCountFromManifest(input.manifest);
  const rateAmount = isPerOutput ? managerSettingRate(managerSetting.data) : outputActivityContract.defaultRateAmount;
  const label = `${input.clientName} · ${input.round} generated output`;
  const note = managerSettingNote(managerSetting.data) || 'No manager note set';

  const activity = await admin
    .from('manager_disputer_output_approvals')
    .insert({
      manager_id: managerId,
      disputer_id: input.disputerId,
      generation_run_id: input.generationRunId,
      output_label: label,
      output_count: outputCount,
      rate_amount: rateAmount,
      status: isPerOutput ? outputActivityContract.status.pending : outputActivityContract.status.recorded,
      source: isPerOutput ? outputActivityContract.sourceGeneratedPayable : outputActivityContract.sourceGeneratedRecorded,
      payday_label: null,
      notes: note,
      round_label: input.round,
      letter_route: routeSummaryFromManifest(input.manifest),
      client_name: input.clientName,
      is_per_output: isPerOutput,
      updated_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (activity.error) throw new Error(activity.error.message);

  const notification = await createNotification({
    supabase: admin as SupabaseServerClient,
    createdBy: input.disputerId,
    recipientUserId: managerId,
    title: isPerOutput ? (profileForcesPerOutput ? 'Per-output client generated a letter' : 'Per-output add-on needs confirmation') : 'Fulltime Output generated',
    body: isPerOutput
      ? `${profile.data?.full_name || profile.data?.email || 'A disputer'} generated ${outputCount} output item(s) for ${input.clientName}. Confirm it before it affects salary.`
      : `${profile.data?.full_name || profile.data?.email || 'A disputer'} generated ${outputCount} fulltime output item(s) for ${input.clientName}. No confirmation is required.`,
    href: isPerOutput ? '/admin/output-activity-v2?filter=per_output' : '/admin/output-activity-v2?filter=not_per_output',
    severity: isPerOutput ? 'warning' : 'info'
  });

  if (!notification.ok) throw new Error(notification.errorMessage || 'Manager notification insert failed.');

  return {
    activityId: activity.data?.id || null,
    notification: isPerOutput ? 'created' as const : 'recorded' as const,
    notificationId: notification.notificationId || null,
    forcedByProfile: profileForcesPerOutput
  };
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = requestIdFrom(request);
  const accessError = await workspaceAccessErrorResponse();
  if (accessError) return accessError;
  const supabase = await createSupabaseServerClient();
  try {
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult.user) return noStoreJson({ error: userError?.message || 'No authenticated user.' }, { status: 401 });
    const { data, error } = await supabase.from('generation_runs').select('id, client_name, round_label, output_status, created_at').order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    await logSystemEvent(supabase, { requestId, routePath: '/api/generation-runs', eventType: 'generation_runs_list', eventStatus: 'success', durationMs: Date.now() - startedAt, metadata: { count: Array.isArray(data) ? data.length : 0 } });
    return noStoreJson({ runs: data || [] });
  } catch (error) {
    await logSystemEvent(supabase, { requestId, routePath: '/api/generation-runs', eventType: 'generation_runs_list', eventStatus: 'error', durationMs: Date.now() - startedAt, safeMessage: safeErrorMessage(error) });
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
    if (userError || !userResult.user) return noStoreJson({ error: userError?.message || 'No authenticated user.' }, { status: 401 });
    const body = await request.json().catch(() => null);
    const clientName = String(body?.clientName || '').trim() || 'Unknown client';
    const round = String(body?.round || '').trim();
    const status = String(body?.status || 'generated').trim();
    const manifest = body?.manifest;
    const perOutputPay = body?.perOutputPay === true;
    if (!allowedRounds.includes(round)) return noStoreJson({ error: 'Invalid generation round.' }, { status: 400 });
    if (!allowedStatuses.includes(status)) return noStoreJson({ error: 'Invalid generation status.' }, { status: 400 });
    if (!manifest || typeof manifest !== 'object') return noStoreJson({ error: 'Generation manifest is required.' }, { status: 400 });

    if (status !== 'failed') {
      const limitCheck = await readDailyEntitlement(supabase, userResult.user.id);
      if (limitCheck.error && !isMissingRpcError(limitCheck.error.message)) throw limitCheck.error;
      const limitRow = Array.isArray(limitCheck.data) ? limitCheck.data[0] : null;
      const entitlement = normalizeDailyEntitlement(limitRow);
      if (entitlement && entitlement.allowed === false) {
        await logSystemEvent(supabase, { requestId, routePath: '/api/generation-runs', eventType: 'generation_output_limit_blocked', eventStatus: 'warning', durationMs: Date.now() - startedAt, safeMessage: entitlement.message || 'Daily output limit reached.', metadata: entitlement });
        return noStoreJson({ error: entitlement.message || 'Daily output limit reached.', entitlement }, { status: 403 });
      }
    }

    const { data, error } = await supabase.from('generation_runs').insert({ owner_id: userResult.user.id, client_name: clientName, round_label: round, manifest_json: manifest, output_status: status }).select('id, client_name, round_label, output_status, created_at').single();
    if (error) throw error;
    const outputActivity = status === 'generated'
      ? await notifyManagerForGeneratedOutput({ generationRunId: data.id, disputerId: userResult.user.id, clientName, round, manifest, perOutputPay }).catch((error) => ({ activityId: null, notification: 'failed' as const, errorMessage: safeErrorMessage(error) }))
      : null;
    const integrityError = await recordGenerationIntegrity(supabase, { generationRunId: data.id, eventType: 'generation_run_recorded', manifest, rules: { allowedRounds, allowedStatuses, selectedRound: round, selectedStatus: status, perOutputPay }, status: status === 'failed' ? 'failed' : 'recorded', metadata: { clientName, round, status, perOutputPay, outputActivity } });
    await logSystemEvent(supabase, { requestId, routePath: '/api/generation-runs', eventType: 'generation_run_create', eventStatus: integrityError || (outputActivity && 'errorMessage' in outputActivity && outputActivity.errorMessage) ? 'warning' : 'success', durationMs: Date.now() - startedAt, safeMessage: integrityError || (outputActivity && 'errorMessage' in outputActivity ? outputActivity.errorMessage : null), metadata: { generationRunId: data.id, round, status, perOutputPay, outputActivity } });
    const afterLimit = status === 'failed' ? null : await readDailyEntitlement(supabase, userResult.user.id);
    const entitlement = afterLimit && !afterLimit.error && Array.isArray(afterLimit.data) ? normalizeDailyEntitlement(afterLimit.data[0]) : null;
    return noStoreJson({ run: data, entitlement, outputActivity });
  } catch (error) {
    await logSystemEvent(supabase, { requestId, routePath: '/api/generation-runs', eventType: 'generation_run_create', eventStatus: 'error', durationMs: Date.now() - startedAt, safeMessage: safeErrorMessage(error) });
    return noStoreJson({ error: safeErrorMessage(error) }, { status: 500 });
  }
}
