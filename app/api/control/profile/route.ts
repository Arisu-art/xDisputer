import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

type ControlIntent = 'make_manager' | 'demote_client' | 'disable' | 'activate' | 'clear_manager';

function redirectBack(request: NextRequest, status: 'ok' | 'error', message?: string) {
  const fallback = new URL('/master', request.url);
  const referer = request.headers.get('referer');
  const target = referer ? new URL(referer) : fallback;

  target.searchParams.set('control', status);
  if (message) target.searchParams.set('message', message.slice(0, 180));

  return NextResponse.redirect(target, 303);
}

function cleanValue(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function controlPatch(intent: ControlIntent) {
  switch (intent) {
    case 'make_manager':
      return { next_role: 'manager', next_status: 'active', clear_manager: false };
    case 'demote_client':
      return { next_role: 'client', next_status: 'active', clear_manager: true };
    case 'disable':
      return { next_role: null, next_status: 'disabled', clear_manager: false };
    case 'activate':
      return { next_role: null, next_status: 'active', clear_manager: false };
    case 'clear_manager':
      return { next_role: null, next_status: null, clear_manager: true };
    default:
      return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const targetProfileId = cleanValue(formData, 'profileId');
    const intent = cleanValue(formData, 'intent') as ControlIntent;
    const patch = controlPatch(intent);

    if (!targetProfileId || !patch) {
      return redirectBack(request, 'error', 'Invalid control request.');
    }

    const supabase = await createSupabaseServerClient();
    const { data: userResult } = await supabase.auth.getUser();

    if (!userResult.user) {
      const login = new URL('/login', request.url);
      login.searchParams.set('next', '/app');
      return NextResponse.redirect(login, 303);
    }

    const { error } = await supabase.rpc('control_update_profile', {
      target_profile_id: targetProfileId,
      next_role: patch.next_role,
      next_status: patch.next_status,
      next_manager_id: null,
      clear_manager: patch.clear_manager
    });

    if (error) return redirectBack(request, 'error', error.message);

    return redirectBack(request, 'ok');
  } catch (error) {
    return redirectBack(request, 'error', error instanceof Error ? error.message : 'Control request failed.');
  }
}
