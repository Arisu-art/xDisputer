'use client';

import { useEffect, useMemo, useState } from 'react';

type EntitlementPayload = {
  outputLimit: number | null;
  outputUsedToday: number;
  outputRemainingToday: number | null;
  resetAt: string | null;
  resetSeconds: number | null;
  allowed: boolean;
  message: string | null;
};

function formatDuration(seconds: number | null) {
  if (seconds === null) return 'US ET day reset';
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secondsPart = safe % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
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

export default function OutputLimitResetChip() {
  const [entitlement, setEntitlement] = useState<EntitlementPayload | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch('/api/client/output-entitlement', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json();
        const next = payload.entitlement as EntitlementPayload | undefined;
        if (!cancelled && next) {
          setEntitlement(next);
          setSecondsLeft(typeof next.resetSeconds === 'number' ? next.resetSeconds : null);
        }
      } catch {
        if (!cancelled) setEntitlement(null);
      }
    }

    function handleUpdate(event: Event) {
      const detail = (event as CustomEvent).detail;
      if (isEntitlementPayload(detail)) {
        setEntitlement(detail);
        setSecondsLeft(typeof detail.resetSeconds === 'number' ? detail.resetSeconds : null);
      } else {
        void load();
      }
    }

    void load();
    window.addEventListener('xdisputer:output-entitlement-updated', handleUpdate);
    window.addEventListener('xdisputer:output-entitlement-refresh', handleUpdate);
    const refresh = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
      window.removeEventListener('xdisputer:output-entitlement-updated', handleUpdate);
      window.removeEventListener('xdisputer:output-entitlement-refresh', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => typeof value === 'number' ? Math.max(0, value - 1) : value);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const limitLabel = useMemo(() => {
    if (!entitlement) return 'Loading';
    if (entitlement.outputLimit === null) return `${entitlement.outputUsedToday} Daily Outputs`;
    return `${entitlement.outputUsedToday}/${entitlement.outputLimit} Daily Output${entitlement.outputLimit === 1 ? '' : 's'}`;
  }, [entitlement]);

  const remainingLabel = useMemo(() => {
    if (!entitlement) return 'Checking entitlement';
    if (entitlement.outputLimit === null) return 'Unlimited daily package generation';
    const remaining = Math.max(0, entitlement.outputRemainingToday ?? 0);
    return `${remaining} output${remaining === 1 ? '' : 's'} remaining today`;
  }, [entitlement]);

  const remaining = entitlement?.outputRemainingToday;
  const blocked = entitlement?.allowed === false || remaining === 0;
  const resetAt = formatResetAt(entitlement?.resetAt || null);

  return <aside className={`output-limit-reset-chip ${blocked ? 'blocked' : ''}`} aria-label="Daily output limit reset">
    <div className="output-limit-chip-main">
      <span>Daily Output Limit</span>
      <strong>{limitLabel}</strong>
      <small>{remainingLabel}</small>
    </div>
    <div className="output-limit-chip-timer">
      <span>{blocked ? 'Resets in' : 'Next reset'}</span>
      <strong>{formatDuration(secondsLeft)}</strong>
      <small>{resetAt}</small>
    </div>
  </aside>;
}
