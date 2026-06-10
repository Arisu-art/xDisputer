import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${siteUrl}/auth/callback`
    }
  });

  if (error) {
    const url = new URL('/signup', request.url);
    url.searchParams.set('error', error.message);
    return NextResponse.redirect(url);
  }

  const url = new URL('/login', request.url);
  url.searchParams.set('message', 'Account created. Check your email if confirmation is enabled, then sign in.');
  return NextResponse.redirect(url);
}
