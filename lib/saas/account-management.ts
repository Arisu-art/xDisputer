import type { AccountStatus, UserProfile, UserRole } from '../supabase/roles';
import { createSupabaseServerClient } from '../supabase/server';

export type ManagedAccount = Pick<
  UserProfile,
  'id' | 'email' | 'full_name' | 'role' | 'account_status' | 'manager_id' | 'manager_invite_code' | 'created_at' | 'updated_at'
>;
export type ManagementScope = 'master' | 'manager' | 'admin';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type AccountMutation = {
  actorUserId: string;
  actorRole: ManagementScope;
  targetProfileId: string;
  nextRole?: Exclude<UserRole, 'master' | 'admin'>;
  nextStatus?: AccountStatus;
  nextManagerId?: string | null;
};

const profileSelect = 'id,email,full_name,role,account_status,manager_id,manager_invite_code,created_at,updated_at';

function normalizeAccount(row: ManagedAccount): ManagedAccount {
  return {
    ...row,
    role: row.role === 'admin' ? 'manager' : row.role,
    account_status: row.account_status || 'active'
  };
}

export function generateInviteCode(seed: string) {
  const raw = `${seed}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(index)) | 0;
  }
  return `MGR-${Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 8)}`;
}

export async function listManagedAccounts(supabase: SupabaseServerClient, scope: ManagementScope, actorUserId?: string) {
  let query = supabase
    .from('profiles')
    .select(profileSelect)
    .order('created_at', { ascending: false });

  if (scope === 'admin' || scope === 'manager') {
    query = query.eq('role', 'client').eq('manager_id', actorUserId || '');
  }

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

  if ((input.actorRole === 'admin' || input.actorRole === 'manager') && targetAccount.role !== 'client') {
    throw new Error('Managers can only manage client accounts.');
  }

  if ((input.actorRole === 'admin' || input.actorRole === 'manager') && targetAccount.manager_id !== input.actorUserId) {
    throw new Error('Managers can only manage clients assigned to them.');
  }

  if (targetProfileId === input.actorUserId && input.nextStatus && input.nextStatus !== 'active') {
    throw new Error('You cannot disable your own active session.');
  }

  const patch: Partial<Pick<ManagedAccount, 'role' | 'account_status' | 'updated_at' | 'manager_id'>> = {
    updated_at: new Date().toISOString()
  };

  if (input.nextRole) patch.role = input.nextRole;
  if (input.nextStatus) patch.account_status = input.nextStatus;
  if (typeof input.nextManagerId !== 'undefined') patch.manager_id = input.nextManagerId;

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

export async function ensureManagerInviteCode(supabase: SupabaseServerClient, managerId: string) {
  const { data: manager, error } = await supabase
    .from('profiles')
    .select(profileSelect)
    .eq('id', managerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!manager) throw new Error('Manager profile not found.');

  const normalizedManager = normalizeAccount(manager as ManagedAccount);
  if (normalizedManager.manager_invite_code) return normalizedManager.manager_invite_code;

  const inviteCode = generateInviteCode(managerId);
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ manager_invite_code: inviteCode, updated_at: new Date().toISOString() })
    .eq('id', managerId)
    .select(profileSelect)
    .single();

  if (updateError) throw new Error(updateError.message);
  return (updated as ManagedAccount).manager_invite_code || inviteCode;
}

export async function rotateManagerInviteCode(supabase: SupabaseServerClient, managerId: string) {
  const inviteCode = generateInviteCode(managerId);
  const { data, error } = await supabase
    .from('profiles')
    .update({ manager_invite_code: inviteCode, updated_at: new Date().toISOString() })
    .eq('id', managerId)
    .in('role', ['manager', 'admin'])
    .select(profileSelect)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Manager invite code was not updated.');
  return inviteCode;
}

export async function joinManagerByInviteCode(supabase: SupabaseServerClient, clientId: string, inviteCode: string) {
  const code = inviteCode.trim().toUpperCase();
  if (!code) throw new Error('Invite code is required.');

  const { data: manager, error: managerError } = await supabase
    .from('profiles')
    .select(profileSelect)
    .eq('manager_invite_code', code)
    .in('role', ['manager', 'admin'])
    .eq('account_status', 'active')
    .maybeSingle();

  if (managerError) throw new Error(managerError.message);
  if (!manager) throw new Error('Manager invite code was not found or is inactive.');

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ manager_id: (manager as ManagedAccount).id, updated_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('role', 'client')
    .select(profileSelect)
    .single();

  if (updateError) throw new Error(updateError.message);
  if (!updated) throw new Error('Could not assign client to manager.');

  return normalizeAccount(updated as ManagedAccount);
}
