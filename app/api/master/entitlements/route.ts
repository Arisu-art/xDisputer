import { revalidatePath } from 'next/cache';
import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { ensureUserProfile, normalizeRole } from '../../../../lib/supabase/roles';

function cleanValue(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function parsePositiveLimit(value: string, label: string) {
  const normalized = value.trim();
  const parsed = Number(normalized);
  if (!normalized || !Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive whole number set by Master.`);
  }
  return parsed;
}

function parseOptionalOverrideLimit(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed)) throw new Error('Disputer output override must be blank or a positive whole number.');
  if (parsed <= 0) return null;
  return parsed;
}

function revalidateEntitlementViews() {
  revalidatePath('/master/accounts');
  revalidatePath('/admin');
  revalidatePath('/admin/access');
  revalidatePath('/admin/output-activity-v2');
  revalidatePath('/app');
}

function redirectBack(request: NextRequest, status: 'ok' | 'error', message?: string) {
  const fallback = new URL('/master/accounts', request.url);
  const referer = request.headers.get('referer');
  const target = referer ? new URL(referer) : fallback;

  target.searchParams.set('control', status);
  if (message) target.searchParams.set('message', message.slice(0, 180));

  return NextResponse.redirect(target, 303);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const mode = cleanValue(formData, 'mode');
    const profileId = cleanValue(formData, 'profileId');

    if (!profileId || (mode !== 'manager' && mode !== 'client')) {
      return redirectBack(request, 'error', 'Invalid entitlement request.');
    }

    const supabase = await createSupabaseServerClient();
    const { data: userResult } = await supabase.auth.getUser();

    if (!userResult.user) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', '/app');
      return NextResponse.redirect(login, 303);
    }

    const actorProfile = await ensureUserProfile(supabase, userResult.user);
    const actorRole = normalizeRole(actorProfile?.role);

    if (actorRole !== 'master') {
      return redirectBack(request, 'error', 'Only master can edit agreement limits.');
    }

    if (mode === 'manager') {
      const maxClients = parsePositiveLimit(cleanValue(formData, 'maxClients'), 'Manager Disputer limit');
      const defaultOutputLimit = parsePositiveLimit(cleanValue(formData, 'defaultClientOutputLimit'), 'Manager default outputs per Disputer/day');
      const { error } = await supabase.rpc('access_set_manager_entitlement_v1', {
        manager_id_input: profileId,
        max_clients_input: maxClients,
        default_client_output_limit_input: defaultOutputLimit,
        notes_input: null
      });

      if (error) return redirectBack(request, 'error', error.message);
      revalidateEntitlementViews();
      return redirectBack(request, 'ok', 'Master-set manager limits synced.');
    }

    const outputLimit = parseOptionalOverrideLimit(cleanValue(formData, 'outputLimit'));
    const { error } = await supabase.rpc('access_set_client_entitlement_v1', {
      client_id_input: profileId,
      output_limit_input: outputLimit,
      notes_input: null
    });

    if (error) return redirectBack(request, 'error', error.message);
    revalidateEntitlementViews();
    return redirectBack(request, 'ok', outputLimit === null ? 'Disputer now inherits the manager output cap.' : 'Disputer output override synced.');
  } catch (error) {
    return redirectBack(request, 'error', error instanceof Error ? error.message : 'Entitlement update failed.');
  }
}
