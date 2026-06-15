import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

function safeRedirectTarget(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}

function normalizeDisplayName(value: FormDataEntryValue | null) {
  const raw = typeof value === 'string' ? value.trim() : '';
  return raw.replace(/\s+/g, ' ').slice(0, 120) || null;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const next = safeRedirectTarget(formData.get('next'));
  const fullName = normalizeDisplayName(formData.get('full_name'));
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  await supabase.auth.updateUser({ data: { full_name: fullName || '' } });

  return NextResponse.redirect(new URL(next, request.url));
}
