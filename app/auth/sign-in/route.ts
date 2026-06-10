import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/client') || '/client';

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', error.message);
    url.searchParams.set('next', next);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
