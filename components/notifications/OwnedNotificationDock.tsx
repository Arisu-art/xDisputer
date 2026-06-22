'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { NotificationRecord } from '../../lib/notifications/notification-types';
import { createSupabaseBrowserClient } from '../../lib/supabase/browser';
import { notificationOwnershipContract } from '../../src/features/notifications/notification-ownership-contract';

type Payload = {
  notifications: NotificationRecord[];
  unreadCount: number;
  errorMessage?: string | null;
  syncErrorMessage?: string | null;
  serverTime?: string | null;
};

const OWNED_NOTIFICATION_DOCK_CSS = `
  .notification-dock[data-notification-dock="true"] { position: relative; z-index: 3; }
  .notification-dock-button { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(191, 219, 254, .9); border-radius: 15px; background: rgba(239, 246, 255, .96); color: #1d4ed8; font-weight: 950; cursor: pointer; box-shadow: 0 10px 24px rgba(29, 78, 216, .12); }
  .notification-dock-badge { position: absolute; top: -7px; right: -7px; min-width: 19px; height: 19px; display: grid; place-items: center; border-radius: 999px; background: #dc2626; color: #fff; font-size: 10px; }
  .notification-dock-popover { position: absolute; top: 52px; right: 0; width: min(360px, calc(100vw - 32px)); display: grid; gap: 10px; padding: 14px; border: 1px solid rgba(203, 213, 225, .92); border-radius: 22px; background: rgba(255, 255, 255, .98); box-shadow: 0 24px 62px rgba(15, 23, 42, .18); }
  .notification-dock-header, .notification-dock-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .notification-dock-actions { justify-content: flex-start; flex-wrap: wrap; }
  .notification-dock-item { display: grid; gap: 4px; padding: 11px 12px; border: 1px solid rgba(226, 232, 240, .96); border-radius: 16px; background: #f8fafc; color: #0f172a; text-decoration: none; }
  .notification-dock-item.unread { border-color: rgba(96, 165, 250, .85); background: #eff6ff; }
  .notification-dock-close, .notification-dock-action { border: 1px solid rgba(203, 213, 225, .92); border-radius: 999px; background: #fff; color: #334155; font-size: 12px; font-weight: 850; padding: 6px 10px; cursor: pointer; }
  .notification-dock-action.danger { color: #b91c1c; border-color: rgba(248, 113, 113, .5); background: #fff1f2; }
  .notification-dock-empty, .notification-dock-item small { color: #64748b; margin: 0; }
  .notification-dock-sync-warning { margin: 0; padding: 9px 10px; border: 1px solid rgba(251, 191, 36, .7); border-radius: 14px; background: #fffbeb; color: #92400e; font-size: 12px; font-weight: 750; }
`;

export default function OwnedNotificationDock() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload>({ notifications: [], unreadCount: 0 });
  const loadingRef = useRef(false);

  const load = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const response = await fetch(`/api/notifications?limit=${notificationOwnershipContract.maxVisibleItems}&t=${Date.now()}`, {
        cache: 'no-store',
        headers: { accept: 'application/json', 'cache-control': 'no-store' }
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        setPayload({ notifications: [], unreadCount: 0, errorMessage: 'Sign in again to load notifications.' });
        return;
      }
      if (data) {
        const nextPayload = {
          notifications: Array.isArray(data.notifications) ? data.notifications : [],
          unreadCount: Number(data.unreadCount || 0),
          errorMessage: data.errorMessage || null,
          syncErrorMessage: data.syncErrorMessage || null,
          serverTime: data.serverTime || null
        };
        setPayload(nextPayload);
        if (nextPayload.unreadCount > 0 || nextPayload.notifications.length > 0) {
          window.dispatchEvent(new CustomEvent('xdisputer:route-refresh'));
        }
      }
    } catch {
      setPayload({ notifications: [], unreadCount: 0, errorMessage: 'Notifications unavailable.' });
    } finally {
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: RealtimeChannel | null = null;
    const supabase = createSupabaseBrowserClient();

    function scheduleLoad() {
      if (cancelled || refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void load();
      }, 250);
    }

    void load();
    const steadyTimer = window.setInterval(() => { void load(); }, notificationOwnershipContract.pollIntervalMs);
    const warmupTimer = window.setInterval(scheduleLoad, 5000);
    const stopWarmup = window.setTimeout(() => window.clearInterval(warmupTimer), 60_000);

    const focusHandler = () => scheduleLoad();
    const visibilityHandler = () => { if (!document.hidden) scheduleLoad(); };
    window.addEventListener('focus', focusHandler);
    window.addEventListener('online', focusHandler);
    document.addEventListener('visibilitychange', visibilityHandler);

    void supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId || cancelled) return;
      channel = supabase
        .channel(`owned-notifications-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${userId}` },
          scheduleLoad
        )
        .subscribe((status) => { if (status === 'SUBSCRIBED') scheduleLoad(); });
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      window.clearInterval(steadyTimer);
      window.clearInterval(warmupTimer);
      window.clearTimeout(stopWarmup);
      if (refreshTimer) window.clearTimeout(refreshTimer);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('online', focusHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function markAllRead() {
    await fetch(notificationOwnershipContract.readEndpoint, { method: 'POST' }).catch(() => null);
    await load();
  }

  async function clearReadOnly() {
    await fetch(notificationOwnershipContract.clearReadEndpoint, { method: 'DELETE' }).catch(() => null);
    await load();
  }

  return <div className="notification-dock" data-notification-dock="true" data-notification-realtime="postgres-changes-with-fast-poll-fallback">
    <style data-notification-dock-owner="true">{OWNED_NOTIFICATION_DOCK_CSS}</style>
    <button type="button" className="notification-dock-button" aria-haspopup="dialog" aria-expanded={open} aria-label="Open notifications" onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">🔔</span>
      {payload.unreadCount > 0 && <strong className="notification-dock-badge">{payload.unreadCount > 9 ? '9+' : payload.unreadCount}</strong>}
    </button>
    {open && <section className="notification-dock-popover" role="dialog" aria-label="Notifications">
      <header className="notification-dock-header"><strong>Notifications</strong><button type="button" className="notification-dock-close" onClick={() => setOpen(false)} aria-label="Close notifications">Close</button></header>
      <div className="notification-dock-actions" aria-label="Notification actions"><button type="button" className="notification-dock-action" onClick={markAllRead}>Mark all read</button><button type="button" className="notification-dock-action danger" onClick={clearReadOnly}>Clear read only</button></div>
      {payload.syncErrorMessage && <p className="notification-dock-sync-warning">Sync warning: {payload.syncErrorMessage}</p>}
      {payload.errorMessage && <p className="notification-dock-empty">{payload.errorMessage}</p>}
      {!payload.errorMessage && payload.notifications.length === 0 && <p className="notification-dock-empty">No notifications yet.</p>}
      {!payload.errorMessage && payload.notifications.map((item) => (<a key={item.id} className={`notification-dock-item ${item.severity} ${item.read_at ? 'read' : 'unread'}`} href={item.href || '#'}><span style={{ fontWeight: 900 }}>{item.title}</span>{item.body && <small>{item.body}</small>}</a>))}
    </section>}
  </div>;
}
