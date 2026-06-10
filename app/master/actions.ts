'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '../../lib/saas/session';
import type { AccountStatus, UserRole } from '../../lib/supabase/roles';

function valueFromForm(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

async function updateProfile(profileId: string, patch: Partial<{ role: UserRole; account_status: AccountStatus }>) {
  if (!profileId) return;

  const { supabase, user } = await requireRole('master');

  if (profileId === user.id && patch.account_status && patch.account_status !== 'active') {
    return;
  }

  await supabase
    .from('profiles')
    .update({
      ...patch,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileId);

  revalidatePath('/master');
  revalidatePath('/admin');
}

export async function promoteToAdmin(formData: FormData) {
  await updateProfile(valueFromForm(formData, 'profileId'), { role: 'admin', account_status: 'active' });
}

export async function demoteToClient(formData: FormData) {
  await updateProfile(valueFromForm(formData, 'profileId'), { role: 'client', account_status: 'active' });
}

export async function pauseAccount(formData: FormData) {
  await updateProfile(valueFromForm(formData, 'profileId'), { account_status: 'paused' });
}

export async function activateAccount(formData: FormData) {
  await updateProfile(valueFromForm(formData, 'profileId'), { account_status: 'active' });
}

export async function disableAccount(formData: FormData) {
  await updateProfile(valueFromForm(formData, 'profileId'), { account_status: 'disabled' });
}
