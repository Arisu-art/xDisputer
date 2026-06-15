import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

function safeRedirectTarget(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function normalizeDisplayName(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.replace(/\s+/g, ' ').slice(0, 120) || null;
}

function redirectBack(request: NextRequest, next: string, state: 'saved' | 'error') {
  const url = new URL(next, request.url);
  url.searchParams.set('account_settings', state);
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const next = safeRedirectTarget(formData.get('next'));
  const fullName = normalizeDisplayName(formData.get('full_name'));
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) return NextResponse.redirect(new URL('/login', request.url), { status: 303 });

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, email: user.email || null, full_name: fullName }, { onConflict: 'id' });

  const { error: authError } = await supabase.auth.updateUser({ data: { full_name: fullName || '' } });

  revalidatePath('/', 'layout');
  revalidatePath(next);

  if (profileError || authError) return redirectBack(request, next, 'error');
  return redirectBack(request, next, 'saved');
}
