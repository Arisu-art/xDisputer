'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import type { AiUiFinding, AiUiResult, AiUiSuggestedAction } from '../lib/ai/ai-ui-result';
import type { LetterRoute, ParsedSource } from '../lib/letter-engine';
import type { PacketAssets } from '../lib/packet-assets';
import type { TemplateFieldContract } from '../lib/template-contracts';
import type { JsonObject } from '../lib/ai/ai-types';

const AiInsightPanel = dynamic(() => import('./AiInsightPanel'), {
  ssr: false,
  loading: () => <section className="ai-insight-panel loading" aria-live="polite">Preparing AI review controls…</section>
});

type AiUiClientState = 'idle' | 'loading' | 'ready' | 'error';

type Props = {
  parsed: ParsedSource;
  routes: LetterRoute[];
  evidence: PacketAssets;
  sourceWarnings: Array<{ message: string }>;
  generationBlockers: string[];
  missingLetters: string[];
  affidavitReady: boolean;
  customFields: TemplateFieldContract[];
  packetReady: boolean;
  scopeConfirmed: boolean;
  strict: boolean;
};

function routeSummary(routes: LetterRoute[]) {
  return routes.reduce<Record<string, number>>((summary, route) => {
    const key = `${route.type}:${route.bureau}`;
    summary[key] = (summary[key] || 0) + 1;
    return summary;
  }, {});
}

function buildFindings(input: Props): AiUiFinding[] {
  const missingCustomFields = input.customFields.filter((field) => field.required && !input.parsed.templateFields[field.key]?.trim());
  const findings: AiUiFinding[] = [];

  if (!input.parsed.name.trim()) {
    findings.push({ severity: 'blocker', title: 'Client identity missing', detail: 'Source data must include a client name before packet generation can be reviewed.' });
  }

  if (!input.parsed.address.length) {
    findings.push({ severity: 'warning', title: 'Client address missing', detail: 'Address is needed for letter routing and affidavit context.' });
  }

  if (!input.routes.length) {
    findings.push({ severity: 'blocker', title: 'No bureau routes detected', detail: 'No dispute, inquiry, or late-payment routes were detected from the current source data.' });
  }

  if (!input.scopeConfirmed) {
    findings.push({ severity: 'blocker', title: 'Packet scope not confirmed', detail: 'Review the bureau/account scope and confirm it before generation.' });
  }

  if (!input.evidence.supporting.length) {
    findings.push({ severity: 'blocker', title: 'Supporting documents missing', detail: 'Upload at least one supporting document image before creating the ordered package.' });
  }

  if (!input.affidavitReady) {
    findings.push({ severity: 'blocker', title: 'Affidavit jurisdiction needs review', detail: 'State and county must be confirmed before affidavit-based generation.' });
  }

  if (missingCustomFields.length > 0) {
    findings.push({ severity: 'blocker', title: 'Template fields incomplete', detail: `Complete required template fields: ${missingCustomFields.map((field) => field.label).join(', ')}.` });
  }

  if (input.strict && input.missingLetters.length > 0) {
    findings.push({ severity: 'blocker', title: 'Required letter template missing', detail: `Upload or assign templates for: ${input.missingLetters.join(', ')}.` });
  }

  input.generationBlockers.slice(0, 6).forEach((blocker) => {
    findings.push({ severity: 'blocker', title: 'Generation preflight blocker', detail: blocker });
  });

  input.sourceWarnings.slice(0, 4).forEach((warning) => {
    findings.push({ severity: 'warning', title: 'Source warning', detail: warning.message });
  });

  if (!findings.length) {
    findings.push({ severity: 'info', title: 'Source review is clear', detail: 'No deterministic source blockers were detected. Generation still depends on the existing packet readiness checks.' });
  }

  return findings;
}

function buildActions(input: Props): AiUiSuggestedAction[] {
  const actions: AiUiSuggestedAction[] = [];

  if (!input.scopeConfirmed) actions.push({ id: 'confirm-packet-scope', label: 'Confirm packet scope', requiresApproval: false });
  if (!input.evidence.supporting.length) actions.push({ id: 'upload-supporting-documents', label: 'Upload Supporting Documents', requiresApproval: false });
  if (input.missingLetters.length > 0) actions.push({ id: 'open-template-upload', label: 'Review missing letter templates', requiresApproval: false });
  if (!input.packetReady) actions.push({ id: 'review-deterministic-blockers', label: 'Resolve deterministic blockers before generation', requiresApproval: false });

  return actions;
}

export default function SourceReviewAiPanel(props: Props) {
  const [status, setStatus] = useState<AiUiClientState>('idle');
  const [result, setResult] = useState<AiUiResult | null>(null);
  const findings = useMemo(() => buildFindings(props), [props]);
  const actions = useMemo(() => buildActions(props), [props]);

  async function runReview() {
    setStatus('loading');
    const { runAiUiReview } = await import('../lib/ai/ai-ui-client');
    const next = await runAiUiReview({
      mode: 'source_review',
      message: 'Review source data completeness and explain generation readiness. Do not enable generation or change source data.',
      metadata: {
        clientNamePresent: Boolean(props.parsed.name.trim()),
        addressLineCount: props.parsed.address.length,
        routeCount: props.routes.length,
        routeSummary: routeSummary(props.routes) as JsonObject,
        supportingDocumentCount: props.evidence.supporting.length,
        sourceWarningCount: props.sourceWarnings.length,
        generationBlockerCount: props.generationBlockers.length,
        missingLetters: props.missingLetters,
        affidavitReady: props.affidavitReady,
        packetReady: props.packetReady,
        strict: props.strict
      },
      deterministicFindings: findings,
      deterministicActions: actions
    });
    setResult(next);
    setStatus(next.findings.some((finding) => finding.title === 'AI review unavailable') ? 'error' : 'ready');
  }

  return (
    <AiInsightPanel
      title="AI Source Review"
      description="Explains source completeness, packet readiness, and generation blockers without changing deterministic generation rules."
      status={status}
      result={result}
      actionLabel="Review source with AI"
      onRun={runReview}
    />
  );
}
