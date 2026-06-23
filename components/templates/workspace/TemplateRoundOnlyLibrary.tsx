'use client';

import { useCallback, useEffect, useState } from 'react';
import { rounds, type Round } from '../../../lib/reference-store';

type ManagerTemplateScopeUi = {
  canManageTemplates?: boolean;
};

function statusLabel(loading: boolean, error: string | null, canManage?: boolean) {
  if (loading) return 'Checking';
  if (error) return 'Needs check';
  return canManage ? 'Ready' : 'Read only';
}

export default function TemplateRoundOnlyLibrary() {
  const [round, setRound] = useState<Round>('1st Round');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scope, setScope] = useState<ManagerTemplateScopeUi | null>(null);

  const loadRound = useCallback(async (selectedRound: Round) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch(`/api/template-assets?round=${encodeURIComponent(selectedRound)}`, { headers: { accept: 'application/json' } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || payload?.message || 'Could not verify manager templates.');
      setScope(payload?.managerTemplateScope || null);
    } catch (error) {
      setScope(null);
      setLoadError(error instanceof Error ? error.message : 'Could not verify manager templates.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRound(round); }, [round, loadRound]);

  return <section className="template-round-only-library" aria-label="Select template round" data-template-library-minimal="round-only">
    <header className="template-round-only-heading">
      <p className="eyebrow">Manager-approved reusable templates</p>
      <h2>Select a round</h2>
      <p>Choose the filing round. The active manager template for that round stays the source of truth.</p>
      <span className={`template-round-only-status ${loadError ? 'error' : loading ? 'loading' : 'ready'}`}>{statusLabel(loading, loadError, scope?.canManageTemplates)}</span>
    </header>
    <div className="template-round-selection-grid">
      {rounds.map((item, index) => <button type="button" key={item} className={`template-round-choice ${item === round ? 'current' : ''}`} onClick={() => setRound(item)}>
        <span className="template-choice-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="template-choice-copy"><strong>{item}</strong><small>{item === round ? 'Current round' : 'Select round'}</small></span>
        <span className="template-choice-arrow" aria-hidden="true">→</span>
      </button>)}
    </div>
    {loadError ? <p className="template-round-only-error">{loadError}</p> : null}
  </section>;
}
