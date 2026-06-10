import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from './server';

export type UserRole = 'admin' | 'client';

export type UserProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export async function getCurrentUserProfile() {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();

  if (!userResult.user) {
    return { user: null, profile: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,full_name,role,created_at,updated_at')
    .eq('id', userResult.user.id)
    .single();

  return {
    user: userResult.user,
    profile: profile as UserProfile | null
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
    redirect('/client');
  }

  return value;
}
