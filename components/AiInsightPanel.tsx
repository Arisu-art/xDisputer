'use client';

export type ReviewClientState = 'idle' | 'loading' | 'ready' | 'error';

export type ReviewFinding = {
  severity: 'blocker' | 'warning' | 'info';
  title: string;
  detail: string;
  source?: string;
};

export type ReviewSuggestedAction = {
  id: string;
  label: string;
  requiresApproval: boolean;
};

export type ReviewPanelResult = {
  summary: string;
  findings: ReviewFinding[];
  suggestedActions: ReviewSuggestedAction[];
  requestId?: string | null;
  modelName?: string | null;
  latencyMs?: number;
};

type Props = {
  title: string;
  description: string;
  status: ReviewClientState;
  result: ReviewPanelResult | null;
  disabled?: boolean;
  actionLabel?: string;
  onRun: () => void;
};

function statusCopy(status: ReviewClientState) {
  if (status === 'loading') return 'Reviewing';
  if (status === 'ready') return 'Ready';
  if (status === 'error') return 'Needs attention';
  return 'Idle';
}

export default function AiInsightPanel({ title, description, status, result, disabled = false, actionLabel = 'Run review', onRun }: Props) {
  return (
    <section className={`panel ai-insight-panel ai-insight-${status}`} aria-label={title}>
      <header className="template-stage-command">
        <div className="template-stage-heading">
          <p className="eyebrow">Deterministic review · {statusCopy(status)}</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="template-selected-actions">
          <button type="button" className="secondary-button" disabled={disabled || status === 'loading'} onClick={onRun}>
            {status === 'loading' ? 'Reviewing' : actionLabel}
          </button>
        </div>
      </header>
      {result ? <div className="source-review ai-insight-result"><strong>{result.summary}</strong></div> : null}
    </section>
  );
}
