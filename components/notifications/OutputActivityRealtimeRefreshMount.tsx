'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '../../lib/supabase/browser';
import { notificationOwnershipContract } from '../../src/features/notifications/notification-ownership-contract';

const OUTPUT_ACTIVITY_PATH = '/admin/output-activity-v2';

export default function OutputActivityRealtimeRefreshMount() {
  const pathname = usePathname();
  const router = useRouter();
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (pathname !== OUTPUT_ACTIVITY_PATH) return;

    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    function scheduleRefresh() {
      if (cancelled) return;
      if (refreshTimer.current) return;
      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        router.refresh();
      }, 350);
    }

    const polling = window.setInterval(scheduleRefresh, notificationOwnershipContract.pollIntervalMs);

    void supabase.auth.getUser().then(({ data }) => {
      const managerId = data.user?.id;
      if (!managerId || cancelled) return;
      const channel = supabase
        .channel(`output-activity-realtime-${managerId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'manager_disputer_output_approvals', filter: `manager_id=eq.${managerId}` },
          scheduleRefresh
        )
        .subscribe();

      const cleanupRealtime = () => { void supabase.removeChannel(channel); };
      window.addEventListener('beforeunload', cleanupRealtime, { once: true });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      window.clearInterval(polling);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeAllChannels();
    };
  }, [pathname, router]);

  return null;
}
