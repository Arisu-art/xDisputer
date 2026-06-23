'use client';

import { useEffect, useMemo, useState } from 'react';
import type { NotificationRecord } from '../../lib/notifications/notification-types';
import { useOwnedNotifications } from '../../src/features/notifications/useOwnedNotifications';

const OWNED_NOTIFICATION_DOCK_CSS = `
  .notification-dock[data-notification-dock="true"] { position: relative; z-index: 3; }
  .notification-dock-button { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border: 1px solid rgba(191, 219, 254, .9); border-radius: 15px; background: rgba(239, 246, 255, .96); color: #1d4ed8; font-weight: 950; cursor: pointer; box-shadow: 0 10px 24px rgba(29, 78, 216, .12); }
  .notification-dock-button.has-unread { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
  .notification-dock-badge { position: absolute; top: -7px; right: -7px; min-width: 19px; height: 19px; display: grid; place-items: center; border-radius: 999px; background: #dc2626; color: #fff; font-size: 10px; padding-inline: 5px; }
  .notification-dock-popover { position: absolute; top: 52px; right: 0; width: min(430px, calc(100vw - 32px)); display: grid; gap: 11px; padding: 14px; border: 1px solid rgba(203, 213, 225, .92); border-radius: 22px; background: rgba(255, 255, 255, .98); box-shadow: 0 24px 62px rgba(15, 23, 42, .18); }
  .notification-dock-header, .notification-dock-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .notification-dock-header-copy { display: grid; gap: 2px; }
  .notification-dock-header-copy small { color: #64748b; font-weight: 750; }
  .notification-dock-actions { justify-content: flex-start; flex-wrap: wrap; }
  .notification-dock-list { display: grid; gap: 12px; max-height: 470px; overflow: auto; padding-right: 2px; }
  .notification-dock-group { display: grid; gap: 7px; }
  .notification-dock-group-title { display: flex; align-items: center; gap: 8px; color: #475569; font-size: 11px; font-weight: 950; letter-spacing: .08em; text-transform: uppercase; }
  .notification-dock-group-title:after { content: ''; height: 1px; flex: 1; background: rgba(203, 213, 225, .9); }
  .notification-dock-item { display: grid; gap: 8px; padding: 11px 12px; border: 1px solid rgba(226, 232, 240, .96); border-radius: 16px; background: #f8fafc; color: #0f172a; text-decoration: none; }
  .notification-dock-item.unread { border-color: rgba(96, 165, 250, .85); background: #eff6ff; box-shadow: inset 3px 0 0 #2563eb; }
  .notification-dock-item.read { opacity: .74; }
  .notification-dock-item.warning.unread { box-shadow: inset 3px 0 0 #d97706; }
  .notification-dock-item.success.unread { box-shadow: inset 3px 0 0 #16a34a; }
  .notification-dock-item.error.unread { box-shadow: inset 3px 0 0 #dc2626; }
  .notification-dock-item-title { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; font-weight: 950; }
  .notification-dock-read-state { display: inline-flex; align-items: center; justify-content: center; min-width: 46px; padding: 3px 8px; border-radius: 999px; background: #e2e8f0; color: #475569; font-size: 10px; font-weight: 950; text-transform: uppercase; }
  .notification-dock-item.unread .notification-dock-read-state { background: #dbeafe; color: #1d4ed8; }
  .notification-dock-context { display: grid; gap: 4px; padding: 8px 9px; border-radius: 13px; background: rgba(255,255,255,.72); border: 1px solid rgba(226,232,240,.86); }
  .notification-dock-context-line { display: flex; gap: 7px; align-items: baseline; min-width: 0; font-size: 12px; }
  .notification-dock-context-line b { color: #334155; min-width: 58px; font-size: 10px; letter-spacing: .06em; text-transform: uppercase; }
  .notification-dock-context-line span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #0f172a; font-weight: 780; }
  .notification-dock-item-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .notification-dock-item-action { display: inline-flex; align-items: center; justify-content: center; min-height: 30px; padding: 6px 10px; border-radius: 999px; background: #2563eb; color: #fff; font-size: 11px; font-weight: 950; text-decoration: none; white-space: nowrap; }
  .notification-dock-close, .notification-dock-action { border: 1px solid rgba(203, 213, 225, .92); border-radius: 999px; background: #fff; color: #334155; font-size: 12px; font-weight: 850; padding: 6px 10px; cursor: pointer; }
  .notification-dock-action.danger { color: #b91c1c; border-color: rgba(248, 113, 113, .5); background: #fff1f2; }
  .notification-dock-empty, .notification-dock-item small, .notification-dock-time { color: #64748b; margin: 0; }
  .notification-dock-time { font-weight: 760; font-size: 11px; }
  .notification-dock-sync-warning { margin: 0; padding: 9px 10px; border: 1px solid rgba(251, 191, 36, .7); border-radius: 14px; background: #fffbeb; color: #92400e; font-size: 12px; font-weight: 750; }
`;

type DisplayNotification = NotificationRecord & {
  group: string;
  context: Array<{ label: string; value: string }>;
  actionLabel: string;
};

function notificationActionLabel(item: NotificationRecord) {
  const href = item.href || '';
  if (href.includes('/admin/output-activity-v2')) return 'Review';
  if (href.includes('/workspace')) return 'Open';
  return 'View';
}

function groupLabel(item: NotificationRecord) {
  const href = item.href || '';
  if (href.includes('/admin/output-activity-v2')) return 'Manager Output Activity';
  if (href.includes('/workspace')) return 'Client Workspace';
  return 'General';
}

function cleanPart(part: string) {
  return part.trim().replace(/\s+/g, ' ');
}

function bodyParts(body: string | null) {
  return String(body || '').split('·').map(cleanPart).filter(Boolean).filter((part) => !/^\d+\s+item\(s\)$/i.test(part));
}

function contextLines(item: NotificationRecord) {
  const parts = bodyParts(item.body);
  const href = item.href || '';
  if (href.includes('/admin/output-activity-v2')) {
    return [
      { label: 'Client', value: parts[0] || 'Client user' },
      { label: 'Round', value: parts[1] || 'Selected round' },
      { label: 'Letter', value: parts[2] || 'Generated letter' }
    ];
  }
  if (href.includes('/workspace')) {
    return [
      { label: 'Round', value: parts[0] || 'Selected round' },
      { label: 'Letter', value: parts[1] || 'Generated letter' },
      { label: 'Status', value: parts[2] || item.title }
    ];
  }
  return parts.slice(0, 3).map((value, index) => ({ label: index === 0 ? 'Info' : 'Detail', value }));
}

function displayNotifications(items: NotificationRecord[]): DisplayNotification[] {
  return items.map((item) => ({ ...item, group: groupLabel(item), context: contextLines(item), actionLabel: notificationActionLabel(item) }));
}

function grouped(items: DisplayNotification[]) {
  const map = new Map<string, DisplayNotification[]>();
  for (const item of items) map.set(item.group, [...(map.get(item.group) || []), item]);
  return Array.from(map.entries());
}

function relativeTime(value: string) {
  const created = new Date(value).getTime();
  if (!Number.isFinite(created)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function phDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      month: 'short',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(value));
  } catch {
    return '';
  }
}

export default function OwnedNotificationDock() {
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    errorMessage,
    syncErrorMessage,
    loading,
    refresh,
    markOneRead,
    markAllRead,
    clearReadOnly
  } = useOwnedNotifications();
  const hasUnread = unreadCount > 0;
  const visibleNotifications = useMemo(() => displayNotifications(notifications), [notifications]);
  const groupedNotifications = useMemo(() => grouped(visibleNotifications), [visibleNotifications]);
  const headerText = useMemo(() => hasUnread ? `${unreadCount} unread` : 'All caught up', [hasUnread, unreadCount]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  return <div className="notification-dock" data-notification-dock="true" data-notification-realtime="owned-hook-fetch-first-realtime-accelerated">
    <style data-notification-dock-owner="true">{OWNED_NOTIFICATION_DOCK_CSS}</style>
    <button type="button" className={`notification-dock-button ${hasUnread ? 'has-unread' : ''}`} aria-haspopup="dialog" aria-expanded={open} aria-label="Open notifications" onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">🔔</span>
      {hasUnread && <strong className="notification-dock-badge">{unreadCount > 99 ? '99+' : unreadCount}</strong>}
    </button>
    {open && <section className="notification-dock-popover" role="dialog" aria-label="Notifications">
      <header className="notification-dock-header">
        <span className="notification-dock-header-copy"><strong>Notifications</strong><small>{loading ? 'Refreshing…' : headerText}</small></span>
        <button type="button" className="notification-dock-close" onClick={() => setOpen(false)} aria-label="Close notifications">Close</button>
      </header>
      <div className="notification-dock-actions" aria-label="Notification actions">
        <button type="button" className="notification-dock-action" onClick={() => void refresh()}>Refresh</button>
        <button type="button" className="notification-dock-action" onClick={() => void markAllRead()}>Mark all read</button>
        <button type="button" className="notification-dock-action danger" onClick={() => void clearReadOnly()}>Clear read only</button>
      </div>
      {syncErrorMessage && <p className="notification-dock-sync-warning">Sync warning: {syncErrorMessage}</p>}
      {errorMessage && <p className="notification-dock-empty">{errorMessage}</p>}
      {!errorMessage && visibleNotifications.length === 0 && <p className="notification-dock-empty">No notifications yet.</p>}
      {!errorMessage && groupedNotifications.length > 0 && <div className="notification-dock-list">
        {groupedNotifications.map(([group, items]) => (
          <section key={group} className="notification-dock-group" aria-label={group}>
            <div className="notification-dock-group-title">{group}</div>
            {items.map((item) => (
              <article key={item.id} className={`notification-dock-item ${item.severity} ${item.read_at ? 'read' : 'unread'}`}>
                <span className="notification-dock-item-title"><span>{item.title}</span><span className="notification-dock-read-state">{item.read_at ? 'Read' : 'Unread'}</span></span>
                <div className="notification-dock-context">
                  {item.context.map((line) => <span key={`${item.id}-${line.label}`} className="notification-dock-context-line"><b>{line.label}</b><span>{line.value}</span></span>)}
                </div>
                <footer className="notification-dock-item-footer">
                  <span className="notification-dock-time">{relativeTime(item.created_at)} · {phDateTime(item.created_at)} PH</span>
                  {item.href ? <a className="notification-dock-item-action" href={item.href} onClick={() => void markOneRead(item.id)}>{item.actionLabel}</a> : <button type="button" className="notification-dock-action" onClick={() => void markOneRead(item.id)}>Mark read</button>}
                </footer>
              </article>
            ))}
          </section>
        ))}
      </div>}
    </section>}
  </div>;
}
