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
    href: row.href || null,
    severity: normalizeNotificationSeverity(row.severity),
    read_at: row.read_at,
    created_at: row.created_at
  };
}

function safeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 12;
  return Math.max(1, Math.min(40, Math.floor(value || 12)));
}

function uniqueIds(ids: unknown, limit = 40) {
  if (!Array.isArray(ids)) return [] as string[];
  return Array.from(new Set(ids.filter((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) as string[])).slice(0, limit);
}

function buildNotificationsQuery(input: {
  supabase: SupabaseServerClient;
  column: 'recipient_user_id' | 'recipient_role';
  value: string;
  limit: number;
}) {
  return input.supabase
    .from('notifications')
    .select('id,title,body,href,severity,read_at,created_at')
    .eq(input.column, input.value)
    .order('created_at', { ascending: false })
    .limit(input.limit);
}

async function queryNotifications(input: {
  supabase: SupabaseServerClient;
  column: 'recipient_user_id' | 'recipient_role';
  value: string;
  limit: number;
}) {
  const result = await buildNotificationsQuery(input);
  if (result.error) {
    return { data: [] as RawNotificationRow[], error: result.error };
  }

  return {
    data: (result.data || []) as RawNotificationRow[],
    error: null
  };
}

async function unreadCount(input: {
  supabase: SupabaseServerClient;
  column: 'recipient_user_id' | 'recipient_role';
  value: string;
}) {
  const result = await input.supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq(input.column, input.value)
    .is('read_at', null);

  return result.error ? { count: 0, error: result.error } : { count: result.count || 0, error: null };
}

export async function listNotifications({ supabase, userId, role, limit }: ListNotificationsInput) {
  const cappedLimit = safeLimit(limit);

  const direct = await queryNotifications({
    supabase,
    column: 'recipient_user_id',
    value: userId,
    limit: cappedLimit
  });

  if (direct.error) {
    return {
      notifications: [] as NotificationRecord[],
      unreadCount: 0,
      errorMessage: direct.error.message
    };
  }

  const roleWide = await queryNotifications({
    supabase,
    column: 'recipient_role',
    value: role,
    limit: cappedLimit
  });

  if (roleWide.error) {
    return {
      notifications: [] as NotificationRecord[],
      unreadCount: 0,
      errorMessage: roleWide.error.message
    };
  }

  const merged = [
    ...(direct.data || []),
    ...(roleWide.data || [])
  ];

  const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values())
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, cappedLimit);

  const notifications = unique.map(toNotificationRecord);
  const directUnread = await unreadCount({ supabase, column: 'recipient_user_id', value: userId });
  const roleUnread = await unreadCount({ supabase, column: 'recipient_role', value: role });
  const exactUnread = directUnread.error || roleUnread.error
    ? notifications.filter((item) => !item.read_at).length
    : Math.max(notifications.filter((item) => !item.read_at).length, directUnread.count + roleUnread.count);

  return { notifications, unreadCount: exactUnread, errorMessage: null };
}

export async function markDirectNotificationsRead({
  supabase,
  userId,
  ids
}: {
  supabase: SupabaseServerClient;
  userId: string;
  ids?: unknown;
}) {
  const scopedIds = uniqueIds(ids);
  let query = supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', userId)
    .is('read_at', null);

  if (scopedIds.length) query = query.in('id', scopedIds);

  const result = await query.select('id');

  if (result.error) return { updatedCount: 0, errorMessage: result.error.message };
  return { updatedCount: result.data ? result.data.length : 0, errorMessage: null };
}

export async function clearDirectReadNotifications({
  supabase,
  userId
}: {
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const result = await supabase
    .from('notifications')
    .delete()
    .eq('recipient_user_id', userId)
    .not('read_at', 'is', null)
    .select('id');

  if (result.error) return { clearedCount: 0, errorMessage: result.error.message };
  return { clearedCount: result.data ? result.data.length : 0, errorMessage: null };
}
