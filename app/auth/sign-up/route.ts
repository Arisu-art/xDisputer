import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { appRedirect, getAppOrigin } from '../../../lib/supabase/origin';

function friendlySignupError(message: string) {
  if (/rate limit/i.test(message)) return 'Email rate limit exceeded. Wait a few minutes, then try again or disable email confirmation for local testing.';
  if (/already registered|already exists/i.test(message)) return 'This email already has an account. Sign in instead.';
  return message;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!fullName || !email || !password) {
    return NextResponse.redirect(appRedirect(request, '/signup', { error: 'Full name, email, and password are required.' }), 303);
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      },
      emailRedirectTo: `${getAppOrigin(request)}/auth/callback`
    }
  });

  if (error) {
    return NextResponse.redirect(appRedirect(request, '/signup', { error: friendlySignupError(error.message) }), 303);
  }

  return NextResponse.redirect(appRedirect(request, '/login', { message: 'Account created. Check your email if confirmation is enabled, then sign in.' }), 303);
}
