import type { NextRequest } from 'next/server';

function cleanOrigin(value: string | null | undefined) {
  if (!value) return '';
  return value.replace(/\/$/, '');
}

export function getAppOrigin(request: NextRequest) {
  const configured = cleanOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;

  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  const host = request.headers.get('host');
  if (host && !host.startsWith('0.0.0.0')) {
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https';
    return `${protocol}://${host}`;
  }

  return new URL(request.url).origin;
}

export function appRedirect(request: NextRequest, pathname: string, params?: Record<string, string | undefined>) {
  const url = new URL(pathname, getAppOrigin(request));
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return url;
}
