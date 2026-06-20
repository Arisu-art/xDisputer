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
  return Boolean(message && (
    message.includes('notifications') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  ));
}

export async function createNotification(input: CreateNotificationInput) {
  const title = input.title.trim().slice(0, 140);
  if (!title) return { ok: false, errorMessage: 'Notification title is required.' };
  if (!input.recipientUserId && !input.recipientRole) {
    return { ok: false, errorMessage: 'Notification recipient is required.' };
  }

  const record: Record<string, unknown> = {
    recipient_user_id: input.recipientUserId || null,
    recipient_role: input.recipientRole || null,
    title,
    body: input.body ? input.body.trim().slice(0, 500) : null,
    href: input.href || null,
    severity: input.severity || 'info',
    created_by: input.createdBy
  };

  const result = await input.supabase.from('notifications').insert(record);
  if (!result.error) return { ok: true, errorMessage: null };

  return {
    ok: false,
    errorMessage: isMissingNotificationTable(result.error.message) ? null : result.error.message
  };
}
