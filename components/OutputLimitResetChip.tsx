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
  if (seconds === null) return 'US day reset';
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

    void load();
    const refresh = window.setInterval(load, 60_000);
    return () => { cancelled = true; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => typeof value === 'number' ? Math.max(0, value - 1) : value);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const label = useMemo(() => {
    if (!entitlement) return 'Loading limits';
    if (entitlement.outputLimit === null) return 'No daily cap';
    return `${entitlement.outputUsedToday}/${entitlement.outputLimit} used`;
  }, [entitlement]);

  const remaining = entitlement?.outputRemainingToday;
  const blocked = entitlement?.allowed === false || remaining === 0;

  return <aside className={`output-limit-reset-chip ${blocked ? 'blocked' : ''}`} aria-label="Daily output limit reset">
    <div>
      <span>Daily outputs</span>
      <strong>{label}</strong>
    </div>
    <em>{blocked ? 'Resets in' : 'Reset'} {formatDuration(secondsLeft)}</em>
  </aside>;
}
