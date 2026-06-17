import { NextResponse } from 'next/server';
import { markDirectNotificationsRead } from '../../../../lib/notifications/notification-service';
import { createSupabaseServerClient } from '../../../../lib/supabase/server';

const jsonHeaders = {
  'Cache-Control': 'no-store'
};

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) {
    return NextResponse.json({ updatedCount: 0 }, { status: 401, headers: jsonHeaders });
  }

  const result = await markDirectNotificationsRead({ supabase, userId: user.id });

  return NextResponse.json(
    { updatedCount: result.updatedCount, errorMessage: result.errorMessage },
    { headers: jsonHeaders }
  );
}
