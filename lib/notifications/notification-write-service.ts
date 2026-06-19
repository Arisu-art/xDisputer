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

function isMissingOptionalColumn(message: string | undefined) {
  return Boolean(message && (message.includes('notifications.href') || message.includes('notifications.severity')));
}

async function insertNotification(input: CreateNotificationInput, includeHref: boolean, includeSeverity: boolean) {
  const record: Record<string, unknown> = {
    recipient_user_id: input.recipientUserId || null,
    recipient_role: input.recipientRole || null,
    title: input.title.trim().slice(0, 140),
    body: input.body ? input.body.trim().slice(0, 500) : null,
    created_by: input.createdBy
  };
  if (includeSeverity) record.severity = input.severity || 'info';
  if (includeHref) record.href = input.href || null;
  return input.supabase.from('notifications').insert(record);
}

export async function createNotification(input: CreateNotificationInput) {
  const title = input.title.trim().slice(0, 140);
  if (!title) return { ok: false, errorMessage: 'Notification title is required.' };
  if (!input.recipientUserId && !input.recipientRole) return { ok: false, errorMessage: 'Notification recipient is required.' };

  const attempts = [
    { href: true, severity: true },
    { href: false, severity: true },
    { href: false, severity: false }
  ];

  let lastError: string | null = null;
  for (const attempt of attempts) {
    const result = await insertNotification(input, attempt.href, attempt.severity);
    if (!result.error) return { ok: true, errorMessage: null };
    lastError = result.error.message;
    if (!isMissingOptionalColumn(result.error.message)) break;
  }

  return { ok: false, errorMessage: isMissingNotificationTable(lastError || undefined) ? null : lastError };
}
