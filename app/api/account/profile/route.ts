import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { normalizeAccountDisplayName, saveCurrentAccountProfile } from '../../../../lib/saas/account-profile-settings';

function safeRedirectTarget(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || '';
}

function hostFromOrigin(value: string) {
  try {
    return new URL(value).host;
  } catch {
    return '';
  }
}

function isPrivateDevHost(value: string) {
  const host = value.includes('://') ? hostFromOrigin(value) : value;
  const hostname = host.split(':')[0]?.toLowerCase() || '';
  return hostname === '0.0.0.0' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

function publicOriginFromHeaders(request: NextRequest) {
  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'));
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto')) || 'https';
  if (forwardedHost && !isPrivateDevHost(forwardedHost)) return `${forwardedProto}://${forwardedHost}`;

  const forwardedUrl = firstHeaderValue(request.headers.get('x-forwarded-url'));
  if (forwardedUrl && !isPrivateDevHost(forwardedUrl)) return new URL(forwardedUrl).origin;

  const referer = request.headers.get('referer');
  if (referer && !isPrivateDevHost(referer)) return new URL(referer).origin;

  const origin = request.headers.get('origin');
  if (origin && !isPrivateDevHost(origin)) return origin;

  const host = request.headers.get('host') || request.nextUrl.host;
  const proto = request.nextUrl.protocol.replace(':', '') || 'https';
  if (host && !isPrivateDevHost(host)) return `${proto}://${host}`;

  return request.nextUrl.origin;
}

function redirectBack(request: NextRequest, next: string, state: 'saved' | 'error', reason?: string | null) {
  const url = new URL(next, publicOriginFromHeaders(request));
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

  if (!user) return NextResponse.redirect(new URL('/login', publicOriginFromHeaders(request)), { status: 303 });

  const result = await saveCurrentAccountProfile({ supabase, user, displayName: fullName });

  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/manager-workspace');
  revalidatePath('/master');
  revalidatePath(next);

  if (!result.ok) return redirectBack(request, next, 'error', result.strategy);
  return redirectBack(request, next, 'saved', result.strategy);
}
