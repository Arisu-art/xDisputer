import type { createSupabaseServerClient } from '../supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type EntitlementLimitRow = {
  profile_id: string;
  max_clients: number | null;
  current_clients: number;
  default_client_output_limit: number | null;
  client_output_limit: number | null;
  effective_output_limit: number | null;
  output_used_this_month: number;
  output_remaining_this_month: number | null;
  entitlement_notes: string | null;
  updated_at: string | null;
};

export type EntitlementLimitMap = Record<string, EntitlementLimitRow>;

export async function listEntitlementLimits(
  supabase: SupabaseServerClient,
  profileIds: string[]
): Promise<{ entitlements: EntitlementLimitMap; errorMessage: string | null }> {
  const ids = Array.from(new Set(profileIds.filter(Boolean)));
  if (!ids.length) return { entitlements: {}, errorMessage: null };

  const { data, error } = await supabase.rpc('access_list_entitlement_limits_v1', {
    profile_ids: ids
  });

  if (error) {
    const missing = error.message.includes('Could not find the function')
      || error.message.includes('does not exist')
      || error.message.includes('schema cache');

    return { entitlements: {}, errorMessage: missing ? null : error.message };
  }

  const rows = Array.isArray(data) ? data as EntitlementLimitRow[] : [];
  return {
    entitlements: Object.fromEntries(rows.map((row) => [row.profile_id, row])),
    errorMessage: null
  };
}
