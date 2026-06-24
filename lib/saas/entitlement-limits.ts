import type { createSupabaseServerClient } from '../supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type EntitlementLimitRow = {
  profile_id: string;
  max_clients: number | null;
  current_clients: number;
  default_client_output_limit: number | null;
  client_output_limit: number | null;
  effective_output_limit: number | null;
  output_used_today: number;
  output_remaining_today: number | null;
  updated_at: string | null;
};

export type EntitlementLimitMap = Record<string, EntitlementLimitRow>;

type RawEntitlementRow = Partial<EntitlementLimitRow> & {
  output_used_this_month?: number;
  output_remaining_this_month?: number | null;
  entitlement_notes?: string | null;
};

function isMissingRpc(message: string) {
  return message.includes('Could not find the function')
    || message.includes('does not exist')
    || message.includes('schema cache');
}

function positiveOrNull(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeRow(row: RawEntitlementRow): EntitlementLimitRow {
  return {
    profile_id: String(row.profile_id || ''),
    max_clients: positiveOrNull(row.max_clients),
    current_clients: Number(row.current_clients || 0),
    default_client_output_limit: positiveOrNull(row.default_client_output_limit),
    client_output_limit: positiveOrNull(row.client_output_limit),
    effective_output_limit: positiveOrNull(row.effective_output_limit),
    output_used_today: Number(row.output_used_today ?? row.output_used_this_month ?? 0),
    output_remaining_today: typeof row.output_remaining_today === 'number' && row.output_remaining_today > 0
      ? row.output_remaining_today
      : typeof row.output_remaining_this_month === 'number' && row.output_remaining_this_month > 0
        ? row.output_remaining_this_month
        : null,
    updated_at: row.updated_at || null
  };
}

async function callEntitlementRpc(
  supabase: SupabaseServerClient,
  rpcName: string,
  ids: string[]
) {
  return supabase.rpc(rpcName, { profile_ids: ids });
}

export async function listEntitlementLimits(
  supabase: SupabaseServerClient,
  profileIds: string[]
): Promise<{ entitlements: EntitlementLimitMap; errorMessage: string | null }> {
  const ids = Array.from(new Set(profileIds.filter(Boolean)));
  if (!ids.length) return { entitlements: {}, errorMessage: null };

  let { data, error } = await callEntitlementRpc(supabase, 'access_list_daily_entitlement_limits_v1', ids);

  if (error && isMissingRpc(error.message)) {
    const fallback = await callEntitlementRpc(supabase, 'access_list_entitlement_limits_v1', ids);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return { entitlements: {}, errorMessage: isMissingRpc(error.message) ? null : error.message };

  const rows = Array.isArray(data) ? data as RawEntitlementRow[] : [];
  const normalized = rows.map(normalizeRow).filter((row) => row.profile_id);

  return {
    entitlements: Object.fromEntries(normalized.map((row) => [row.profile_id, row])),
    errorMessage: null
  };
}
