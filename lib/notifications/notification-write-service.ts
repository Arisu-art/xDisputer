import type { createSupabaseServerClient } from '../supabase/server';
import type { NotificationAudienceRole, NotificationSeverity } from './notification-types';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type CreateNotificationInput = {
  supabase: SupabaseServerClient;
  createdBy: string;
  recipientUserId?: string | null;
  recipientRole?: NotificationAudienceRole | null;
  title: string;
  body?: string | null;
  href?: string | null;
  severity?: NotificationSeverity;
};

function isMissingNotificationTable(message: string | undefined) {
  return Boolean(message && (message.includes('notifications') || message.includes('schema cache') || message.includes('does not exist')));
}

function isMissingHrefColumn(message: string | undefined) {
  return Boolean(message && message.includes('notifications.href'));
}

export async function createNotification(input: CreateNotificationInput) {
  const title = input.title.trim().slice(0, 140);
  if (!title) return { ok: false, errorMessage: 'Notification title is required.' };
  if (!input.recipientUserId && !input.recipientRole) return { ok: false, errorMessage: 'Notification recipient is required.' };

  const baseRecord = {
    recipient_user_id: input.recipientUserId || null,
    recipient_role: input.recipientRole || null,
    title,
    body: input.body ? input.body.trim().slice(0, 500) : null,
    severity: input.severity || 'info',
    created_by: input.createdBy
  };

  const result = await input.supabase.from('notifications').insert({
    ...baseRecord,
    href: input.href || null
  });

  if (result.error && isMissingHrefColumn(result.error.message)) {
    const fallback = await input.supabase.from('notifications').insert(baseRecord);
    if (fallback.error) return { ok: false, errorMessage: isMissingNotificationTable(fallback.error.message) ? null : fallback.error.message };
    return { ok: true, errorMessage: null };
  }

  if (result.error) {
    return { ok: false, errorMessage: isMissingNotificationTable(result.error.message) ? null : result.error.message };
  }

  return { ok: true, errorMessage: null };
}
