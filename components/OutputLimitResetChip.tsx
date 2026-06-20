'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type EntitlementPayload = {
  outputLimit: number | null;
  outputUsedToday: number;
  outputRemainingToday: number | null;
  resetAt: string | null;
  resetSeconds: number | null;
  allowed: boolean;
  message: string | null;
};

function formatDuration(seconds: number | null, refreshing = false) {
  if (refreshing) return 'Refreshing';
  if (seconds === null) return 'Calculating';
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secondsPart = safe % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secondsPart}s`;
  if (minutes > 0) return `${minutes}m ${secondsPart}s`;
  return `${secondsPart}s`;
}

function formatResetAt(value: string | null) {
  if (!value) return '12:00 AM US ET';
  try {
    return `${new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date(value))} US ET`;
  } catch {
    return '12:00 AM US ET';
  }
}

function isEntitlementPayload(value: unknown): value is EntitlementPayload {
  return Boolean(value && typeof value === 'object' && 'outputUsedToday' in value);
}

function countdownStep(secondsLeft: number | null) {
  if (secondsLeft === null || secondsLeft > 3600) return { delay: 60_000, decrement: 60 };
  if (secondsLeft > 300) return { delay: 10_000, decrement: 10 };
  return { delay: 1000, decrement: 1 };
}

export default function OutputLimitResetChip() {
  const [entitlement, setEntitlement] = useState<EntitlementPayload | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const resetRefreshStartedRef = useRef(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/client/output-entitlement', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = await response.json();
      const next = payload.entitlement as EntitlementPayload | undefined;
      if (next) {
        setEntitlement(next);
        setSecondsLeft(typeof next.resetSeconds === 'number' ? next.resetSeconds : null);
        resetRefreshStartedRef.current = false;
      }
    } catch {
      setEntitlement(null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    function handleUpdate(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (isEntitlementPayload(detail)) {
        setEntitlement(detail);
        setSecondsLeft(typeof detail.resetSeconds === 'number' ? detail.resetSeconds : null);
        resetRefreshStartedRef.current = false;
      } else {
        void load();
      }
    }

    function handleVisibility() {
      if (document.visibilityState === 'visible') void load();
    }

    void load();
    window.addEventListener('xdisputer:output-entitlement-updated', handleUpdate);
    window.addEventListener('xdisputer:output-entitlement-refresh', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('xdisputer:output-entitlement-updated', handleUpdate);
      window.removeEventListener('xdisputer:output-entitlement-refresh', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [load]);

  useEffect(() => {
    if (typeof secondsLeft !== 'number') return;
    const step = countdownStep(secondsLeft);
    const timer = window.setTimeout(() => {
      setSecondsLeft((value) => typeof value === 'number' ? Math.max(0, value - step.decrement) : value);
    }, step.delay);
    return () => window.clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft !== 0 || resetRefreshStartedRef.current) return;
    resetRefreshStartedRef.current = true;
    window.dispatchEvent(new CustomEvent('xdisputer:output-entitlement-refresh'));
    void load();
  }, [secondsLeft, load]);

  const limitLabel = useMemo(() => {
    if (!entitlement) return 'Loading';
    if (entitlement.outputLimit === null) return `${entitlement.outputUsedToday} Daily Outputs`;
    return `${entitlement.outputUsedToday}/${entitlement.outputLimit} Daily Output${entitlement.outputLimit === 1 ? '' : 's'}`;
  }, [entitlement]);

  const remainingLabel = useMemo(() => {
    if (!entitlement) return 'Checking entitlement';
    if (entitlement.outputLimit === null) return 'No daily output limit configured';
    const remaining = Math.max(0, entitlement.outputRemainingToday ?? 0);
    return `${remaining} output${remaining === 1 ? '' : 's'} remaining today`;
  }, [entitlement]);

  const remaining = entitlement?.outputRemainingToday;
  const blocked = entitlement?.outputLimit !== null && (entitlement?.allowed === false || remaining === 0);
  const resetAt = formatResetAt(entitlement?.resetAt || null);

  return <aside className={`output-limit-reset-chip ${blocked ? 'blocked' : ''}`} aria-label="Daily output limit reset">
    <div className="output-limit-chip-main">
      <span>Daily Output Limit</span>
      <strong>{limitLabel}</strong>
      <small>{remainingLabel}</small>
    </div>
    <div className="output-limit-chip-timer">
      <span>{blocked ? 'Resets in' : 'Next reset'}</span>
      <strong>{formatDuration(secondsLeft, refreshing && secondsLeft === 0)}</strong>
      <small>{resetAt}</small>
    </div>
  </aside>;
}
