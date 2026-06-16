'use client';

import { useMemo, useState } from 'react';
import AiInsightPanel from './AiInsightPanel';
import { runAiUiReview, type AiUiClientState } from '../lib/ai/ai-ui-client';
import type { AiUiFinding, AiUiResult, AiUiSuggestedAction } from '../lib/ai/ai-ui-result';
import type { LetterReference, Round } from '../lib/reference-store';
import type { ExhibitKind, TemplateExhibits } from '../lib/template-exhibits';
import type { CanonicalTemplateField, TemplateContract } from '../lib/template-contracts';
import type { JsonObject } from '../lib/ai/ai-types';

const GOVERNANCE_SLOTS = [
  'CLIENT_IDENTITY',
  'CLIENT_ADDRESS',
  'DOCUMENT_DATE',
  'BUREAU_ROUTING',
  'ACCOUNT_DETAILS',
  'AFFIDAVIT_JURISDICTION',
  'FTC_DETAILS',
  'STATIC_APPENDIX'
] as const;

const CANONICAL_TO_GOVERNANCE: Record<CanonicalTemplateField, typeof GOVERNANCE_SLOTS[number]> = {
  'client.name': 'CLIENT_IDENTITY',
  'client.address': 'CLIENT_ADDRESS',
  'client.dob': 'CLIENT_IDENTITY',
  'client.ssnMasked': 'CLIENT_IDENTITY',
  'client.email': 'CLIENT_IDENTITY',
  'client.phone': 'CLIENT_IDENTITY',
  'letter.date': 'DOCUMENT_DATE',
  'bureau.name': 'BUREAU_ROUTING',
  'bureau.address': 'BUREAU_ROUTING',
  'accounts.lines': 'ACCOUNT_DETAILS',
  'inquiries.lines': 'ACCOUNT_DETAILS',
  'affidavit.state': 'AFFIDAVIT_JURISDICTION',
  'affidavit.county': 'AFFIDAVIT_JURISDICTION',
  'ftc.reportNumber': 'FTC_DETAILS',
  'ftc.reportDate': 'FTC_DETAILS',
  'ftc.statement': 'FTC_DETAILS'
};

type Props = {
  round: Round;
  slots: LetterReference[];
  managedExhibits?: TemplateExhibits;
};

function contractFields(contract?: TemplateContract) {
  return new Set([...(contract?.validation.fulfilledFields || []), ...(contract?.requiredCanonicalFields || [])]);
}

function coveredSlots(contracts: Array<TemplateContract | undefined>) {
  const covered = new Set<string>();

  contracts.forEach((contract) => {
    contractFields(contract).forEach((field) => {
      covered.add(CANONICAL_TO_GOVERNANCE[field]);
    });
  });

  return covered;
}

function exhibitEntries(exhibits?: TemplateExhibits) {
  return Object.entries(exhibits || {}) as Array<[ExhibitKind, NonNullable<TemplateExhibits[ExhibitKind]> | null]>;
}

function buildFindings(round: Round, slots: LetterReference[], exhibits?: TemplateExhibits): AiUiFinding[] {
  const contracts = [...slots.map((slot) => slot.contract), ...exhibitEntries(exhibits).map(([, asset]) => asset?.contract)];
  const covered = coveredSlots(contracts);
  const findings: AiUiFinding[] = [];
  const configuredLetters = slots.filter((slot) => Boolean(slot.file));
  const missingLetters = slots.filter((slot) => !slot.file);
  const configuredExhibits = exhibitEntries(exhibits).filter(([, asset]) => Boolean(asset));

  if (missingLetters.length > 0) {
    findings.push({ severity: 'blocker', title: 'Letter template slots incomplete', detail: `${round} is missing ${missingLetters.map((slot) => slot.name).join(', ')}.` });
  }

  if (!configuredExhibits.some(([kind]) => kind === 'FCRA')) {
    findings.push({ severity: 'warning', title: 'Static legal exhibit not configured', detail: 'FCRA legal exhibit is not currently attached to this round.' });
  }

  if (!configuredExhibits.some(([kind]) => kind === 'ATTACHMENT')) {
    findings.push({ severity: 'warning', title: 'Attachment exhibit not configured', detail: 'Attachment exhibit is not currently attached to this round.' });
  }

  GOVERNANCE_SLOTS.forEach((slot) => {
    if (!covered.has(slot) && slot !== 'STATIC_APPENDIX') {
      findings.push({ severity: slot === 'ACCOUNT_DETAILS' || slot === 'BUREAU_ROUTING' ? 'blocker' : 'warning', title: `Governance slot needs review: ${slot}`, detail: 'No active template contract currently proves this slot is fulfilled.' });
    }
  });

  contracts.forEach((contract) => {
    if (contract?.validation.status === 'BLOCKED') {
      findings.push({ severity: 'blocker', title: `${contract.kind} template is blocked`, detail: contract.validation.errors[0] || 'Template contract validation reported a blocked status.' });
    }
    if (contract?.validation.warnings.length) {
      findings.push({ severity: 'warning', title: `${contract.kind} template warnings`, detail: contract.validation.warnings.slice(0, 2).join(' ') });
    }
  });

  if (!findings.length && configuredLetters.length) {
    findings.push({ severity: 'info', title: 'Template intelligence is clear', detail: 'Configured templates have no deterministic blockers. AI can still summarize slot coverage for review.' });
  }

  if (!configuredLetters.length) {
    findings.push({ severity: 'blocker', title: 'No letter templates configured', detail: 'Upload or assign at least one letter template before using this round for generation.' });
  }

  return findings;
}

function buildActions(findings: AiUiFinding[]): AiUiSuggestedAction[] {
  const actions: AiUiSuggestedAction[] = [];

  if (findings.some((finding) => finding.title.includes('Letter template slots incomplete') || finding.title.includes('No letter templates'))) {
    actions.push({ id: 'upload-letter-template', label: 'Upload or assign missing letter templates', requiresApproval: false });
  }

  if (findings.some((finding) => finding.title.includes('Governance slot needs review'))) {
    actions.push({ id: 'review-template-contract', label: 'Review template contract and placeholders', requiresApproval: false });
  }

  if (findings.some((finding) => finding.title.includes('exhibit not configured'))) {
    actions.push({ id: 'review-exhibit-setup', label: 'Review required packet exhibits', requiresApproval: false });
  }

  return actions;
}

function templateMetadata(slots: LetterReference[], exhibits?: TemplateExhibits): JsonObject {
  const letters = slots.map((slot) => ({
    id: slot.id,
    name: slot.name,
    type: slot.type,
    hasFile: Boolean(slot.file),
    file: slot.file || null,
    validationStatus: slot.contract?.validation.status || null,
    missingFields: slot.contract?.validation.missingFields || [],
    warnings: slot.contract?.validation.warnings || []
  }));
  const exhibitValues = exhibitEntries(exhibits).map(([kind, asset]) => ({
    kind,
    hasAsset: Boolean(asset),
    name: asset?.name || null,
    mode: asset?.mode || null,
    validationStatus: asset?.contract?.validation.status || null,
    missingFields: asset?.contract?.validation.missingFields || [],
    warnings: asset?.contract?.validation.warnings || []
  }));

  return { letters, exhibits: exhibitValues } as unknown as JsonObject;
}

export default function TemplateIntelligencePanel({ round, slots, managedExhibits }: Props) {
  const [status, setStatus] = useState<AiUiClientState>('idle');
  const [result, setResult] = useState<AiUiResult | null>(null);
  const findings = useMemo(() => buildFindings(round, slots, managedExhibits), [round, slots, managedExhibits]);
  const actions = useMemo(() => buildActions(findings), [findings]);

  async function runReview() {
    setStatus('loading');
    const next = await runAiUiReview({
      mode: 'template_intelligence',
      message: 'Analyze active template slot coverage and explain template readiness. Do not activate, archive, upload, or mutate templates.',
      metadata: {
        round,
        governanceSlots: [...GOVERNANCE_SLOTS],
        templateSummary: templateMetadata(slots, managedExhibits)
      },
      deterministicFindings: findings,
      deterministicActions: actions
    });
    setResult(next);
    setStatus(next.findings.some((finding) => finding.title === 'AI review unavailable') ? 'error' : 'ready');
  }

  return (
    <AiInsightPanel
      title="Template Intelligence"
      description="Explains slot coverage, missing template contracts, and packet-readiness risks without changing template authority or assets."
      status={status}
      result={result}
      actionLabel="Analyze templates with AI"
      onRun={runReview}
    />
  );
}
