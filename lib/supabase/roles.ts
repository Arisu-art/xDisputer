import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './server';
import { dashboardForRole } from '../saas/routes';

export type UserRole = 'master' | 'manager' | 'admin' | 'client';
export type AccountStatus = 'active' | 'paused' | 'disabled';

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  account_status: AccountStatus | null;
  manager_id: string | null;
  manager_invite_code: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const bootstrapMasterEmails = new Set(['mycoquibuyen2002@gmail.com']);

export function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'admin') return 'manager';
  if (role === 'master' || role === 'manager' || role === 'client') return role;
  return 'client';
}

export function roleForEmail(email: string | null | undefined): UserRole {
  const normalizedEmail = email?.toLowerCase();
  return normalizedEmail && bootstrapMasterEmails.has(normalizedEmail) ? 'master' : 'client';
}

export function accountStatus(profile: UserProfile | null | undefined): AccountStatus {
  return profile?.account_status || 'active';
}

export function canAccessRole(currentRole: UserRole | null | undefined, requiredRole: UserRole) {
  const current = normalizeRole(currentRole);
  const required = normalizeRole(requiredRole);
  return current === required;
}

export async function ensureUserProfile(
  supabase: SupabaseServerClient,
  user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }
) {
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const expectedRole = roleForEmail(user.email);

  const { data: existing } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,account_status,manager_id,manager_invite_code,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    const currentRole = normalizeRole(existing.role);
    const patch: Partial<Pick<UserProfile, 'email' | 'role' | 'account_status'>> = {};

    if (!existing.email && user.email) patch.email = user.email;
    if (expectedRole === 'master' && currentRole !== 'master') patch.role = 'master';
    if (!existing.account_status) patch.account_status = 'active';

    if (Object.keys(patch).length) {
      const { data: updated } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', user.id)
        .select('id,email,full_name,role,account_status,manager_id,manager_invite_code,created_at,updated_at')
        .single();

      return updated ? ({ ...updated, role: normalizeRole(updated.role) } as UserProfile) : null;
    }

    return { ...existing, role: currentRole } as UserProfile;
  }

  const { data: created } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email || null,
      full_name: fullName,
      role: expectedRole,
      account_status: 'active'
    })
    .select('id,email,full_name,role,account_status,manager_id,manager_invite_code,created_at,updated_at')
    .single();

  return created ? ({ ...created, role: normalizeRole(created.role) } as UserProfile) : null;
}

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();

  if (!userResult.user) {
    return { user: null, profile: null, supabase };
  }

  const profile = await ensureUserProfile(supabase, userResult.user);

  return {
    user: userResult.user,
    profile,
    supabase
  };
}

export async function requireUser() {
  const value = await getCurrentUserProfile();

  if (!value.user) {
    redirect('/login');
  }

  if (accountStatus(value.profile) !== 'active') {
    redirect('/login?error=Account access is disabled. Contact your manager.');
  }

  return value;
}

export async function requireRole(role: UserRole) {
  const value = await requireUser();

  if (!canAccessRole(value.profile?.role, role)) {
    redirect(dashboardForRole(value.profile?.role));
  }

  return value;
}
