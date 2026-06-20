'use client';

import { useEffect, useState } from 'react';
import type { NotificationRecord } from '../../lib/notifications/notification-types';
import { notificationOwnershipContract } from '../../src/features/notifications/notification-ownership-contract';

type Payload = {
  notifications: NotificationRecord[];
  unreadCount: number;
  errorMessage?: string | null;
};

export default function OwnedNotificationDock() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload>({ notifications: [], unreadCount: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/notifications?limit=${notificationOwnershipContract.maxVisibleItems}`, { cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!cancelled && data) {
          setPayload({
            notifications: Array.isArray(data.notifications) ? data.notifications : [],
            unreadCount: Number(data.unreadCount || 0),
            errorMessage: data.errorMessage || null
          });
        }
      } catch {
        if (!cancelled) setPayload({ notifications: [], unreadCount: 0, errorMessage: 'Notifications unavailable.' });
      }
    }

    void load();
    const timer = window.setInterval(() => { void load(); }, notificationOwnershipContract.pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!open || payload.unreadCount < 1) return;
    void fetch(notificationOwnershipContract.readEndpoint, { method: 'POST' }).catch(() => null);
    setPayload((current) => ({ ...current, unreadCount: 0 }));
  }, [open, payload.unreadCount]);

  return <div className="notification-dock" data-notification-dock="true">
    <button type="button" className="notification-dock-button" aria-haspopup="dialog" aria-expanded={open} aria-label="Open notifications" onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">🔔</span>
      {payload.unreadCount > 0 && <strong className="notification-dock-badge">{payload.unreadCount > 9 ? '9+' : payload.unreadCount}</strong>}
    </button>
    {open && <section className="notification-dock-popover" role="dialog" aria-label="Notifications">
      <header className="notification-dock-header">
        <strong>Notifications</strong>
        <button type="button" className="notification-dock-close" onClick={() => setOpen(false)} aria-label="Close notifications">Close</button>
      </header>
      {payload.errorMessage && <p className="notification-dock-empty">{payload.errorMessage}</p>}
      {!payload.errorMessage && payload.notifications.length === 0 && <p className="notification-dock-empty">No notifications yet.</p>}
      {!payload.errorMessage && payload.notifications.map((item) => (
        <a key={item.id} className={`notification-dock-item ${item.severity}`} href={item.href || '#'}>
          <span style={{ fontWeight: 900 }}>{item.title}</span>
          {item.body && <small>{item.body}</small>}
        </a>
      ))}
    </section>}
  </div>;
}
