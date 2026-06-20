'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { NotificationRecord } from '../../lib/notifications/notification-types';

type Payload = {
  notifications: NotificationRecord[];
  unreadCount: number;
  errorMessage?: string | null;
};

const dockStyle: CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 86,
  zIndex: 140
};

const buttonStyle: CSSProperties = {
  position: 'relative',
  display: 'grid',
  placeItems: 'center',
  width: 42,
  height: 42,
  border: '1px solid rgba(191, 219, 254, .9)',
  borderRadius: 15,
  background: 'rgba(239, 246, 255, .96)',
  color: '#1d4ed8',
  fontWeight: 950,
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(29, 78, 216, .12)'
};

const badgeStyle: CSSProperties = {
  position: 'absolute',
  top: -7,
  right: -7,
  minWidth: 19,
  height: 19,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 999,
  background: '#dc2626',
  color: '#fff',
  fontSize: 10
};

const popoverStyle: CSSProperties = {
  position: 'absolute',
  top: 52,
  right: 0,
  width: 'min(340px, calc(100vw - 32px))',
  display: 'grid',
  gap: 10,
  padding: 14,
  border: '1px solid rgba(203, 213, 225, .92)',
  borderRadius: 22,
  background: 'rgba(255, 255, 255, .98)',
  boxShadow: '0 24px 62px rgba(15, 23, 42, .18)'
};

const itemStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '11px 12px',
  border: '1px solid rgba(226, 232, 240, .96)',
  borderRadius: 16,
  background: '#f8fafc',
  color: '#0f172a',
  textDecoration: 'none'
};

const closeStyle: CSSProperties = {
  border: '1px solid rgba(203, 213, 225, .92)',
  borderRadius: 999,
  background: '#fff',
  color: '#334155',
  fontSize: 12,
  padding: '6px 10px',
  cursor: 'pointer'
};

export default function NotificationDock() {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<Payload>({ notifications: [], unreadCount: 0 });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/notifications?limit=8', { cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!cancelled && data) {
          setPayload({
            notifications: Array.isArray(data.notifications) ? data.notifications : [],
            unreadCount: Number(data.unreadCount || 0),
            errorMessage: data.errorMessage || null
          });
        }
      } catch {
        if (!cancelled) {
          setPayload({ notifications: [], unreadCount: 0, errorMessage: 'Notifications unavailable.' });
        }
      }
    }

    void load();
    const timer = window.setInterval(() => { void load(); }, 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return <div className="notification-dock" data-notification-dock="true" style={dockStyle}>
    <button
      type="button"
      className="notification-dock-button"
      style={buttonStyle}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label="Open notifications"
      onClick={() => setOpen((value) => !value)}
    >
      <span aria-hidden="true">🔔</span>
      {payload.unreadCount > 0 && <strong style={badgeStyle}>{payload.unreadCount > 9 ? '9+' : payload.unreadCount}</strong>}
    </button>

    {open && <section className="notification-dock-popover" style={popoverStyle} role="dialog" aria-label="Notifications">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <strong>Notifications</strong>
        <button type="button" style={closeStyle} onClick={() => setOpen(false)} aria-label="Close notifications">Close</button>
      </header>

      {payload.errorMessage && <p className="notification-dock-empty" style={{ color: '#64748b', margin: 0 }}>{payload.errorMessage}</p>}
      {!payload.errorMessage && payload.notifications.length === 0 && <p className="notification-dock-empty" style={{ color: '#64748b', margin: 0 }}>No notifications yet.</p>}
      {!payload.errorMessage && payload.notifications.map((item) => (
        <a key={item.id} className={`notification-dock-item ${item.severity}`} style={itemStyle} href={item.href || '#'}>
          <span style={{ fontWeight: 900 }}>{item.title}</span>
          {item.body && <small style={{ color: '#64748b' }}>{item.body}</small>}
        </a>
      ))}
    </section>}
  </div>;
}
