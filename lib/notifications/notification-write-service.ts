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

export function isMissingOptionalColumn(message: string | undefined, column: string) {
  return Boolean(message && message.includes(column) && (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('Could not find')
  ));
}

function buildNotificationRecord(input: CreateNotificationInput) {
  const record: Record<string, unknown> = {
    recipient_user_id: input.recipientUserId || null,
    title: input.title.trim().slice(0, 140),
    body: input.body ? input.body.trim().slice(0, 500) : null,
    href: input.href || null,
    severity: input.severity || 'info',
    created_by: input.createdBy
  };

  if (input.recipientRole) record.recipient_role = input.recipientRole;
  return record;
}

export async function createNotification(input: CreateNotificationInput) {
  const title = input.title.trim().slice(0, 140);
  if (!title) return { ok: false, errorMessage: 'Notification title is required.' };
  if (!input.recipientUserId && !input.recipientRole) {
    return { ok: false, errorMessage: 'Notification recipient is required.' };
  }

  const record = buildNotificationRecord({ ...input, title });
  const result = await input.supabase.from('notifications').insert(record);
  if (!result.error) return { ok: true, errorMessage: null };

  if (isMissingNotificationTable(result.error.message)) {
    return { ok: false, errorMessage: null };
  }

  if (isMissingOptionalColumn(result.error.message, 'recipient_role')) {
    if (!input.recipientUserId) {
      return { ok: true, errorMessage: null };
    }

    const retryRecord = { ...record };
    delete retryRecord.recipient_role;
    const retry = await input.supabase.from('notifications').insert(retryRecord);
    if (!retry.error) return { ok: true, errorMessage: null };
    if (isMissingNotificationTable(retry.error.message)) {
      return { ok: false, errorMessage: null };
    }
    return { ok: false, errorMessage: retry.error.message };
  }

  return {
    ok: false,
    errorMessage: result.error.message
  };
}
