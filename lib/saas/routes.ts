import type { UserRole } from '../supabase/roles';

export const publicRoutes = ['/', '/login', '/signup'] as const;
export const protectedRoutes = ['/app', '/admin', '/client', '/client/workspace'] as const;

export function isSafeInternalPath(value: string | null | undefined) {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'));
}

export function normalizeNextPath(value: string | null | undefined) {
  return isSafeInternalPath(value) ? value! : '/app';
}

export function dashboardForRole(role: UserRole | null | undefined) {
  return role === 'admin' ? '/admin' : '/client/workspace';
}

export function routeForSignedInUser(role: UserRole | null | undefined, requestedPath?: string | null) {
  const next = normalizeNextPath(requestedPath);
  const dashboard = dashboardForRole(role);

  if (next === '/app' || next === '/dashboard' || next === '/client') return dashboard;
  if (role === 'admin' && next.startsWith('/client')) return '/admin';
  if (role !== 'admin' && next.startsWith('/admin')) return '/client/workspace';

  return next;
}

export function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
