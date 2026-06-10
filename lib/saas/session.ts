import { redirect } from 'next/navigation';
import { dashboardForRole } from './routes';
import { createSupabaseServerClient } from '../supabase/server';
import { ensureUserProfile, roleForEmail, type UserProfile, type UserRole } from '../supabase/roles';

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type SupabaseUser = NonNullable<Awaited<ReturnType<SupabaseServerClient['auth']['getUser']>>['data']['user']>;

export type SessionContext = {
  supabase: SupabaseServerClient;
  user: SupabaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isClient: boolean;
  dashboardPath: '/admin' | '/workspace';
};

function resolveRole(user: SupabaseUser | null, profile: UserProfile | null): UserRole | null {
  if (!user) return null;

  const emailRole = roleForEmail(user.email || profile?.email);
  if (emailRole === 'admin') return 'admin';

  return profile?.role || 'client';
}

export async function getSessionContext(): Promise<SessionContext> {
  const supabase = await createSupabaseServerClient();
  const { data: userResult } = await supabase.auth.getUser();
  const user = userResult.user ?? null;
  const profile = user ? await ensureUserProfile(supabase, user) : null;
  const role = resolveRole(user, profile);
  const dashboardPath = dashboardForRole(role) as '/admin' | '/workspace';

  return {
    supabase,
    user,
    profile,
    role,
    isAdmin: role === 'admin',
    isClient: role === 'client',
    dashboardPath
  };
}

export async function requireAuth() {
  const session = await getSessionContext();

  if (!session.user) {
    redirect('/login?next=/app');
  }

  return session as SessionContext & { user: SupabaseUser };
}

export async function requireRole(requiredRole: UserRole) {
  const session = await requireAuth();

  if (session.role !== requiredRole) {
    redirect(session.dashboardPath);
  }

  return session as SessionContext & { user: SupabaseUser; role: UserRole };
}
