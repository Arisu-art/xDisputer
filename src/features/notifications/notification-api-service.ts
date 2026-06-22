import type { createSupabaseServerClient } from '../../../lib/supabase/server';
import { ensureUserProfile } from '../../../lib/supabase/roles';
import { clearDirectReadNotifications, listNotifications, markDirectNotificationsRead } from '../../../lib/notifications/notification-service';
import { normalizeNotificationRole } from '../../../lib/notifications/notification-types';

export type NotificationApiPayload = {
  notifications: Awaited<ReturnType<typeof listNotifications>>['notifications'];
  unreadCount: number;
  errorMessage: string | null;
  status: number;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function syncRecentManagerGeneratedOutput(supabase: SupabaseServerClient, managerId: string, role: string) {
  if (role !== 'manager') return;

  const clients = await supabase
    .from('profiles')
    .select('id')
    .eq('manager_id', managerId)
    .eq('role', 'client')
    .limit(100);

  if (clients.error || !clients.data?.length) return;
  const clientIds = clients.data.map((client) => client.id).filter(Boolean);
  if (!clientIds.length) return;

  const runs = await supabase
    .from('generation_runs')
    .select('id')
    .in('owner_id', clientIds)
    .eq('output_status', 'generated')
    .order('created_at', { ascending: false })
    .limit(25);

  if (runs.error || !runs.data?.length) return;

  for (const run of runs.data) {
    if (!run.id) continue;
    await supabase.rpc('sync_generation_output_activity_v1', { generation_run_id_input: run.id }).catch(() => null);
  }
}

export async function loadNotificationsForCurrentUser(supabase: SupabaseServerClient, limit = 8): Promise<NotificationApiPayload> {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return { notifications: [], unreadCount: 0, errorMessage: null, status: 401 };

  const profile = await ensureUserProfile(supabase, user);
  const role = normalizeNotificationRole(profile?.role);
  await syncRecentManagerGeneratedOutput(supabase, user.id, role);
  const result = await listNotifications({ supabase, userId: user.id, role, limit });

  return {
    notifications: result.notifications,
    unreadCount: result.unreadCount,
    errorMessage: result.errorMessage,
    status: 200
  };
}

export async function markNotificationsReadForCurrentUser(supabase: SupabaseServerClient) {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return { updatedCount: 0, errorMessage: null, status: 401 };

  const result = await markDirectNotificationsRead({ supabase, userId: user.id });
  return { updatedCount: result.updatedCount, errorMessage: result.errorMessage, status: 200 };
}

export async function clearReadNotificationsForCurrentUser(supabase: SupabaseServerClient) {
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user;
  if (!user) return { clearedCount: 0, errorMessage: null, status: 401 };

  const result = await clearDirectReadNotifications({ supabase, userId: user.id });
  return { clearedCount: result.clearedCount, errorMessage: result.errorMessage, status: 200 };
}
