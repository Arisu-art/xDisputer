'use server';

import { revalidatePath } from 'next/cache';
import { updateManagedAccount } from '../../lib/saas/account-management';
import { requireRole } from '../../lib/saas/session';
import type { AccountStatus, UserRole } from '../../lib/supabase/roles';

function valueFromForm(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

async function updateProfile(formData: FormData, patch: { role?: Exclude<UserRole, 'master'>; account_status?: AccountStatus }) {
  const targetProfileId = valueFromForm(formData, 'profileId');
  const { supabase, user } = await requireRole('master');

  await updateManagedAccount(supabase, {
    actorUserId: user.id,
    actorRole: 'master',
    targetProfileId,
    nextRole: patch.role,
    nextStatus: patch.account_status
  });

  revalidatePath('/master');
  revalidatePath('/admin');
  revalidatePath('/api/account');
}

export async function promoteToAdmin(formData: FormData) {
  await updateProfile(formData, { role: 'admin', account_status: 'active' });
}

export async function demoteToClient(formData: FormData) {
  await updateProfile(formData, { role: 'client', account_status: 'active' });
}

export async function pauseAccount(formData: FormData) {
  await updateProfile(formData, { account_status: 'paused' });
}

export async function activateAccount(formData: FormData) {
  await updateProfile(formData, { account_status: 'active' });
}

export async function disableAccount(formData: FormData) {
  await updateProfile(formData, { account_status: 'disabled' });
}
