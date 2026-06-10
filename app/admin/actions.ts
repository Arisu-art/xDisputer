'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '../../lib/saas/session';
import type { AccountStatus } from '../../lib/supabase/roles';

function valueFromForm(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim();
}

async function updateClientStatus(profileId: string, account_status: AccountStatus) {
  if (!profileId) return;

  const { supabase } = await requireRole('admin');

  await supabase
    .from('profiles')
    .update({
      account_status,
      updated_at: new Date().toISOString()
    })
    .eq('id', profileId)
    .eq('role', 'client');

  revalidatePath('/admin');
}

export async function pauseClientAccount(formData: FormData) {
  await updateClientStatus(valueFromForm(formData, 'profileId'), 'paused');
}

export async function activateClientAccount(formData: FormData) {
  await updateClientStatus(valueFromForm(formData, 'profileId'), 'active');
}

export async function disableClientAccount(formData: FormData) {
  await updateClientStatus(valueFromForm(formData, 'profileId'), 'disabled');
}
