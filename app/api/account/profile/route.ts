import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { normalizeAccountDisplayName, saveCurrentAccountProfile } from '../../../../lib/saas/account-profile-settings';

function safeRedirectTarget(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function firstForwardedHost(value: string | null) {
  return value?.split(',')[0]?.trim() || '';
}

function requestOrigin(request: NextRequest) {
  const explicitOrigin = request.headers.get('origin');
  if (explicitOrigin && !explicitOrigin.includes('0.0.0.0')) return explicitOrigin;

  const forwardedHost = firstForwardedHost(request.headers.get('x-forwarded-host'));
  const forwardedProto = firstForwardedHost(request.headers.get('x-forwarded-proto')) || 'https';
  if (forwardedHost && !forwardedHost.includes('0.0.0.0')) return `${forwardedProto}://${forwardedHost}`;

  const host = request.headers.get('host') || request.nextUrl.host;
  const proto = request.nextUrl.protocol.replace(':', '') || 'https';
  if (host && !host.includes('0.0.0.0')) return `${proto}://${host}`;

  return request.nextUrl.origin;
}

function redirectBack(request: NextRequest, next: string, state: 'saved' | 'error', reason?: string | null) {
  const url = new URL(next, requestOrigin(request));
  url.searchParams.set('account_settings', state);
  if (reason) url.searchParams.set('account_settings_reason', reason.slice(0, 80));
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const next = safeRedirectTarget(formData.get('next'));
  const fullName = normalizeAccountDisplayName(formData.get('full_name'));
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) return NextResponse.redirect(new URL('/login', requestOrigin(request)), { status: 303 });

  const result = await saveCurrentAccountProfile({ supabase, user, displayName: fullName });

  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/manager-workspace');
  revalidatePath('/master');
  revalidatePath(next);

  if (!result.ok) return redirectBack(request, next, 'error', result.strategy);
  return redirectBack(request, next, 'saved', result.strategy);
}
