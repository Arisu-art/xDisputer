import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { appRedirect } from '../../../lib/supabase/origin';

function safeNext(value: string) {
  if (!value || !value.startsWith('/')) return '/client';
  if (value.startsWith('//')) return '/client';
  return value;
}

function friendlySignInError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Invalid email or password.';
  if (/email not confirmed/i.test(message)) return 'Email is not confirmed yet. Check your inbox or disable email confirmation for local testing.';
  return message;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = safeNext(String(formData.get('next') || '/client'));

  if (!email || !password) {
    return NextResponse.redirect(appRedirect(request, '/login', { error: 'Email and password are required.', next }));
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return NextResponse.redirect(appRedirect(request, '/login', { error: friendlySignInError(error.message), next }));
  }

  return NextResponse.redirect(appRedirect(request, next));
}
