'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { NotificationRecord } from '../../../lib/notifications/notification-types';
import { createSupabaseBrowserClient } from '../../../lib/supabase/browser';
import { notificationOwnershipContract } from './notification-ownership-contract';

type Snapshot = {
  notifications: NotificationRecord[];
  unreadCount: number;
  outputActivityUnreadCount: number;
  errorMessage: string | null;
  syncErrorMessage: string | null;
  serverTime: string | null;
  loading: boolean;
};

type RefreshReason = 'mount' | 'manual' | 'focus' | 'visibility' | 'realtime' | 'warmup' | 'steady' | 'read-action';

const EMPTY_SNAPSHOT: Snapshot = {
  notifications: [],
  unreadCount: 0,
  outputActivityUnreadCount: 0,
  errorMessage: null,
  syncErrorMessage: null,
  serverTime: null,
  loading: false
};

const OUTPUT_ACTIVITY_HREF = '/admin/output-activity-v2';
const subscribers = new Set<() => void>();
let snapshot = EMPTY_SNAPSHOT;
let started = false;
let inFlight = false;
let channel: RealtimeChannel | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;
let warmupTimer: ReturnType<typeof setInterval> | null = null;
let warmupStopTimer: ReturnType<typeof setTimeout> | null = null;
let steadyTimer: ReturnType<typeof setInterval> | null = null;
let teardownTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;

function countOutputActivityUnread(notifications: NotificationRecord[]) {
  return notifications.filter((item) => !item.read_at && (item.href || '').includes(OUTPUT_ACTIVITY_HREF)).length;
}

function snapshotSignature(value: Snapshot) {
  return JSON.stringify({
    ids: value.notifications.map((item) => `${item.id}:${item.read_at || ''}:${item.href || ''}`),
    unreadCount: value.unreadCount,
    errorMessage: value.errorMessage,
    syncErrorMessage: value.syncErrorMessage
  });
}

function normalizePayload(data: unknown): Snapshot {
  const input = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const notifications = Array.isArray(input.notifications) ? input.notifications as NotificationRecord[] : [];
  const unreadCount = Number(input.unreadCount || 0);
  return {
    notifications,
    unreadCount: Number.isFinite(unreadCount) ? unreadCount : notifications.filter((item) => !item.read_at).length,
    outputActivityUnreadCount: countOutputActivityUnread(notifications),
    errorMessage: typeof input.errorMessage === 'string' ? input.errorMessage : null,
    syncErrorMessage: typeof input.syncErrorMessage === 'string' ? input.syncErrorMessage : null,
    serverTime: typeof input.serverTime === 'string' ? input.serverTime : null,
    loading: false
  };
}

function emit(next: Snapshot, reason: RefreshReason) {
  const previous = snapshot;
  const changed = snapshotSignature(previous) !== snapshotSignature(next);
  snapshot = next;
  subscribers.forEach((listener) => listener());
  if (changed && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('xdisputer:notifications-refreshed', {
      detail: { reason, unreadCount: next.unreadCount, outputActivityUnreadCount: next.outputActivityUnreadCount, serverTime: next.serverTime }
    }));
  }
}

async function fetchNotifications(reason: RefreshReason = 'manual') {
  if (inFlight || typeof window === 'undefined') return;
  inFlight = true;
  if (!snapshot.loading) emit({ ...snapshot, loading: true }, reason);
  try {
    const response = await fetch(`/api/notifications?limit=${notificationOwnershipContract.maxVisibleItems}&t=${Date.now()}`, {
      cache: 'no-store',
      headers: { accept: 'application/json', 'cache-control': 'no-store' }
    });
    if (response.status === 401) {
      emit({ ...EMPTY_SNAPSHOT, errorMessage: 'Sign in again to load notifications.' }, reason);
      return;
    }
    const data = await response.json().catch(() => null);
    emit(normalizePayload(data), reason);
  } catch {
    emit({ ...snapshot, loading: false, errorMessage: 'Notifications unavailable.' }, reason);
  } finally {
    inFlight = false;
  }
}

function scheduleRefresh(reason: RefreshReason, delay = 250) {
  if (typeof window === 'undefined') return;
  if (refreshTimer) return;
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    void fetchNotifications(reason);
  }, delay);
}

function clearTimers() {
  if (refreshTimer) window.clearTimeout(refreshTimer);
  if (warmupTimer) window.clearInterval(warmupTimer);
  if (warmupStopTimer) window.clearTimeout(warmupStopTimer);
  if (steadyTimer) window.clearInterval(steadyTimer);
  refreshTimer = null;
  warmupTimer = null;
  warmupStopTimer = null;
  steadyTimer = null;
}

function startController() {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (teardownTimer) window.clearTimeout(teardownTimer);
  teardownTimer = null;

  const supabase = createSupabaseBrowserClient();
  const focusHandler = () => scheduleRefresh('focus');
  const visibilityHandler = () => { if (!document.hidden) scheduleRefresh('visibility'); };

  window.addEventListener('focus', focusHandler);
  window.addEventListener('online', focusHandler);
  document.addEventListener('visibilitychange', visibilityHandler);

  void fetchNotifications('mount');
  warmupTimer = window.setInterval(() => scheduleRefresh('warmup'), 5_000);
  warmupStopTimer = window.setTimeout(() => {
    if (warmupTimer) window.clearInterval(warmupTimer);
    warmupTimer = null;
  }, 60_000);
  steadyTimer = window.setInterval(() => scheduleRefresh('steady'), notificationOwnershipContract.pollIntervalMs);

  void supabase.auth.getUser().then(({ data }) => {
    const userId = data.user?.id || null;
    currentUserId = userId;
    if (!userId || !started) return;
    channel = supabase
      .channel(`owned-notifications-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${userId}` }, () => scheduleRefresh('realtime'))
      .subscribe((status) => { if (status === 'SUBSCRIBED') scheduleRefresh('realtime'); });
  }).catch(() => undefined);

  const teardown = () => {
    window.removeEventListener('focus', focusHandler);
    window.removeEventListener('online', focusHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
    clearTimers();
    if (channel) void supabase.removeChannel(channel);
    channel = null;
    currentUserId = null;
    started = false;
  };

  teardownTimer = null;
  (startController as unknown as { teardown?: () => void }).teardown = teardown;
}

function stopControllerSoon() {
  if (typeof window === 'undefined' || subscribers.size > 0) return;
  if (teardownTimer) window.clearTimeout(teardownTimer);
  teardownTimer = window.setTimeout(() => {
    if (subscribers.size > 0) return;
    (startController as unknown as { teardown?: () => void }).teardown?.();
    snapshot = EMPTY_SNAPSHOT;
  }, 30_000);
}

function subscribe(listener: () => void) {
  subscribers.add(listener);
  startController();
  return () => {
    subscribers.delete(listener);
    stopControllerSoon();
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

export function refreshOwnedNotifications() {
  return fetchNotifications('manual');
}

export function useOwnedNotifications() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const refresh = useCallback(() => fetchNotifications('manual'), []);
  const markOneRead = useCallback(async (id: string) => {
    await fetch(notificationOwnershipContract.readEndpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: [id] })
    }).catch(() => null);
    await fetchNotifications('read-action');
  }, []);
  const markAllRead = useCallback(async () => {
    await fetch(notificationOwnershipContract.readEndpoint, { method: 'POST' }).catch(() => null);
    await fetchNotifications('read-action');
  }, []);
  const clearReadOnly = useCallback(async () => {
    await fetch(notificationOwnershipContract.clearReadEndpoint, { method: 'DELETE' }).catch(() => null);
    await fetchNotifications('read-action');
  }, []);

  return { ...current, refresh, markOneRead, markAllRead, clearReadOnly, currentUserId };
}
