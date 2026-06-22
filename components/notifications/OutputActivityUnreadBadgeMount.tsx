'use client';

import { useEffect } from 'react';
import type { NotificationRecord } from '../../lib/notifications/notification-types';
import { notificationOwnershipContract } from '../../src/features/notifications/notification-ownership-contract';

const OUTPUT_ACTIVITY_HREF = '/admin/output-activity-v2';

function outputActivityUnreadCount(notifications: NotificationRecord[]) {
  return notifications.filter((item) => !item.read_at && (item.href || '').includes(OUTPUT_ACTIVITY_HREF)).length;
}

function clearBadges() {
  document.querySelectorAll('[data-output-activity-unread-badge="true"]').forEach((node) => node.remove());
  document.querySelectorAll('[data-output-activity-unread-count]').forEach((node) => node.removeAttribute('data-output-activity-unread-count'));
}

function applyBadge(count: number) {
  clearBadges();
  if (count < 1) return;

  const targets = Array.from(document.querySelectorAll<HTMLAnchorElement>(`a[href^="${OUTPUT_ACTIVITY_HREF}"],a[href*="${OUTPUT_ACTIVITY_HREF}"]`));
  for (const target of targets) {
    if (!target.textContent?.toLowerCase().includes('output activity')) continue;
    target.dataset.outputActivityUnreadCount = String(count);
    const badge = document.createElement('span');
    badge.dataset.outputActivityUnreadBadge = 'true';
    badge.textContent = count > 9 ? '9+' : String(count);
    target.appendChild(badge);
  }
}

export default function OutputActivityUnreadBadgeMount() {
  useEffect(() => {
    let cancelled = false;
    let observer: MutationObserver | null = null;

    async function sync() {
      const response = await fetch(`/api/notifications?limit=${notificationOwnershipContract.maxVisibleItems}`, { cache: 'no-store', headers: { accept: 'application/json', 'cache-control': 'no-store' } });
      if (!response.ok) return;
      const payload = await response.json().catch(() => null);
      if (cancelled) return;
      const notifications = Array.isArray(payload?.notifications) ? payload.notifications as NotificationRecord[] : [];
      applyBadge(outputActivityUnreadCount(notifications));
    }

    void sync().catch(() => undefined);
    const timer = window.setInterval(() => { void sync().catch(() => undefined); }, notificationOwnershipContract.pollIntervalMs);
    observer = new MutationObserver(() => { void sync().catch(() => undefined); });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      observer?.disconnect();
      clearBadges();
    };
  }, []);

  return null;
}
