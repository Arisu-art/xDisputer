import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabase/server';
import { loadNotificationsForCurrentUser } from '../../../src/features/notifications/notification-api-service';

const jsonHeaders = {
  'Cache-Control': 'no-store'
};

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const result = await loadNotificationsForCurrentUser(supabase, 12);

  if (result.status === 401) {
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 401, headers: jsonHeaders });
  }

  return NextResponse.json({ notifications: result.notifications, unreadCount: result.unreadCount, errorMessage: result.errorMessage }, { headers: jsonHeaders });
}
