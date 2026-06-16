'use client';

import type { AiUiResult } from '../lib/ai/ai-ui-result';
import type { AiUiClientState } from '../lib/ai/ai-ui-client';

type Props = {
  title: string;
  description: string;
  status: AiUiClientState;
  result: AiUiResult | null;
  disabled?: boolean;
  actionLabel?: string;
  onRun: () => void;
};

const severityLabel = {
  blocker: 'Blocker',
  warning: 'Warning',
  info: 'Info'
} as const;

function statusCopy(status: AiUiClientState) {
  if (status === 'loading') return 'Reviewing…';
  if (status === 'ready') return 'Ready';
  if (status === 'error') return 'Needs retry';
  return 'Idle';
}

export default function AiInsightPanel({
  title,
  description,
  status,
  result,
  disabled = false,
  actionLabel = 'Run AI review',
  onRun
}: Props) {
  return (
    <section className={`panel ai-insight-panel ai-insight-${status}`} aria-label={title}>
      <header className="template-stage-command">
        <div className="template-stage-heading">
          <p className="eyebrow">AI assistant layer · {statusCopy(status)}</p>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="template-selected-actions">
          <button type="button" className="secondary-button" disabled={disabled || status === 'loading'} onClick={onRun}>
            {status === 'loading' ? 'Reviewing…' : actionLabel}
          </button>
        </div>
      </header>

      {result ? (
        <div className="source-review ai-insight-result" role={result.findings.some((finding) => finding.severity === 'blocker') ? 'alert' : 'status'} aria-live="polite">
          <strong>{result.summary}</strong>
          {result.findings.length > 0 ? (
            <div className="ai-finding-list">
              {result.findings.map((finding, index) => (
                <article className={`ai-finding ai-finding-${finding.severity}`} key={`${finding.severity}-${finding.title}-${index}`}>
                  <span>{severityLabel[finding.severity]}</span>
                  <h4>{finding.title}</h4>
                  <p>{finding.detail}</p>
                  {finding.source ? <small>{finding.source}</small> : null}
                </article>
              ))}
            </div>
          ) : null}

          {result.suggestedActions.length > 0 ? (
            <div className="ai-action-suggestions">
              <strong>Suggested next steps</strong>
              {result.suggestedActions.map((action) => (
                <p key={action.id}>{action.label}{action.requiresApproval ? ' · requires approval' : ''}</p>
              ))}
            </div>
          ) : null}

          <small className="ai-insight-audit">Request {result.requestId || 'not persisted'} · Model {result.modelName || 'fallback'} · {result.latencyMs}ms</small>
        </div>
      ) : null}
    </section>
  );
}
