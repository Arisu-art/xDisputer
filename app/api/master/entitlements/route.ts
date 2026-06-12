import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { ensureUserProfile, normalizeRole } from '../../../../lib/supabase/roles';

function cleanValue(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function cleanLimit(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
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
    const notes = cleanValue(formData, 'notes');

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
      const maxClients = cleanLimit(cleanValue(formData, 'maxClients'));
      const defaultOutputLimit = cleanLimit(cleanValue(formData, 'defaultClientOutputLimit'));
      const { error } = await supabase.rpc('access_set_manager_entitlement_v1', {
        manager_id_input: profileId,
        max_clients_input: maxClients,
        default_client_output_limit_input: defaultOutputLimit,
        notes_input: notes || null
      });

      if (error) return redirectBack(request, 'error', error.message);
      return redirectBack(request, 'ok', 'Manager agreement limits updated.');
    }

    const outputLimit = cleanLimit(cleanValue(formData, 'outputLimit'));
    const { error } = await supabase.rpc('access_set_client_entitlement_v1', {
      client_id_input: profileId,
      output_limit_input: outputLimit,
      notes_input: notes || null
    });

    if (error) return redirectBack(request, 'error', error.message);
    return redirectBack(request, 'ok', 'Client output limit updated.');
  } catch (error) {
    return redirectBack(request, 'error', error instanceof Error ? error.message : 'Entitlement update failed.');
  }
}
