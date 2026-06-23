'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '../../lib/supabase/browser';

function debounceRefresh(router: ReturnType<typeof useRouter>) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastRefreshAt = 0;
  return () => {
    if (timer) return;
    const elapsed = Date.now() - lastRefreshAt;
    const delay = elapsed > 1400 ? 350 : 1400 - elapsed;
    timer = window.setTimeout(() => {
      timer = null;
      lastRefreshAt = Date.now();
      router.refresh();
    }, delay);
  };
}

export default function ManagerConsoleRealtimeRefreshMount() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const refresh = debounceRefresh(router);
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    const onVisibility = () => {
      if (!document.hidden) refresh();
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    window.addEventListener('xdisputer:output-entitlement-updated', refresh);
    window.addEventListener('xdisputer:output-entitlement-refresh', refresh);
    window.addEventListener('xdisputer:route-refresh', refresh);
    document.addEventListener('visibilitychange', onVisibility);

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user?.id) return;
      channel = supabase.channel(`manager-console-live-sync-${data.user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'generation_runs' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_entitlement_limits' }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'manager_user_settings', filter: `manager_id=eq.${data.user.id}` }, refresh)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'client_manager_assignments', filter: `manager_id=eq.${data.user.id}` }, refresh)
        .subscribe();
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      window.removeEventListener('xdisputer:output-entitlement-updated', refresh);
      window.removeEventListener('xdisputer:output-entitlement-refresh', refresh);
      window.removeEventListener('xdisputer:route-refresh', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
