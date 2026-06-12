'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

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

export default function ClientOutputLimitBoundary({ children }: { children: ReactNode }) {
  const [entitlement, setEntitlement] = useState<EntitlementPayload | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const load = useCallback(async () => {
    const response = await fetch('/api/client/output-entitlement', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    const next = payload.entitlement as EntitlementPayload | undefined;
    if (!next) return;
    setEntitlement(next);
    setSecondsLeft(typeof next.resetSeconds === 'number' ? next.resetSeconds : null);
  }, []);

  useEffect(() => {
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
    const refresh = window.setInterval(load, 30_000);
    return () => {
      window.clearInterval(refresh);
      window.removeEventListener('xdisputer:output-entitlement-updated', handleUpdate);
      window.removeEventListener('xdisputer:output-entitlement-refresh', handleUpdate);
    };
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => typeof value === 'number' ? Math.max(0, value - 1) : value);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) void load();
  }, [secondsLeft, load]);

  const paused = entitlement?.outputLimit !== null && (entitlement?.allowed === false || entitlement?.outputRemainingToday === 0);
  const usageLabel = useMemo(() => {
    if (!entitlement) return 'Checking daily output limit';
    if (entitlement.outputLimit === null) return 'No daily output limit configured';
    return `${entitlement.outputUsedToday}/${entitlement.outputLimit} Daily Outputs Used`;
  }, [entitlement]);

  if (!paused) return <>{children}</>;

  return <main className="client-output-limit-pause" aria-label="Daily output limit reached">
    <section className="client-output-limit-pause-card">
      <p className="eyebrow">Daily allowance reached</p>
      <h1>Workspace pauses until reset</h1>
      <p>This client used all available outputs for the current US Eastern day. The workspace opens again automatically after reset.</p>
      <div className="client-output-limit-pause-grid">
        <article><span>Usage today</span><strong>{usageLabel}</strong><small>{entitlement?.message || 'Generation is paused for this client account.'}</small></article>
        <article><span>Opens in</span><strong>{formatDuration(secondsLeft)}</strong><small>Reset at {formatResetAt(entitlement?.resetAt || null)}</small></article>
      </div>
      <button type="button" className="action-button" onClick={() => void load()}>Check again</button>
    </section>
  </main>;
}
