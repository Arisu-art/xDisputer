'use client';

import { useMemo, useState } from 'react';
import AiInsightPanel, { type ReviewClientState, type ReviewFinding, type ReviewPanelResult, type ReviewSuggestedAction } from './AiInsightPanel';
import type { LetterRoute, ParsedSource } from '../lib/letter-engine';
import type { PacketAssets } from '../lib/packet-assets';
import type { TemplateFieldContract } from '../lib/template-contracts';

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

function buildFindings(input: Props): ReviewFinding[] {
  const missingCustomFields = input.customFields.filter((field) => field.required && !input.parsed.templateFields[field.key]?.trim());
  const findings: ReviewFinding[] = [];

  if (!input.parsed.name.trim()) findings.push({ severity: 'blocker', title: 'Client identity missing', detail: 'Source data must include a client name before packet generation can be reviewed.' });
  if (!input.parsed.address.length) findings.push({ severity: 'warning', title: 'Client address missing', detail: 'Address is needed for letter routing and affidavit context.' });
  if (!input.routes.length) findings.push({ severity: 'blocker', title: 'No bureau routes detected', detail: 'No dispute, inquiry, or late-payment routes were detected from the current source data.' });
  if (!input.scopeConfirmed) findings.push({ severity: 'blocker', title: 'Packet scope not confirmed', detail: 'Review the bureau/account scope and confirm it before generation.' });
  if (!input.evidence.supporting.length) findings.push({ severity: 'blocker', title: 'Supporting documents missing', detail: 'Upload at least one supporting document image before creating the ordered package.' });
  if (!input.affidavitReady) findings.push({ severity: 'blocker', title: 'Affidavit jurisdiction needs review', detail: 'State and county must be confirmed before affidavit-based generation.' });
  if (missingCustomFields.length > 0) findings.push({ severity: 'blocker', title: 'Template fields incomplete', detail: `Complete required template fields: ${missingCustomFields.map((field) => field.label).join(', ')}.` });
  if (input.strict && input.missingLetters.length > 0) findings.push({ severity: 'blocker', title: 'Required letter template missing', detail: `Upload or assign templates for: ${input.missingLetters.join(', ')}.` });
  input.generationBlockers.slice(0, 6).forEach((blocker) => findings.push({ severity: 'blocker', title: 'Generation preflight blocker', detail: blocker }));
  input.sourceWarnings.slice(0, 4).forEach((warning) => findings.push({ severity: 'warning', title: 'Source warning', detail: warning.message }));

  if (!findings.length) {
    findings.push({ severity: 'info', title: 'Source review is clear', detail: 'No deterministic source blockers were detected. Generation still depends on the existing packet readiness checks.' });
  }

  return findings;
}

function buildActions(input: Props): ReviewSuggestedAction[] {
  const actions: ReviewSuggestedAction[] = [];
  if (!input.scopeConfirmed) actions.push({ id: 'confirm-packet-scope', label: 'Confirm packet scope', requiresApproval: false });
  if (!input.evidence.supporting.length) actions.push({ id: 'upload-supporting-documents', label: 'Upload supporting documents', requiresApproval: false });
  if (input.missingLetters.length > 0) actions.push({ id: 'open-template-upload', label: 'Review missing letter templates', requiresApproval: false });
  if (!input.packetReady) actions.push({ id: 'review-deterministic-blockers', label: 'Resolve deterministic blockers before generation', requiresApproval: false });
  return actions;
}

function summarize(findings: ReviewFinding[]) {
  const blockers = findings.filter((finding) => finding.severity === 'blocker').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  if (blockers > 0) return `${blockers} blocker(s) and ${warnings} warning(s) need review before generation.`;
  if (warnings > 0) return `${warnings} warning(s) detected. Source can proceed after review.`;
  return 'Deterministic source review is clear.';
}

export default function SourceReviewAiPanel(props: Props) {
  const [status, setStatus] = useState<ReviewClientState>('idle');
  const [result, setResult] = useState<ReviewPanelResult | null>(null);
  const findings = useMemo(() => buildFindings(props), [props]);
  const actions = useMemo(() => buildActions(props), [props]);

  function runReview() {
    setStatus('loading');
    const next: ReviewPanelResult = {
      summary: summarize(findings),
      findings,
      suggestedActions: actions,
      requestId: 'deterministic-source-review',
      modelName: 'deterministic',
      latencyMs: 0
    };
    setResult(next);
    setStatus(findings.some((finding) => finding.severity === 'blocker') ? 'error' : 'ready');
  }

  return (
    <AiInsightPanel
      title="Source Review"
      description="Explains source completeness, packet readiness, and generation blockers without changing deterministic generation rules."
      status={status}
      result={result}
      actionLabel="Run source review"
      onRun={runReview}
    />
  );
}
