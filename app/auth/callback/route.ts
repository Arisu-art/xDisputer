import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { appRedirect } from '../../../lib/supabase/origin';
import { normalizeNextPath } from '../../../lib/saas/routes';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = normalizeNextPath(requestUrl.searchParams.get('next') || '/app');

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(appRedirect(request, next), 303);
}
