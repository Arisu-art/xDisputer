import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';
import { markNotificationsReadForCurrentUser } from '../../../../src/features/notifications/notification-api-service';

const jsonHeaders = {
  'Cache-Control': 'no-store'
};

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const result = await markNotificationsReadForCurrentUser(supabase);

  return NextResponse.json(
    { updatedCount: result.updatedCount, errorMessage: result.errorMessage },
    { status: result.status, headers: jsonHeaders }
  );
}
