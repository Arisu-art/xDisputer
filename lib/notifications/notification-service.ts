import type { createSupabaseServerClient } from '../supabase/server';
import type { NotificationAudienceRole, NotificationRecord } from './notification-types';
import { normalizeNotificationSeverity } from './notification-types';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type RawNotificationRow = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  severity: string | null;
  read_at: string | null;
  created_at: string;
};

type ListNotificationsInput = {
  supabase: SupabaseServerClient;
  userId: string;
  role: NotificationAudienceRole;
  limit?: number;
};

function toNotificationRecord(row: RawNotificationRow): NotificationRecord {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    href: row.href,
    severity: normalizeNotificationSeverity(row.severity),
    read_at: row.read_at,
    created_at: row.created_at
  };
}

function safeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 12;
  return Math.max(1, Math.min(40, Math.floor(value || 12)));
}

export async function listNotifications({ supabase, userId, role, limit }: ListNotificationsInput) {
  const cappedLimit = safeLimit(limit);
  const direct = await supabase
    .from('notifications')
    .select('id,title,body,href,severity,read_at,created_at')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(cappedLimit);

  const roleWide = await supabase
    .from('notifications')
    .select('id,title,body,href,severity,read_at,created_at')
    .eq('recipient_role', role)
    .order('created_at', { ascending: false })
    .limit(cappedLimit);

  if (direct.error || roleWide.error) {
    return {
      notifications: [] as NotificationRecord[],
      unreadCount: 0,
      errorMessage: direct.error?.message || roleWide.error?.message || 'Notification query failed.'
    };
  }

  const merged = [...((direct.data || []) as RawNotificationRow[]), ...((roleWide.data || []) as RawNotificationRow[])];
  const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values())
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, cappedLimit);
  const notifications = unique.map(toNotificationRecord);
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return { notifications, unreadCount, errorMessage: null };
}

export async function markDirectNotificationsRead({ supabase, userId }: { supabase: SupabaseServerClient; userId: string }) {
  const result = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', userId)
    .is('read_at', null)
    .select('id', { count: 'exact', head: true });

  if (result.error) return { updatedCount: 0, errorMessage: result.error.message };
  return { updatedCount: result.count || 0, errorMessage: null };
}
