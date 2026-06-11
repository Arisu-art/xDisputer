import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { ensureUserProfile, normalizeRole } from '../../../../lib/supabase/roles';

type ControlIntent =
  | 'make_manager'
  | 'demote_client'
  | 'approve'
  | 'reject'
  | 'disable'
  | 'suspend'
  | 'activate'
  | 'reactivate'
  | 'clear_manager';

function redirectBack(request: NextRequest, status: 'ok' | 'error', message?: string) {
  const fallback = new URL('/admin?panel=access', request.url);
  const referer = request.headers.get('referer');
  const target = referer ? new URL(referer) : fallback;

  target.searchParams.set('control', status);
  if (message) target.searchParams.set('message', message.slice(0, 180));

  return NextResponse.redirect(target, 303);
}

function cleanValue(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

function isControlIntent(value: string): value is ControlIntent {
  return (
    value === 'make_manager' ||
    value === 'demote_client' ||
    value === 'approve' ||
    value === 'reject' ||
    value === 'disable' ||
    value === 'suspend' ||
    value === 'activate' ||
    value === 'reactivate' ||
    value === 'clear_manager'
  );
}

function isMasterIntent(intent: ControlIntent) {
  return (
    intent === 'make_manager' ||
    intent === 'demote_client' ||
    intent === 'disable' ||
    intent === 'suspend' ||
    intent === 'activate' ||
    intent === 'reactivate' ||
    intent === 'clear_manager'
  );
}

function isManagerIntent(intent: ControlIntent) {
  return (
    intent === 'approve' ||
    intent === 'reject' ||
    intent === 'disable' ||
    intent === 'activate' ||
    intent === 'reactivate' ||
    intent === 'clear_manager'
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const targetProfileId = cleanValue(formData, 'profileId');
    const intent = cleanValue(formData, 'intent');

    if (!targetProfileId || !isControlIntent(intent)) {
      return redirectBack(request, 'error', 'Invalid control request.');
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

    if (actorRole === 'master') {
      if (!isMasterIntent(intent)) {
        return redirectBack(request, 'error', 'This action is not available to master control.');
      }

      const { error } = await supabase.rpc('access_master_control_profile', {
        target_profile_id: targetProfileId,
        control_intent: intent
      });

      if (error) return redirectBack(request, 'error', error.message);

      return redirectBack(request, 'ok');
    }

    if (actorRole === 'manager') {
      if (!isManagerIntent(intent)) {
        return redirectBack(request, 'error', 'This action is not available to manager control.');
      }

      const managerIntent = intent === 'reactivate' ? 'activate' : intent;

      const { error } = await supabase.rpc('access_control_profile', {
        target_profile_id: targetProfileId,
        control_intent: managerIntent
      });

      if (error) return redirectBack(request, 'error', error.message);

      return redirectBack(request, 'ok');
    }

    return redirectBack(request, 'error', 'You do not have permission to control accounts.');
  } catch (error) {
    return redirectBack(request, 'error', error instanceof Error ? error.message : 'Control request failed.');
  }
}
