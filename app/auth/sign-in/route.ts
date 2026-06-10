import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { appRedirect } from '../../../lib/supabase/origin';

function safeNext(value: string) {
  if (!value || !value.startsWith('/')) return '/dashboard';
  if (value.startsWith('//')) return '/dashboard';
  return value;
}

function friendlySignInError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Invalid email or password.';
  if (/email not confirmed/i.test(message)) return 'Email is not confirmed yet. Check your inbox or disable email confirmation for local testing.';
  return message;
}

async function roleBasedDestination(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, requestedNext: string) {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) return '/login';

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') {
    return requestedNext === '/client' || requestedNext === '/dashboard' ? '/admin' : requestedNext;
  }

  return requestedNext === '/dashboard' || requestedNext === '/admin' ? '/client' : requestedNext;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = safeNext(String(formData.get('next') || '/dashboard'));

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

  return NextResponse.redirect(appRedirect(request, await roleBasedDestination(supabase, next)));
}
