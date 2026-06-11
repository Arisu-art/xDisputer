import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

type ControlIntent =
  | 'approve'
  | 'reject'
  | 'disable'
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
    value === 'approve' ||
    value === 'reject' ||
    value === 'disable' ||
    value === 'activate' ||
    value === 'reactivate' ||
    value === 'clear_manager'
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

    const { error } = await supabase.rpc('access_control_profile', {
      target_profile_id: targetProfileId,
      control_intent: intent
    });

    if (error) return redirectBack(request, 'error', error.message);

    return redirectBack(request, 'ok');
  } catch (error) {
    return redirectBack(request, 'error', error instanceof Error ? error.message : 'Control request failed.');
  }
}
