'use server';

import { revalidatePath } from 'next/cache';
import { updateManagedAccount } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';
import type { AccountStatus } from '../../lib/supabase/roles';

function valueFromForm(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

async function updateClientStatus(formData: FormData, account_status: AccountStatus) {
  const targetProfileId = valueFromForm(formData, 'profileId');
  const { supabase, user } = await requireRole('admin');

  await updateManagedAccount(supabase, {
    actorUserId: user.id,
    actorRole: 'admin',
    targetProfileId,
    nextStatus: account_status
  });

  revalidatePath('/admin');
  revalidatePath('/api/account');
}

export async function pauseClientAccount(formData: FormData) {
  await updateClientStatus(formData, 'paused');
}

export async function activateClientAccount(formData: FormData) {
  await updateClientStatus(formData, 'active');
}

export async function disableClientAccount(formData: FormData) {
  await updateClientStatus(formData, 'disabled');
}
