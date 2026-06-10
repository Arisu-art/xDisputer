import type { UserRole } from '../supabase/roles';

export const publicRoutes = ['/', '/login', '/signup'] as const;
export const protectedRoutes = ['/app', '/master', '/admin', '/workspace', '/client', '/client/workspace'] as const;

export function isSafeInternalPath(value: string | null | undefined) {
  return Boolean(value && value.startsWith('/') && !value.startsWith('//'));
}

export function normalizeNextPath(value: string | null | undefined) {
  return isSafeInternalPath(value) ? value! : '/app';
}

export function dashboardForRole(role: UserRole | null | undefined) {
  if (role === 'master') return '/master';
  if (role === 'admin') return '/admin';
  return '/workspace';
}

export function routeForSignedInUser(role: UserRole | null | undefined, requestedPath?: string | null) {
  const next = normalizeNextPath(requestedPath);
  const dashboard = dashboardForRole(role);

  if (next === '/app' || next === '/dashboard' || next === '/client' || next === '/client/workspace') {
    return dashboard;
  }

  if (role === 'master') return next;

  if (role === 'admin' && (next === '/master' || next.startsWith('/master/') || next === '/workspace' || next.startsWith('/workspace/'))) {
    return '/admin';
  }

  if (role === 'client' && (next === '/master' || next.startsWith('/master/') || next === '/admin' || next.startsWith('/admin/'))) {
    return '/workspace';
  }

  return next;
}

export function isProtectedPath(pathname: string) {
  return protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}
