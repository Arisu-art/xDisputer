import type { AccountStatus, UserProfile, UserRole } from '../supabase/roles';
import { createSupabaseServerClient } from '../supabase/server';

export type ManagedAccount = Pick<UserProfile, 'id' | 'email' | 'full_name' | 'role' | 'account_status' | 'created_at' | 'updated_at'>;
export type ManagementScope = 'master' | 'admin';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type AccountMutation = {
  actorUserId: string;
  actorRole: ManagementScope;
  targetProfileId: string;
  nextRole?: Exclude<UserRole, 'master'>;
  nextStatus?: AccountStatus;
};

const profileSelect = 'id,email,full_name,role,account_status,created_at,updated_at';

function normalizeAccount(row: ManagedAccount): ManagedAccount {
  return {
    ...row,
    account_status: row.account_status || 'active'
  };
}

export async function listManagedAccounts(supabase: SupabaseServerClient, scope: ManagementScope) {
  let query = supabase
    .from('profiles')
    .select(profileSelect)
    .order('created_at', { ascending: false });

  if (scope === 'admin') query = query.eq('role', 'client');

  const { data, error } = await query;

  return {
    accounts: Array.isArray(data) ? (data as ManagedAccount[]).map(normalizeAccount) : [],
    errorMessage: error?.message || null
  };
}

export async function updateManagedAccount(supabase: SupabaseServerClient, input: AccountMutation) {
  const targetProfileId = input.targetProfileId.trim();

  if (!targetProfileId) throw new Error('Missing target profile id.');

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select(profileSelect)
    .eq('id', targetProfileId)
    .maybeSingle();

  if (targetError) throw new Error(targetError.message);
  if (!target) throw new Error('Target account was not found or your role does not have access to it.');

  const targetAccount = normalizeAccount(target as ManagedAccount);

  if (targetAccount.role === 'master') {
    throw new Error('Master accounts cannot be modified from account controls.');
  }

  if (input.actorRole === 'admin' && targetAccount.role !== 'client') {
    throw new Error('Admins can only manage client accounts.');
  }

  if (targetProfileId === input.actorUserId && input.nextStatus && input.nextStatus !== 'active') {
    throw new Error('You cannot pause or disable your own active session.');
  }

  const patch: Partial<Pick<ManagedAccount, 'role' | 'account_status' | 'updated_at'>> = {
    updated_at: new Date().toISOString()
  };

  if (input.nextRole) patch.role = input.nextRole;
  if (input.nextStatus) patch.account_status = input.nextStatus;

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', targetProfileId)
    .select(profileSelect)
    .single();

  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error('Account update did not return a profile row.');

  return normalizeAccount(updated as ManagedAccount);
}
