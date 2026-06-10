import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './server';
import { dashboardForRole } from '../saas/routes';

export type UserRole = 'admin' | 'client';

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export async function ensureUserProfile(supabase: SupabaseServerClient, user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const fullName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';

  const { data: existing } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at,updated_at')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    if (!existing.email && user.email) {
      const { data: updated } = await supabase
        .from('profiles')
        .update({ email: user.email })
        .eq('id', user.id)
        .select('id,email,full_name,role,created_at,updated_at')
        .single();
      return updated as UserProfile | null;
    }

    return existing as UserProfile;
  }

  const { data: created } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email || null,
      full_name: fullName,
      role: 'client'
    })
    .select('id,email,full_name,role,created_at,updated_at')
    .single();

  return created as UserProfile | null;
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

  return value;
}

export async function requireRole(role: UserRole) {
  const value = await requireUser();

  if (value.profile?.role !== role) {
    redirect(dashboardForRole(value.profile?.role));
  }

  return value;
}
