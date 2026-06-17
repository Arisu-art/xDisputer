import { NextResponse } from 'next/server';
import { listNotifications } from '../../../lib/notifications/notification-service';
import { normalizeNotificationRole } from '../../../lib/notifications/notification-types';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { ensureUserProfile } from '../../../lib/supabase/roles';

const jsonHeaders = {
  'Cache-Control': 'no-store'
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;

  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 401, headers: jsonHeaders });
  }

  const profile = await ensureUserProfile(supabase, user);
  const role = normalizeNotificationRole(profile?.role);
  const result = await listNotifications({ supabase, userId: user.id, role, limit: 12 });

  return NextResponse.json(
    { notifications: result.notifications, unreadCount: result.unreadCount, errorMessage: result.errorMessage },
    { headers: jsonHeaders }
  );
}
