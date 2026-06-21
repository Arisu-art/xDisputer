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

type MinimalNotificationRow = Pick<RawNotificationRow, 'id' | 'title' | 'created_at'>;

type ListNotificationsInput = {
  supabase: SupabaseServerClient;
  userId: string;
  role: NotificationAudienceRole;
  limit?: number;
};

const fullSelect = 'id,title,body,href,severity,read_at,created_at';
const fallbackSelect = 'id,title,created_at';
const projectionOptionalColumns = ['body', 'href', 'severity', 'read_at'];

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

function withFallbackProjection(row: MinimalNotificationRow): RawNotificationRow {
  return {
    id: row.id,
    title: row.title,
    body: null,
    href: null,
    severity: null,
    read_at: null,
    created_at: row.created_at
  };
}

function safeLimit(value: number | undefined) {
  if (!Number.isFinite(value)) return 12;
  return Math.max(1, Math.min(40, Math.floor(value || 12)));
}

export function missingOptionalColumn(message: string | undefined, column: string) {
  return Boolean(message && message.includes(column) && (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('Could not find')
  ));
}

function hasProjectionDrift(message: string | undefined) {
  return projectionOptionalColumns.some((column) => missingOptionalColumn(message, column));
}

function buildNotificationsQuery(input: {
  supabase: SupabaseServerClient;
  column: 'recipient_user_id' | 'recipient_role';
  value: string;
  limit: number;
  select: string;
}) {
  return input.supabase
    .from('notifications')
    .select(input.select)
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
  const full = await buildNotificationsQuery({ ...input, select: fullSelect });
  if (!full.error) {
    return {
      data: (full.data || []) as RawNotificationRow[],
      error: null
    };
  }

  if (input.column === 'recipient_role' && missingOptionalColumn(full.error.message, 'recipient_role')) {
    return { data: [] as RawNotificationRow[], error: null };
  }

  if (!hasProjectionDrift(full.error.message)) {
    return { data: [] as RawNotificationRow[], error: full.error };
  }

  const minimal = await buildNotificationsQuery({ ...input, select: fallbackSelect });
  if (minimal.error) {
    return { data: [] as RawNotificationRow[], error: minimal.error };
  }

  return {
    data: ((minimal.data || []) as MinimalNotificationRow[]).map(withFallbackProjection),
    error: null
  };
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
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  return { notifications, unreadCount, errorMessage: null };
}

export async function markDirectNotificationsRead({
  supabase,
  userId
}: {
  supabase: SupabaseServerClient;
  userId: string;
}) {
  const result = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', userId)
    .is('read_at', null)
    .select('id');

  if (result.error) return { updatedCount: 0, errorMessage: result.error.message };
  return { updatedCount: result.data ? result.data.length : 0, errorMessage: null };
}
